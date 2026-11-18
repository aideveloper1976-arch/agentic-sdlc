import { ProductType, Style, Palette, TypographyPairing, Guideline, AntiPattern, DesignSystem, StackGuidelines, PaletteColor } from "../types.js";
import { searchBM25, findBestMatch, filterByField } from "./search.js";

const LANDING_PATTERNS = ["hero-centric", "conversion-optimized", "feature-rich-showcase", "minimal-direct", "social-proof-focused", "interactive-product-demo", "trust-authority", "storytelling-driven"];

export class DesignSystemEngine {
  constructor(
    private products: ProductType[],
    private styles: Style[],
    private palettes: Palette[],
    private typography: TypographyPairing[],
    private guidelines: Guideline[],
    private antiPatterns: AntiPattern[],
    private stackGuidelines: StackGuidelines[]
  ) {}

  generate(productType: string, platform?: string, mood?: string, pageType?: string): DesignSystem {
    const product = findBestMatch(this.products, productType, ["name", "category", "description"]);
    const productName = product?.name || "Unknown";

    const styleRecommendations = product?.styles || [];
    const style = styleRecommendations.length > 0
      ? this.styles.find((s) => s.id === styleRecommendations[0]) || this.styles[0]
      : this.styles[0];

    const paletteMood = mood || product?.paletteMood || "clean";
    const palette = this.palettes.find((p) => p.mood === paletteMood) || this.palettes[0];

    const typographyMood = product?.typographyMood || "modern";
    const typography = this.typography.find((t) => t.mood === typographyMood) || this.typography[0];

    const industryAntiPatterns = product?.antiPatterns || [];
    const relevantAntiPatterns = this.antiPatterns.filter(
      (ap) => industryAntiPatterns.includes(ap.id) || industryAntiPatterns.some((ia: string) => ap.id === ia)
    );

    const checklist = this.buildChecklist(product, pageType);

    const pattern = pageType === "landing" ? this.pickLandingPattern(productName) : style.name;

    return {
      productType: productName,
      pattern,
      style,
      colors: palette.colors,
      typography,
      effects: style.effects,
      antiPatterns: relevantAntiPatterns,
      checklist,
    };
  }

  private buildChecklist(product: ProductType | undefined, pageType?: string): string[] {
    const checks: string[] = [
      "No emojis as icons (use SVG: Heroicons/Lucide)",
      "cursor-pointer on all clickable elements",
      "Hover states with smooth transitions (150-300ms)",
      "Light mode: text contrast 4.5:1 minimum",
      "Focus states visible for keyboard nav",
      "prefers-reduced-motion respected",
      "Responsive: 375px, 768px, 1024px, 1440px",
    ];

    if (pageType === "landing") {
      checks.unshift("Hero section loads fast (LCP < 2.5s)");
      checks.unshift("Primary CTA above the fold");
    }
    if (pageType === "dashboard") {
      checks.unshift("KPIs visible above the fold");
      checks.unshift("Data updates show loading states");
    }

    return checks;
  }

  private pickLandingPattern(productName: string): string {
    const pattern = findBestMatch(
      this.styles.filter((s) => s.category === "landing"),
      productName,
      ["name", "bestFor"]
    );
    return pattern?.name || "Hero-Centric Design";
  }

  searchGuidelines(query: string, priority?: string, category?: string, limit: number = 10): Guideline[] {
    let filtered = this.guidelines;
    if (priority) {
      filtered = filtered.filter((g) => g.priority === priority.toUpperCase());
    }
    if (category) {
      filtered = filterByField(filtered, "category", category);
    }
    const results = searchBM25(filtered, query, [
      { field: "title", value: "title", weight: 3 },
      { field: "description", value: "description", weight: 2 },
      { field: "checks", value: "checks", weight: 1 },
      { field: "antiPatterns", value: "antiPatterns", weight: 1 },
    ], "", limit);
    return results.map((r) => r.item as Guideline);
  }

  getPalette(industry: string, mood?: string): Palette | undefined {
    if (mood) {
      const byMood = this.palettes.find((p) => p.mood === mood && p.industry.toLowerCase().includes(industry.toLowerCase()));
      if (byMood) return byMood;
    }
    const industryPalette = findBestMatch(this.palettes, industry, ["industry", "mood", "name"]);
    return industryPalette;
  }

  getTypography(mood: string, industry?: string): TypographyPairing | undefined {
    const byMood = this.typography.find((t) => t.mood === mood);
    if (byMood) return byMood;
    return findBestMatch(this.typography, mood, ["mood", "category", "bestFor"]);
  }

  getStyle(productType: string): Style | undefined {
    const product = findBestMatch(this.products, productType, ["name", "category", "description"]);
    if (product && product.styles.length > 0) {
      return this.styles.find((s) => s.id === product.styles[0]);
    }
    return findBestMatch(this.styles, productType, ["name", "bestFor", "description"]);
  }

  getAntiPatterns(industry?: string, style?: string): AntiPattern[] {
    let results = this.antiPatterns;
    if (industry) {
      results = results.filter((ap) => ap.industry === industry);
    }
    if (style) {
      results = results.filter((ap) => ap.style === style);
    }
    return results;
  }

  getStackGuidelines(stack: string): StackGuidelines | undefined {
    return this.stackGuidelines.find((sg) => sg.stack.toLowerCase() === stack.toLowerCase());
  }

  listProductTypes(query?: string, category?: string): ProductType[] {
    let results = this.products;
    if (category) {
      results = filterByField(results, "category", category);
    }
    if (query) {
      const searchResults = searchBM25(results, query, [
        { field: "name", value: "name", weight: 3 },
        { field: "category", value: "category", weight: 2 },
        { field: "description", value: "description", weight: 1 },
      ], "", 20);
      return searchResults.map((r) => r.item as ProductType);
    }
    return results;
  }

  listStyles(category?: string): Style[] {
    if (category) {
      return this.styles.filter((s) => s.category === category);
    }
    return this.styles;
  }

  getLandingPatterns(): Style[] {
    return this.styles.filter((s) => s.category === "landing");
  }

  getDashboardStyles(): Style[] {
    return this.styles.filter((s) => s.category === "dashboard");
  }
}
