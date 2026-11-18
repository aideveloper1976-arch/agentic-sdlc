## Task: Commit Using Latest Tracking File

### Input
Working tree with updated docs/code

### Steps
1. Identify latest `docs/dev_practice/tracking/*_tracking.md`.
2. Read tracking changes and extract delivery summary.
3. Append normalized entry to `docs/dev_practice/tracking/CHANGELOG.md`.
4. Run git status/diff/log checks for safe commit context.
5. Stage related files, including changelog.
6. Commit with tracking-based message.
7. Return commit hash and entry summary.

---

## Task: Commit Using Specific Tracking Date

### Input
`YYYYMMDD`

### Steps
1. Locate `docs/dev_practice/tracking/YYYYMMDD_tracking.md`.
2. Extract key sections and IDs (epic/story/test commands).
3. Add a dated entry into `CHANGELOG.md` referencing source file.
4. Stage relevant scope files only.
5. Commit with date-specific message.

---

## Task: Changelog Reconciliation Before Commit

### Input
Current branch changes

### Steps
1. Compare tracking file entries against existing changelog entries.
2. Detect missing or duplicate changelog coverage.
3. Add only missing entries to `CHANGELOG.md`.
4. Stage reconciled docs and related files.
5. Create final commit and return verification status.
