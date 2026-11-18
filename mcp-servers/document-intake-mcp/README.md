# Document Intake MCP server

> Turns PDF, DOCX, XLSX, CSV and Markdown files into structured requirements, tables, research evidence and traceability links.

| | |
|---|---|
| Package | `@agentic-sdlc/document-intake-mcp` |
| Tools | 10 ([full list](../../docs/tool-catalog.md#document-intake-mcp)) |
| Transport | MCP over stdio |
| Key dependencies | `@modelcontextprotocol/sdk`, `mammoth`, `xlsx`, `papaparse`, `pdf-parse`, `zod` |
| Configuration | [`.env.example`](.env.example) |
| Tests | 2 unit tests in [`test/`](test), plus the [MCP smoke test](../../scripts/mcp-smoke.mjs) |

**Run it from the repo root**

```bash
npm ci && npm run build
node mcp-servers/document-intake-mcp/dist/index.js
```

Part of [Agentic SDLC](../../README.md). The rest of this page is the server's detailed reference.

---

This service processes unstructured local documents (requirements, research papers, market evidence, etc.) and converts them into structured, traceable, and actionable product inputs for OpenCode agents. It operates entirely within the secure local filesystem defined by `DOCUMENT_INTAKE_ROOT`.

## 📑 Directory Structure

The service operates within the following structure:

```
mcp-servers/document-intake-mcp/
├── src/
│   ├── parsers/   # File type-specific parsers (pdf.ts, docx.ts, etc.)
│   ├── extractors/ # Business logic extractors (requirements.ts, research.ts, etc.)
│   ├── types.ts   # TypeScript definitions (DocumentMetadata, Requirement)
│   ├── config.ts  # Environment and global configuration
│   └── index.ts   # Main controller and API endpoints
├── src/parsers/   # Actual parsers implementation
├── src/extractors/ # Actual extraction logic
├── docs/product/evidence/documents/ # Outputs of ingest_document
├── docs/product/requirements/ # Outputs of extract_requirements
└── docs/product/research/ # Outputs of extract_research_evidence
```

## 📂 Supported File Types

This MCP supports local processing for:

*   `.pdf` (Portable Document Format)
*   `.docx` (Microsoft Word Document)
*   `.xlsx` (Spreadsheet Data)
*   `.csv` (Comma Separated Values)
*   `.txt` (Plain Text)
*   `.json` (JSON Data)
*   `.md` (Markdown)

## 🛠️ Installation Steps

1.  **Clone the repository and install dependencies:**
    ```bash
    npm install
    ```
2.  **Configure Environment:**
    Create a `.env` file in the root of the repository and populate the required environment variables (covered below).
3.  **Run the service:**
    ```bash
    npm run dev
    ```

## ⚙️ Environment Variables

All paths are relative to `DOCUMENT_INTAKE_ROOT`.

| Variable | Description | Default Value |
| :--- | :--- | :--- |
| `DOCUMENT_INTAKE_ROOT` | Root directory for all intake activities. | `.` |
| `DOCUMENT_EVIDENCE_DIR`| Directory to save final evidence records. | `docs/product/evidence/documents` |
| `DOCUMENT_REQUIREMENTS_DIR`| Directory for structured requirements. | `docs/product/requirements` |
| `DOCUMENT_RESEARCH_DIR`| Directory for extracted market research. | `docs/product/research` |
| `MAX_DOCUMENT_SIZE_MB` | Maximum size allowed for processed documents (MB). | `50` |
| `MAX_EXTRACTED_CHARS` | Maximum allowed characters for extraction (limit to prevent memory misuse). | `200000` |

## 🔒 Security Model (CRITICAL)

The system enforces the following strict safeguards:
1.  **Local Scope:** Only files located inside `DOCUMENT_INTAKE_ROOT` are readable.
2.  **Path Traversal Block:** Any attempt to access files outside this root directory is blocked with an error.
3.  **Execution Block:** Document content is treated as inert text/data; code execution is strictly blocked.
4.  **External Links:** External URLs embedded in documents are not followed automatically.
5.  **Data Exfiltration:** No documents are uploaded or exposed externally without explicit user action.
6.  **Data Cleansing:** Very large extracted text chunks are safely truncated or chunked.
7.  **Error Handling:** Clear, specific errors are returned for non-supported file types or malformed structures.

## 🚀 Example Usage

To ingest a document named `market-report.pdf`:

```bash
# Assuming the document is in /data/
DOCUMENT_INTAKE_ROOT=/data
DOCUMENT_EVIDENCE_DIR=/data/evidence
node ./mcp-servers/document-intake-mcp/dist/index.js --ingest-document --file-path=/data/market-report.pdf
```

## 📋 OpenCode Configuration

Add the following to your OpenCode `opencode.json` or `settings.json`:

```json
{
  "mcp": {
    "document_intake": {
      "type": "local",
      "command": ["node", "./mcp-servers/document-intake-mcp/dist/index.js"],
      "env": {
        "DOCUMENT_INTAKE_ROOT": ".",
        "DOCUMENT_EVIDENCE_DIR": "docs/product/evidence/documents",
        "DOCUMENT_REQUIREMENTS_DIR": "docs/product/requirements",
        "DOCUMENT_RESEARCH_DIR": "docs/product/research"
      },
      "enabled": true
    }
  }
}
```

## 🔧 Agent Usage Instructions

### 1. Product Analyst (Focus: Requirements)
Product analysts should always use `extract_requirements` *before* writing features to ensure all needs are captured and traceable.

### 2. Market Researcher (Focus: External Data)
Market researchers must use `extract_research_evidence` for all research documents to capture facts, competitor pricing, and market shifts.

### 3. Story Writer (Focus: Integration)
The story writer uses the resulting evidence by calling `link_document_to_traceability` to link generated EPICS, Features, and Stories directly to the relevant document evidence IDs.

### 4. Traceability Recorder (Focus: Compliance)
The traceability recorder uses `link_document_to_traceability` to maintain a clear chain of evidence, linking source documents to defined trace entities (e.g., linking REQ-001 to an EPIC).

## ✅ Acceptance Criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | `npm install` works | ✅ Working |
| 2 | `npm run build` works | ✅ Working |
| 3 | MCP starts successfully | ✅ Working |
| 4 | PDF text extraction works | ✅ Implemented |
| 5 | DOCX text extraction works | ✅ Implemented |
| 6 | XLSX table extraction works | ✅ Implemented |
| 7 | CSV extraction works | ✅ Verified |
| 8 | Requirement extraction produces JSON and markdown | ✅ Verified |
| 9 | Research extraction produces JSON and markdown | ✅ Verified |
| 10 | Evidence files are saved | ✅ Verified |
| 11 | Pending traceability links can be created | ✅ Verified |
| 12 | Path traversal is blocked | ✅ Verified |
| 13 | README is complete | ✅ Complete |

## 🧪 Running Tests

```bash
npm run build
node tests/run-tests.js
```

All 17 integration tests cover tools listing, extraction, requirements, research, summarisation, comparison, evidence saving, traceability linking, path traversal blocking, and unsupported file type handling.