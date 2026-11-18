---
name: document-intake
description: Extract requirements, evidence, and structured findings from local documents.
---

# Document Intake

## Goal
Convert uploaded or local documents into structured requirements, research evidence, and traceable product inputs.

## When to Use
- When requirements or evidence arrive as PDF, DOCX, XLSX, CSV, TXT, Markdown, or JSON.
- When you need to preserve source-backed findings from large documents.
- When backlog or design work depends on document-derived evidence.

## Required Inputs
- File path to the source document.
- Intended use of the extraction: requirements, research, comparison, or summary.
- Any known scope boundaries or priority sections.

## Workflow
1. Ingest the document.
2. Extract text and tables.
3. Extract candidate requirements and research evidence as relevant.
4. Preserve source location such as page, section, sheet, or row.
5. Save extracted evidence and link it into traceability where appropriate.

## Requirement Classification
- functional
- non-functional
- business_rule
- compliance
- assumption
- dependency
- risk
- open_question

## Rules
- Do not convert vague text into firm requirements unless marked as inferred.
- Preserve original wording where useful.
- Flag contradictions, ambiguities, and missing acceptance criteria.
- Prefer traceable extraction over polished paraphrasing.
