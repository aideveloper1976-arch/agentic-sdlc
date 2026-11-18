export interface ProductType {
  id: string;
  name: string;
  category: string;
  description: string;
  styles: string[];
  paletteMood: string;
  typographyMood: string;
  antiPatterns: string[];
}

export interface Style {
  id: string;
  name: string;
  description: string;
  bestFor: string;
  category: "general" | "landing" | "dashboard";
  effects: string[];
  antiPatterns: string[];
}

export interface Palette {
  id: string;
  name: string;
  industry: string;
  mood: string;
  colors: PaletteColor[];
  notes: string;
}

export interface PaletteColor {
  role: "primary" | "secondary" | "cta" | "background" | "text" | "accent" | "success" | "error" | "info";
  hex: string;
  usage: string;
}

export interface TypographyPairing {
  id: string;
  name: string;
  headings: string;
  body: string;
  category: string;
  mood: string;
  scale: number[];
  importUrl: string;
  bestFor: string[];
}

export interface Guideline {
  id: string;
  title: string;
  description: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  category: string;
  checks: string[];
  antiPatterns: string[];
}

export interface AntiPattern {
  id: string;
  pattern: string;
  why: string;
  instead: string;
  industry?: string;
  style?: string;
}

export interface StackGuidelines {
  stack: string;
  description: string;
  setup: string[];
  components: Record<string, string>;
  patterns: string[];
  accessibility: string[];
}

export interface DesignSystem {
  productType: string;
  pattern: string;
  style: Style;
  colors: PaletteColor[];
  typography: TypographyPairing;
  effects: string[];
  antiPatterns: AntiPattern[];
  checklist: string[];
  stackNotes?: string[];
}

export interface SearchResult {
  item: any;
  score: number;
  field: string;
}
