---
name: receiving-code-review
description: "Use when receiving feedback from a code review. Guides how to process, respond to, and act on review comments."
---

# Receiving Code Review

When someone reviews your code, the goal is to improve the codebase — not to defend your implementation. Approach every comment with curiosity, not defensiveness.

## How to Process Review Feedback

### 1. Read Everything First

Read all comments before responding. A comment that seems unreasonable in isolation might make sense in context of other feedback.

### 2. Classify Each Comment

| Category | Meaning | Response |
|----------|---------|----------|
| **Correctness bug** | Code is wrong | Fix immediately |
| **Design improvement** | Better way to structure | Discuss and implement if agreed |
| **Style preference** | Formatting or naming | Follow project conventions |
| **Question** | Reviewer does not understand | Clarify the code or add comments |
| **Suggestion** | Optional improvement | Consider and decide |

### 3. Respond to Each Comment

- **If you agree** — acknowledge and describe how you will fix it
- **If you disagree** — explain your reasoning calmly. Reference requirements, tests, or trade-offs
- **If you do not understand** — ask for clarification
- **If it is a suggestion you are declining** — thank them and explain your reasoning

### 4. Apply Changes

Make the agreed-upon changes. For each fix:
1. Write a test if the review identified a missing edge case
2. Apply the fix
3. Re-run tests
4. Commit

### 5. Follow Up

Respond to each comment thread with the resolution:
- "Fixed in commit SHA"
- "Discussed offline — decided to defer"
- "Added test coverage for this case"

## Key Principles

- **The code is not you** — feedback on code is not a personal critique
- **Assume good intent** — the reviewer is trying to help
- **Say thank you** — reviewing code takes time and effort
- **When in doubt, err on the side of the reviewer** — they have fresh eyes and broader context
- **Escalate constructively** — if you strongly disagree, explain the trade-offs and let the reviewer decide

## Red Flags

| Thought | Reality |
|---------|---------|
| "They did not understand my code" | The code was not clear enough |
| "This is just style preference" | Even style preferences matter for consistency |
| "I will push back on this" | Only if you have strong evidence |
| "It works, what more do they want" | Working code is the minimum bar |
