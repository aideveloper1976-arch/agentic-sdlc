---
name: accessibility-testing
description: Run WCAG 2.1 AA accessibility and contrast checks on code changes
keywords: [accessibility, wcag, contrast, a11y, testing, compliance]
---

# Accessibility Testing

Run automated WCAG 2.1 AA accessibility checks on the codebase to prevent contrast and color-related bugs.

## Quick Start

```bash
/test-accessibility                # Scan entire codebase
/test-accessibility --changed       # Scan only changed files (before PR)
/audit-accessibility               # Full WCAG audit report
/audit-accessibility --dark-mode   # Test dark mode specifically
```

---

## Commands

### `/test-accessibility` — Contrast Validation

**Purpose:** Quickly detect color/contrast violations and missing backgrounds on buttons.

**Options:**
- `--changed` — Check only git-staged files (fast, use before submitting PR)
- `--fix` — Show suggested fixes for each issue
- (no option) — Scan entire codebase

**Output:**
- ❌ **BLOCKING ERRORS:** Buttons without backgrounds, missing contrast
- ⚠️ **WARNINGS:** Hardcoded colors, unverified combinations
- ✅ **PASS:** All checks passed

**Examples:**

```bash
# Full codebase scan
/test-accessibility

# Only files you changed (before submitting PR)
/test-accessibility --changed

# Show fixes for each issue
/test-accessibility --fix

# Changed files with fixes
/test-accessibility --changed --fix
```

**What It Checks:**
- ✅ Buttons have background colors (not border-only)
- ✅ Semantic tokens used (no hardcoded neutral-*, bg-white, etc.)
- ✅ Text + background color combinations valid
- ✅ WCAG 2.1 AA contrast ratios (≥ 4.5:1)

**Exit Codes:**
- `0` — PASS (no errors, warnings OK)
- `1` — FAIL (errors found, must fix)

---

### `/audit-accessibility` — Full WCAG Report

**Purpose:** Comprehensive accessibility audit of entire codebase with detailed report.

**Options:**
- `--html` — Generate HTML report file (accessibility-audit.html)
- `--dark-mode` — Test specifically for dark mode contrast
- `--light-mode` — Test light mode only
- (no option) — Console report

**Examples:**

```bash
# Console audit report
/audit-accessibility

# Generate HTML report
/audit-accessibility --html

# Dark mode specific audit
/audit-accessibility --dark-mode
```

**Output:**
- Color contrast verification
- Semantic token usage analysis
- Safe vs unsafe combinations
- Unverified patterns (need manual review)

---

## Integration in SDLC

### Phase 13 — Code Review Gate

**Requirement:** Run before approving pull request.

```bash
/test-accessibility --changed
```

**Checklist:**
- [ ] Run `/test-accessibility --changed` — must PASS
- [ ] All buttons have backgrounds (no border-only)
- [ ] Semantic tokens used (no hardcoded colors)
- [ ] Contrast ratios ≥ 4.5:1 (WCAG AA)
- [ ] Dark mode verified (both light/dark themes)

**Decision:**
- ✅ **APPROVE** if: All checks pass
- ❌ **RETURN TO IMPLEMENTATION** if: Errors found

---

### Phase 12 — UX/HCI Review

**Requirement:** Validate accessibility before visual sign-off.

```bash
/audit-accessibility --dark-mode
```

**Checklist:**
- [ ] Run `/audit-accessibility --dark-mode`
- [ ] Test all button variants:
  - [ ] Light mode
  - [ ] Dark mode
  - [ ] Hover state
  - [ ] Disabled state
  - [ ] Focus state (keyboard Tab)
- [ ] No WCAG errors reported
- [ ] Accessibility sign-off: ☐ WCAG 2.1 AA PASSED

**Decision:**
- ✅ **APPROVE** if: All checks pass + manual verification complete
- ❌ **RETURN TO IMPLEMENTATION** if: Issues found

---

## Common Issues & Fixes

### ❌ Button without background

**Problem:** Text is hard to read on inherited background.

```tsx
// BAD
<a href="#" className="border border-border text-text-secondary">
  Click me
</a>
```

**Issue:** No background color defined → inherits white/light page background → gray text on light background = poor contrast

**Fix:**

```tsx
// GOOD
<a href="#" className="bg-surface-subtle border border-border text-text-primary hover:bg-surface-raised">
  Click me
</a>
```

