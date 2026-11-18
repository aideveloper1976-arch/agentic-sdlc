export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type AnalysisType =
  | 'ui_structure'
  | 'usability'
  | 'user_flow'
  | 'ux_issues'
  | 'accessibility'
  | 'user_journey'
  | 'form_analysis'
  | 'ux_report'
  | 'evidence';

export interface UIElement {
  tag: string;
  text?: string;
  attributes: Record<string, string>;
  selector: string;
  hasLabel?: boolean;
  isVisible?: boolean;
}

export interface UIIssue {
  type: 'missing_label' | 'inconsistent_structure' | 'deeply_nested' | 'empty_heading' | 'missing_alt' | 'duplicate_id';
  severity: Severity;
  description: string;
  recommendation: string;
  selector?: string;
}

export interface UIAnalysisResult {
  url: string;
  headings: UIElement[];
  buttons: UIElement[];
  forms: UIElement[];
  inputs: UIElement[];
  navigation: UIElement[];
  issues: UIIssue[];
  structure: UIElement[];
}

export interface HeuristicIssue {
  heuristic: string;
  severity: Severity;
  description: string;
  recommendation: string;
  elements?: string[];
  score: number;
}

export interface HeuristicResult {
  heuristic: string;
  score: number;
  maxScore: number;
  issues: HeuristicIssue[];
}

export interface UsabilityResult {
  url: string;
  overallScore: number;
  heuristics: HeuristicResult[];
  issues: HeuristicIssue[];
}

export interface FlowStep {
  stepNumber: number;
  action: string;
  selector?: string;
  url?: string;
  isDecisionPoint: boolean;
  friction?: string;
}

export interface UserFlowResult {
  url: string;
  flowName: string;
  totalSteps: number;
  decisionPoints: number;
  estimatedClicks: number;
  cognitiveLoad: 'low' | 'medium' | 'high';
  steps: FlowStep[];
  frictionAreas: string[];
}

export interface UXIssue {
  type: string;
  severity: Severity;
  description: string;
  recommendation: string;
  elements?: string[];
  category: 'navigation' | 'cta' | 'feedback' | 'layout' | 'content' | 'interaction';
  pattern?: string;
}

export interface UXIssuesResult {
  url: string;
  issues: UXIssue[];
  patternSummary?: string[];
}

export interface A11yViolation {
  id: string;
  impact: Severity;
  description: string;
  help: string;
  helpUrl: string;
  tags: string[];
  elements: string[];
}

export interface A11yResult {
  url: string;
  violations: A11yViolation[];
  passes: number;
  incomplete: number;
  inapplicable: number;
  score: number;
}

export interface JourneyStep {
  stepNumber: number;
  action: string;
  url: string;
  screenshot?: string;
  errors?: string[];
  duration: number;
}

export interface JourneyResult {
  url: string;
  steps: JourneyStep[];
  totalDuration: number;
  success: boolean;
  errors: string[];
  screenshotPaths: string[];
}

export interface FormField {
  selector: string;
  type: string;
  name?: string;
  label?: string;
  required: boolean;
  validation?: string;
  hasError: boolean;
  placeholder?: string;
}

export interface FormAnalysisResult {
  url: string;
  forms: Array<{
    selector: string;
    action?: string;
    method?: string;
    fields: FormField[];
    issues: UIIssue[];
  }>;
}

export interface UXReport {
  featureId: string;
  generatedAt: string;
  url?: string;
  uiStructure?: UIAnalysisResult;
  usability?: UsabilityResult;
  userFlow?: UserFlowResult;
  uxIssues?: UXIssuesResult;
  accessibility?: A11yResult;
  formAnalysis?: FormAnalysisResult;
  summary: {
    totalIssues: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    overallScore: number;
  };
  reportPath: string;
}

export interface EvidenceData {
  entityId: string;
  analysisType: AnalysisType;
  findings: unknown;
  severitySummary: Record<Severity, number>;
  reportPath: string;
  evidencePath: string;
  timestamp: string;
}
