# Web Downloader MCP

MCP server for downloading web content — HTML pages, documents, images, JSON, and binary files — with safety controls.

## Safety

- **Domain allowlist**: Restrict downloads to specific domains (default: any)
- **File extension blocking**: Executables and scripts blocked by default
- **Size limits**: Maximum file size enforced (default: 50MB)
- **Timeouts**: All downloads timeout (default: 30s)
- **Read-only**: No uploads, no system modification

## Install

```bash
cd web-downloader-mcp
npm install
npm run build
```

## Configuration

Copy `.env.example` to `.env`:

```env
ALLOWED_DOMAINS=*
MAX_FILE_SIZE=52428800
DOWNLOAD_TIMEOUT_MS=30000
DOWNLOAD_DIR=downloads
BLOCKED_EXTENSIONS=.exe,.dll,.so,.dylib,.bat,.cmd,.ps1,.sh,.app,.msi,.jar,.class
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `download_web_content` | Download any URL content to local filesystem |
| `fetch_web_page_info` | HTTP HEAD inspect — status, type, size (no download) |
| `fetch_and_extract_html` | Download HTML + extract title, text, links, images, meta |
| `get_downloader_info` | Show current configuration |

## OpenCode Configuration

```json
{
  "mcpServers": {
    "web-downloader": {
      "command": "node",
      "args": ["./web-downloader-mcp/dist/index.js"],
      "env": {
        "ALLOWED_DOMAINS": "*",
        "MAX_FILE_SIZE": "52428800"
      }
    }
  }
}
```

## Architecture

```
src/
  index.ts       — MCP server entry point (4 tools)
  config.ts      — Domain allowlist, size limits, timeout, blocked extensions
  downloader.ts  — Core download engine with HTML extraction
  types.ts       — Shared type definitions
```
