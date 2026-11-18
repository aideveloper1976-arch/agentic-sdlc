---
name: langgraph-ai-developer
description: "Implement production-grade AI agents, multi-agent teams, and workflows using LangGraph with type safety, state management, orchestration patterns, testing, and LLM best practices."
---

# LangGraph AI Developer

## Goal
Build correct, maintainable AI agent workflows using LangGraph — including single-agent chains and multi-agent teams with supervisor orchestration, agent handoff, shared state, and parallel execution.

## When to Use
- Implementing new AI agents, workflows, or agentic features.
- Building multi-step reasoning chains, tool-using agents, or stateful conversations.
- **Building multi-agent teams with supervisor/sub-agent topology** — one agent routes work to specialized sub-agents.
- **Implementing agent handoff protocols** — Agent A passes control to Agent B via tool calls.
- **Parallel agent execution** — dispatching work to multiple agents simultaneously.
- **Human-in-the-loop workflows** — agents pause and wait for human approval.
- Integrating LLMs with application logic, tools, and data sources.
- Refactoring or optimizing existing LangGraph workflows.

## Required Inputs
- Story or task scope with acceptance criteria.
- Relevant design, agent architecture, and tool specifications.
- LLM provider configuration and model selection constraints.
- Existing codebase patterns and repository structure.

## Workflow
1. Read existing agent code, prompts, and state schemas before editing.
2. Determine topology: single-agent chain, supervisor + sub-agents, or parallel team.
3. Design the state graph structure: nodes, edges, conditional routing, and state schema.
4. For multi-agent systems, design the handoff protocol and shared state boundaries.
5. Implement nodes as focused, testable functions with clear input/output contracts.
6. Define tools with strong typing, validation, and error handling.
7. Write system prompts and user prompts with clear instructions, examples, and constraints.
8. Implement state reducers and channel logic for multi-turn conversations.
9. Add structured output parsing with fallback strategies.
10. Integrate with LLM providers (OpenAI, Anthropic, etc.) with proper error handling and retries.
11. Test agent behavior with representative inputs, edge cases, and failure scenarios.
12. For multi-agent systems, test handoff correctness, state isolation, and coordination.
13. Evaluate output quality, cost, latency, and error rates.
14. For production agents, add observability: logging, tracing, and monitoring hooks.
15. Validate with: type checks, unit tests, integration tests, and LLM evaluation metrics.
16. Save implementation evidence in Confluence (`PROD`) and link to Jira.
17. Add phase checkpoint in `docs/product/traceability/checkpoints`.
18. Summarize changed files, evaluation results, and follow-up risks.

## Multi-Agent Patterns

### Pattern 1: Supervisor / Sub-Agent

A supervisor agent receives a task, decides which sub-agent to route it to, and aggregates results.

```python
from langgraph.graph import StateGraph, MessagesState
from langgraph.types import Command
from typing import Literal

members = ["researcher", "analyst", "writer"]
options = members + ["FINISH"]

class AgentState(MessagesState):
    next: str

def supervisor_node(state: AgentState) -> Command[Literal["researcher", "analyst", "writer", "__end__"]]:
    messages = [
        {"role": "system", "content": f"You are a supervisor. Route to: {options}. Analyze the user's request and pick the right agent."},
    ] + state["messages"]
    response = llm.invoke(messages)
    goto = response.content.strip()
    if goto == "FINISH":
        return Command(goto="__end__", update={"next": "FINISH"})
    return Command(goto=goto, update={"next": goto})
```

**Key rules:**
- Supervisor uses `Command(goto=agent_name)` to route
- Each sub-agent returns control to supervisor via `Command(goto="supervisor")`
- Supervisor decides when to `FINISH`
- Sub-agents should NOT know about each other — only the supervisor has the full picture

### Pattern 2: Tool-Based Agent Handoff

Agents transfer control by calling a tool. The tool's implementation routes to the target node.

```python
@tool
def transfer_to_analyst(question: str) -> str:
    """Transfer the conversation to the analyst agent for deep data analysis."""
    # The tool call triggers a routing edge in the graph
    return f"TRANSFER_TO:analyst"

# In the graph:
def router(state: AgentState) -> str:
    last_message = state["messages"][-1]
    if isinstance(last_message, AIMessage) and last_message.tool_calls:
        for tc in last_message.tool_calls:
            if tc["name"].startswith("transfer_to_"):
                return tc["name"].replace("transfer_to_", "")
    return "continue"
```

**Key rules:**
- Each agent has a `transfer_to_X` tool for every other agent it can hand off to
- Router node inspects the last message for transfer tool calls
- Handoff tools include context (question, key findings) so the receiving agent can continue seamlessly
- Never leave agents in a loop — always provide a path back to supervisor or FINISH

### Pattern 3: Parallel Agent Execution

Fan out work to multiple agents simultaneously using LangGraph's `send()` API.

