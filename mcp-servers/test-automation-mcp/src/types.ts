export interface TestStep {
  action: 'goto' | 'click' | 'type' | 'wait' | 'assert_text' | 'assert_visible'
    | 'hover' | 'drag' | 'select_option' | 'press_key' | 'fill_form' | 'double_click' | 'evaluate';
  selector?: string;
  value?: string;
  targetSelector?: string;
  evaluateExpression?: string;
  timeoutMs?: number;
}

export interface StepResult {
  action: string;
  selector?: string;
  value?: string;
  passed: boolean;
  error?: string;
  screenshotPath?: string;
  durationMs: number;
}

export interface TestOutput {
  success: boolean;
  testName: string;
  result: 'passed' | 'failed' | 'error';
  steps: StepResult[];
  screenshots: string[];
  logs: string[];
  durationMs: number;
  error?: string;
}

export interface UIElement {
  tag: string;
  text: string;
  selector: string;
  attributes: Record<string, string>;
  hasLabel: boolean;
  type?: string;
}

export interface UIAnalysis {
  url: string;
  buttons: UIElement[];
  forms: UIElement[];
  navigation: UIElement[];
  inputs: UIElement[];
  missingLabels: UIElement[];
  inconsistencies: string[];
  timestamp: string;
}

export interface AccessibilityViolation {
  id: string;
  impact: string;
  description: string;
  help: string;
  helpUrl: string;
  tags: string[];
  nodes: number;
}

export interface AccessibilityResult {
  url: string;
  violations: AccessibilityViolation[];
  passes: number;
  incomplete: number;
  inapplicable: number;
  timestamp: string;
}

export interface EvidenceEntry {
  entityId: string;
  testName: string;
  result: string;
  evidencePaths: string[];
  summary: string;
  timestamp: string;
  durationMs: number;
}

export interface VisualRegressionResult {
  url: string;
  baselinePath: string;
  currentPath: string;
  diffPath: string;
  diffPixels: number;
  totalPixels: number;
  diffPercent: number;
  passed: boolean;
  threshold: number;
}

export interface FlowResult {
  flowName: string;
  url: string;
  success: boolean;
  steps: StepResult[];
  screenshots: string[];
  logs: string[];
  durationMs: number;
  evidencePath?: string;
}

export interface TestReport {
  testName: string;
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  results: TestOutput[];
  reportPath: string;
}

export interface AppConfig {
  baseUrl: string;
  allowedDomains: string[];
  defaultTimeout: number;
  navigationMaxDepth: number;
  headless: boolean;
  headedAllowed: boolean;
  videoEnabled: boolean;
  traceEnabled: boolean;
  slowMoMs: number;
  screenshotDir: string;
  evidenceDir: string;
  uxDir: string;
  visualDir: string;
  uatEvidenceDir: string;
  domSnapshotDir: string;
}
