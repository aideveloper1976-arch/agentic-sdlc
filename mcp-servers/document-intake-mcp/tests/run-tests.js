const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const DIST_JS = path.resolve(__dirname, '..', 'dist', 'index.js');
const TEST_INPUT = path.resolve(__dirname, '..', 'test-input');
const TEST_OUTPUT = path.resolve(__dirname, '..', 'test-output');

let passed = 0;
let failed = 0;
let total = 0;

function cleanup() {
  try { fs.rmSync(TEST_OUTPUT, { recursive: true, force: true }); } catch {}
  try { fs.unlinkSync(path.join(TEST_INPUT, 'test.xyz')); } catch {}
}

// Use a single server for all tests
class McpClient {
  constructor() {
    this.server = null;
    this.buffer = '';
    this.pending = [];
    this.requestId = 0;
  }

  start() {
    return new Promise((resolve) => {
      this.server = spawn('node', [DIST_JS], {
        env: {
          ...process.env,
          DOCUMENT_INTAKE_ROOT: TEST_INPUT,
          DOCUMENT_EVIDENCE_DIR: path.join(TEST_OUTPUT, 'evidence'),
          DOCUMENT_REQUIREMENTS_DIR: path.join(TEST_OUTPUT, 'requirements'),
          DOCUMENT_RESEARCH_DIR: path.join(TEST_OUTPUT, 'research'),
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.server.stdout.on('data', (data) => {
        this.buffer += data.toString();
        this._processBuffer();
      });

      this.server.stderr.on('data', () => {});

      this.server.on('exit', () => {
        this.server = null;
      });

      // Wait for "running on stdio" on stderr
      this.server.stderr.on('data', (d) => {
        if (d.toString().includes('running on stdio')) {
          setTimeout(resolve, 200);
        }
      });

      // Safety timeout
      setTimeout(resolve, 3000);
    });
  }

  _processBuffer() {
    let idx;
    while ((idx = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.substring(0, idx).trim();
      this.buffer = this.buffer.substring(idx + 1);
      if (!line) continue;
      try {
        const parsed = JSON.parse(line);
        const pending = this.pending.shift();
        if (pending) pending.resolve(parsed);
      } catch {}
    }
  }

  async call(method, params = {}) {
    const id = ++this.requestId;
    return new Promise((resolve, reject) => {
      this.pending.push({ resolve, reject });
      const request = JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params,
      });
      this.server.stdin.write(request + '\n');

      setTimeout(() => {
        const idx = this.pending.findIndex(p => p.resolve === resolve);
        if (idx !== -1) {
          this.pending.splice(idx, 1);
          reject(new Error('Timeout'));
        }
      }, 15000);
    });
  }

  async listTools() {
    return this.call('tools/list');
  }

  async callTool(name, args) {
    return this.call('tools/call', { name, arguments: args });
  }

  stop() {
    if (this.server) {
      this.server.kill();
      this.server = null;
    }
  }
}

async function main() {
  cleanup();
  fs.mkdirSync(TEST_OUTPUT, { recursive: true });

  console.log('');
  console.log('==============================');
  console.log(' Document Intake MCP Tests');
  console.log('==============================');
  console.log('');

  const client = new McpClient();
  await client.start();

  async function runTest(name, tool, args) {
    total++;
    try {
      const response = await client.callTool(tool, args);
      let content = response;
      if (response.result?.content?.[0]?.text) {
        try {
          content = JSON.parse(response.result.content[0].text);
        } catch {}
      }
      if (content.success === true) {
        console.log(`  ✓ ${name}`);
        passed++;
      } else {
        console.log(`  ✗ ${name}`);
        console.log(`    Success: false, error: ${content.error || 'unknown'}`);
        failed++;
      }
    } catch (err) {
      console.log(`  ✗ ${name} - ${err.message}`);
      failed++;
    }
  }

  async function runErrorTest(name, tool, args, expectedSubstring) {
    total++;
    try {
      const response = await client.callTool(tool, args);
      const allText = JSON.stringify(response).toLowerCase();
      if (allText.includes(expectedSubstring.toLowerCase())) {
        console.log(`  ✓ ${name}`);
        passed++;
      } else {
        console.log(`  ✗ ${name}`);
        console.log(`    Expected to contain: ${expectedSubstring}`);
        console.log(`    Got: ${JSON.stringify(response).substring(0, 300)}`);
        failed++;
      }
    } catch (err) {
      console.log(`  ✗ ${name} - ${err.message}`);
      failed++;
    }
  }

  // Test 1: List tools
  total++;
  try {
    const toolsResp = await client.listTools();
    const tools = toolsResp.result?.tools || [];
    const names = tools.map(t => t.name).sort();
    const expected = [
      'compare_documents', 'extract_requirements', 'extract_research_evidence',
      'extract_tables', 'extract_text', 'ingest_document',
      'link_document_to_traceability', 'list_ingested_documents',
      'save_document_evidence', 'summarise_document',
    ];
    if (JSON.stringify(names) === JSON.stringify(expected)) {
      console.log('  ✓ list_tools returns all 10 tools');
      passed++;
    } else {
      console.log('  ✗ list_tools mismatch');
      console.log(`    Got: ${names.join(', ')}`);
      failed++;
    }
  } catch (err) {
    console.log(`  ✗ list_tools: ${err.message}`);
    failed++;
  }

  // Tests 2-16: Tool calls
  await runTest('TXT text extraction', 'extract_text', { filePath: 'requirements.txt' });
  await runTest('JSON text extraction', 'extract_text', { filePath: 'project.json' });
  await runTest('CSV text extraction', 'extract_text', { filePath: 'team.csv' });
  await runTest('MD text extraction', 'extract_text', { filePath: 'research.md' });
  await runTest('Requirements extraction (JSON)', 'extract_requirements', { filePath: 'requirements.txt', outputFormat: 'json' });
  await runTest('Requirements extraction (Markdown)', 'extract_requirements', { filePath: 'requirements.txt', outputFormat: 'markdown' });
  await runTest('Research evidence extraction', 'extract_research_evidence', { filePath: 'research.md' });
  await runTest('Document summarisation', 'summarise_document', { filePath: 'requirements.txt', summaryType: 'executive' });
  await runTest('Save document evidence', 'save_document_evidence', { documentId: 'TEST-001', title: 'Test', summary: 'Summary', sourceFilePath: 'requirements.txt', tags: ['test'] });
  await runTest('Create traceability link', 'link_document_to_traceability', { documentId: 'TEST-001', traceEntityId: 'EPIC-001', linkType: 'derived_from' });
  await runTest('List ingested documents', 'list_ingested_documents', {});
  await runTest('Compare documents', 'compare_documents', { filePaths: ['requirements.txt', 'research.md'], comparisonGoal: 'Find overlaps' });
  await runTest('Ingest document', 'ingest_document', { filePath: 'requirements.txt', documentType: 'requirements', tags: ['test'] });

  // Test: Path traversal blocked
  await runErrorTest('Path traversal blocked', 'extract_text', { filePath: '../../../etc/passwd' }, 'Path traversal');

  // Test: Unsupported file type
  fs.writeFileSync(path.join(TEST_INPUT, 'test.xyz'), 'test');
  await runErrorTest('Unsupported file type', 'extract_text', { filePath: 'test.xyz' }, 'Unsupported');

  // Test: Output files created
  total++;
  const hasEvidence = fs.existsSync(path.join(TEST_OUTPUT, 'evidence'));
  const hasReqs = fs.existsSync(path.join(TEST_OUTPUT, 'requirements'));
  const hasResearch = fs.existsSync(path.join(TEST_OUTPUT, 'research'));
  if (hasEvidence && hasReqs && hasResearch) {
    console.log('  ✓ Output directories created');
    passed++;
  } else {
    console.log('  ✗ No output directories');
    failed++;
  }

  client.stop();

  console.log('');
  console.log('==============================');
  console.log(` Results: ${passed}/${total} passed, ${failed} failed`);
  console.log('==============================');

  cleanup();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