```python
from langgraph.graph import send

def continue_to_analysts(state: OverallState):
    return [send("analyst", {"section": s}) for s in state["sections"]]

# Graph:
builder = StateGraph(OverallState)
builder.add_node("analyst", analyst_node)
builder.add_conditional_edges("planner", continue_to_analysts)
builder.add_node("aggregator", aggregator_node)
```

**Key rules:**
- `send()` creates one instance of the target node per item
- Each instance gets its own isolated context
- All instances complete before the aggregator runs
- Use `add_conditional_edges` to fan out

### Pattern 4: Shared State vs Private State

Design state boundaries carefully in multi-agent systems:

| State Type | When to Use | Example |
|-----------|-------------|---------|
| **Shared state** | All agents need to read/write (task, conversation history) | `MessagesState`, `task_description` |
| **Per-agent private state** | Agent-specific internal reasoning | `research_notes`, `draft_analysis` |
| **Final output** | Only the aggregator or supervisor writes | `final_report`, `recommendation` |

```python
class MultiAgentState(TypedDict):
    # Shared across all agents
    messages: Annotated[list, add_messages]
    task: str
    # Per-agent (only written by specific agents)
    research_results: str     # Written by researcher
    analysis: str             # Written by analyst
    draft: str                # Written by writer
    # Final output
    final_output: str         # Written by supervisor
```

### Pattern 5: Human-in-the-Loop

Pause execution for human approval before critical actions.

```python
from langgraph.checkpoint import MemorySaver

def critical_node(state: AgentState):
    result = llm.invoke([...])
    return Command(
        update={"messages": [result]},
        interrupt="before"  # Pause before returning control
    )

# Execution:
checkpointer = MemorySaver()
app = builder.compile(checkpointer=checkpointer)
# Resume with user approval:
app.invoke(None, config, interrupt=True)
```

**Key rules:**
- Use `interrupt` at decision points: approvals, destructive actions, financial transactions
- Show the user a clear summary of what they are approving
- Store the interrupt reason so the agent can explain context when resumed

## Multi-Agent Anti-Patterns

| Anti-Pattern | Why It Fails | Instead |
|-------------|-------------|---------|
| **Agents calling each other directly** | Creates tightly coupled loops, hard to debug | Always route through supervisor or handoff tools |
| **All agents sharing one system prompt** | Loss of specialization, context confusion | Each agent has its own focused system prompt |
| **Ignoring handoff context** | Receiving agent has no idea why it was called | Include question + key findings in the handoff tool |
| **No FINISH condition** | Agents loop forever | Always have a terminal state with clear exit criteria |
| **Over-sharing state** | Agents read each other's private notes | Use per-agent state keys for internal reasoning |
| **Single point of failure in supervisor** | If supervisor fails, whole system stops | Add timeout + retry for supervisor, fallback routing |

## Multi-Agent Evaluation

Standard agent eval + coordination-specific checks:

- [ ] **Handoff correctness** — Does agent A call the right handoff tool with the right context?
- [ ] **State isolation** — Does agent B's private state leak into agent C?
- [ ] **Supervisor routing accuracy** — Does the supervisor pick the right sub-agent for the task?
- [ ] **Parallel consistency** — Do parallel instances complete without race conditions?
- [ ] **Context retention** — Does the receiving agent understand why it was called?
- [ ] **Graceful degradation** — What happens when one sub-agent fails?
- [ ] **Termination** — Does every path through the graph reach FINISH?
- [ ] **Token budget per agent** — Each agent stays within its token allocation

## Required Output
## Implementation Summary
## Agent Architecture (include topology diagram: supervisor, sub-agents, state flow)
## Handoff Protocol Design (for multi-agent systems)
## State Schema (shared vs private)
## Files Changed
## Prompt Engineering Changes
## Tool Definitions
## State Schema Changes
## Validation & Evaluation Run
## Jira Link
## Confluence Evidence Link
## Risks / Follow-ups

## Rules
- Prefer deterministic logic over LLM calls when possible (cost and reliability).
- Keep prompts versioned, testable, and separate from code when practical.
- Use structured outputs (JSON mode, function calling) over free-text parsing.
- Implement proper token management, rate limiting, and cost tracking.
- Add retries with exponential backoff for LLM provider errors.
- Log all LLM interactions for debugging and evaluation.
- Test with realistic data and adversarial inputs.
- Document prompt strategies, model assumptions, and known limitations.
- Use typed state schemas (Pydantic for Python, Zod/TypeScript for JS).
- Avoid speculative agent complexity; start simple and iterate based on eval results.
- **For multi-agent systems, implement supervisor routing BEFORE sub-agent logic** — get the topology working end-to-end with stub sub-agents before filling in details.
- **Each agent gets its own system prompt** — never share prompts across agents even if they do similar work.
- **Handoff tools must carry context** — the receiving agent needs to know what question it's answering and what the previous agent found.
- Do not mark implementation complete if type checks, tests, or evaluation metrics are failing.
- Include cost analysis and latency benchmarks for production agents.
- For conversational agents, test multi-turn context retention and graceful degradation.
- For multi-agent systems, include coordination overhead in latency benchmarks.
- Do not close implementation phase without Jira and Confluence evidence links.