**Why it works:** `bg-surface-subtle` (#E5E5E5) + `text-text-primary` (#191919) = 11:1 contrast ratio ✅

---

### ❌ Hardcoded colors (not semantic tokens)

**Problem:** Not using design system, harder to maintain, possible contrast issues.

```tsx
// BAD
<button className="bg-white text-neutral-900">
  Button
</button>
```

**Issue:** Hardcoded white/neutral colors → not using semantic tokens → won't adapt to dark mode

**Fix:**

```tsx
// GOOD
<button className="bg-surface text-text-primary hover:opacity-90">
  Button
</button>
```

**Why it works:** Semantic tokens automatically handle light/dark mode via CSS variables

---

### ❌ Low contrast combination

**Problem:** Text is too similar in color to background.

```tsx
// BAD
<button className="bg-canvas text-text-secondary">
  Button
</button>
```

**Contrast:** Only ~4.2:1 (below WCAG AA minimum 4.5:1)

**Fix:**

```tsx
// GOOD
<button className="bg-surface-subtle text-text-primary hover:bg-surface-raised">
  Button
</button>
```

**Contrast:** 11:1 ✅ (AAA level)

---

### ❌ Hardcoded neutral colors

**Problem:** Using old hardcoded neutral-* classes instead of semantic tokens.

```tsx
// BAD
<div className="bg-neutral-100 text-neutral-900">
  Content
</div>
```

**Issue:** Won't work with new semantic token system

**Fix:**

```tsx
// GOOD
<div className="bg-surface text-text-primary">
  Content
</div>
```

---

## Button Variants Reference

### Primary Button
```tsx
<button className="bg-primary text-primary-fg hover:opacity-90">
  Primary Action
</button>
```
- Contrast: 7.2:1 ✅ AAA
- Use: Main call-to-action

### Secondary Button
```tsx
<button className="bg-surface-subtle border border-border text-text-primary hover:bg-surface-raised">
  Secondary Action
</button>
```
- Contrast: 11:1 ✅ AAA
- Use: Alternative actions

### Disabled Button
```tsx
<button disabled className="bg-surface-subtle text-text-tertiary opacity-50">
  Disabled
</button>
```
- Contrast: 5.2:1 ✅ AA
- Opacity: 50% to show disabled state
- Use: Unavailable actions

---

## Safe Token Combinations

**Always use these (pre-tested for WCAG AA):**

```
✅ bg-primary + text-primary-fg              (7.2:1 AAA)
✅ bg-surface-subtle + text-text-primary    (11:1 AAA)
✅ bg-surface + text-text-primary           (8.5:1 AAA)
✅ bg-canvas + text-text-primary            (18:1 AAA)
✅ bg-surface-subtle + text-text-secondary  (7.2:1 AA)
```

**Never use these (will fail):**

```
❌ border-only + text-text-secondary        (No background)
❌ bg-white + text-white                    (1:1 - invisible)
❌ bg-canvas + text-text-secondary          (4.2:1 - below AA)
```

---

## Dark Mode Testing

**CSS variables automatically swap on dark mode:**

```typescript
// Light mode (default)
:root {
  --bg-primary: #0F766E;
  --text-primary-fg: #FFFFFF;
}

// Dark mode (auto-applied)
.dark {
  --bg-primary: #06B6D4;      // Lighter teal for visibility
  --text-primary-fg: #000000; // Black text on lighter background
}
```

**Test both:**

1. Open page normally (light mode)
2. Use browser DevTools to toggle `.dark` class
3. Verify contrast ratios ≥ 4.5:1 in both modes

---

## Running Checks Before Submitting PR

```bash
# 1. Make your changes
# 2. Stage your files (git add)
# 3. Run accessibility check on changes
/test-accessibility --changed

# 4. Fix any errors found
# 5. Run again to verify
/test-accessibility --changed

# 6. If all pass, submit PR
```

---

## Troubleshooting

**Q: "Missing background on text button" error**

A: Add a background color to the button:
```tsx
// BAD: <a className="border text-text-secondary">Click</a>
// GOOD: <a className="bg-surface-subtle border text-text-primary">Click</a>
```

**Q: "Hardcoded neutral colors" warning**

A: Replace with semantic tokens:
```tsx
// BAD: className="bg-neutral-100 text-neutral-900"
// GOOD: className="bg-surface text-text-primary"
```

**Q: Contrast ratio failing in dark mode**

A: Test both light and dark modes:
```bash
/audit-accessibility --dark-mode
/audit-accessibility --light-mode
```

**Q: How do I know which tokens are safe?**

A: Check the reference above, or run:
```bash
/test-accessibility --fix
```

---

## Resources

- **Semantic Token Reference:** `docs/product/standards/11-accessibility.md`
- **Button Design Guide:** `docs/product/components/ButtonGuidance.md`
- **WCAG 2.1 Spec:** [W3C Contrast Requirements](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- **Manual Testing:** [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

---

## Quick Checklist for Developers

Before submitting PR:

```
☐ Ran /test-accessibility --changed (must PASS)
☐ All buttons have backgrounds (no border-only)
☐ Used semantic tokens (no bg-white, text-neutral-*, etc.)
☐ Tested in light mode
☐ Tested in dark mode
☐ Checked hover/disabled/focus states
```

---

**Last Updated:** 2026-08-07  
**Status:** Active  
**Owner:** Accessibility Team
