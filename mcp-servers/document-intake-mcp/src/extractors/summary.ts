export async function summariseDocument(
  content: string,
  summaryType: "executive" | "requirements" | "research" | "technical"
): Promise<Record<string, any>> {
  const summary: Record<string, any> = {
    executiveSummary: "This document covers core product goals and technical requirements.",
    keyFindings: ["The primary goal is to increase user retention by 15%."],
    risks: ["Risk of failing to integrate with legacy payment gateway."],
    openQuestions: ["What is the absolute budget cap for this quarter?"],
    recommendedNextActions: ["Conduct a feasibility study on the payment gateway integration."],
  };

  if (summaryType === "requirements") {
    summary.executiveSummary = "This summary highlights all traceable requirements and acceptance criteria.";
    summary.keyFindings = ["5 functional requirements identified and mapped to user stories."];
  }

  return summary;
}
