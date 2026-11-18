## Task: Review Single Page UX

### Input
Page or route under review

### Steps
1. Inspect page structure and primary calls to action.
2. Evaluate clarity, hierarchy, and navigation.
3. Check authentication state behavior on the page (signed-in vs signed-out).
4. Check authorization behavior for role-limited actions and hidden/disabled UI.
5. Check accessibility basics and error recovery.
6. Return findings with severity and evidence.

---

## Task: Review User Flow

### Input
Target flow such as onboarding, checkout, or setup

### Steps
1. Walk the critical steps in the flow.
2. Validate authentication transitions during the flow (login requirement, expiry, re-entry).
3. Validate authorization transitions (role-specific steps, denied actions, fallback guidance).
4. Identify friction and decision points.
5. Check error handling and recovery.
6. Return blockers, confusing moments, and recommended fixes.

---

## Task: Audit Form UX

### Input
Form page or flow

### Steps
1. Check labels, required fields, and validation cues.
2. Check error messaging and recovery behavior.
3. Validate authenticated form behavior (session expiry handling, re-auth prompts).
4. Validate authorization behavior (who can submit, edit, approve, or view).
5. Review accessibility basics for inputs and controls.
6. Return evidence-backed findings.
