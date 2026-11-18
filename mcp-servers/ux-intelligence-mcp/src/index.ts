#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { ProductType, Style, Palette, TypographyPairing, Guideline, AntiPattern, StackGuidelines } from "./types.js";
import { DesignSystemEngine } from "./engine/design-system.js";
import { checkContrast } from "./engine/accessibility.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.UX_DATA_DIR || join(__dirname, "data");

function loadJSON<T>(filename: string): T {
  const path = join(DATA_DIR, filename);
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

const products = loadJSON<ProductType[]>("products.json");
const styles = loadJSON<Style[]>("styles.json");
const palettes = loadJSON<Palette[]>("palettes.json");
const typography = loadJSON<TypographyPairing[]>("typography.json");
const guidelines = loadJSON<Guideline[]>("guidelines.json");
const antiPatterns = loadJSON<AntiPattern[]>("anti-patterns.json");
const stackGuidelines = loadJSON<StackGuidelines[]>("stack-guidelines.json");

const engine = new DesignSystemEngine(products, styles, palettes, typography, guidelines, antiPatterns, stackGuidelines);

const server = new Server(
  { name: "opencode-ux-intelligence-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

const formatJson = (data: unknown) => [{ type: "text" as const, text: JSON.stringify(data, null, 2) }];
const formatText = (text: string) => [{ type: "text" as const, text }];

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "ux_generate_design_system",
      description: "Generate a complete design system for a product type. Returns pattern, style, colors, typography, effects, anti-patterns, and a pre-delivery checklist.",
      inputSchema: {
        type: "object",
        properties: {
          productType: { type: "string", description: "Product type (e.g., 'fintech banking', 'beauty spa', 'saas platform')" },
          platform: { type: "string", description: "Platform context (optional)", enum: ["web", "mobile", "tablet", "desktop"] },
          mood: { type: "string", description: "Design mood (optional, e.g., 'professional', 'calm', 'vibrant')" },
          pageType: { type: "string", description: "Page type (optional)", enum: ["landing", "dashboard", "general"] },
        },
        required: ["productType"],
      },
    },
    {
      name: "ux_search_guidelines",
      description: "Search UX guidelines by keyword, priority, or category. Returns ranked results with checks and anti-patterns.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query (e.g., 'contrast', 'touch targets', 'loading')" },
          priority: { type: "string", description: "Filter by priority (optional)", enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"] },
          category: { type: "string", description: "Filter by category (optional)", enum: ["accessibility", "touch-interaction", "performance", "style-selection", "layout-responsive", "typography-color", "animation", "forms-feedback", "navigation", "charts-data"] },
          limit: { type: "number", description: "Max results (default 10, max 30)" },
        },
        required: ["query"],
      },
    },
    {
      name: "ux_get_palette",
      description: "Get a color palette for a specific industry and mood. Returns hex codes with usage roles.",
      inputSchema: {
        type: "object",
        properties: {
          industry: { type: "string", description: "Industry (e.g., 'fintech', 'healthcare', 'saas', 'ecommerce')" },
          mood: { type: "string", description: "Color mood (optional, e.g., 'professional', 'calm', 'vibrant', 'luxury')" },
        },
        required: ["industry"],
      },
    },
    {
      name: "ux_get_typography",
      description: "Get typography pairing recommendations based on mood or industry. Returns font names, scale, and Google Fonts import URL.",
      inputSchema: {
        type: "object",
        properties: {
          mood: { type: "string", description: "Typography mood (e.g., 'modern', 'elegant', 'friendly', 'technical')" },
          industry: { type: "string", description: "Industry context (optional)" },
        },
        required: ["mood"],
      },
    },
    {
      name: "ux_get_style",
      description: "Get the best-matching design style for a product type. Returns style name, description, effects, and anti-patterns.",
      inputSchema: {
        type: "object",
        properties: {
          productType: { type: "string", description: "Product type (e.g., 'fintech', 'portfolio', 'dashboard')" },
        },
        required: ["productType"],
      },
    },
    {
      name: "ux_check_accessibility",
      description: "Check WCAG contrast ratio between two hex colors. Returns ratio, AA/AAA pass/fail, and recommendations.",
      inputSchema: {
        type: "object",
        properties: {
          foreground: { type: "string", description: "Foreground hex color (e.g., '#1E293B')" },
          background: { type: "string", description: "Background hex color (e.g., '#FFFFFF')" },
          fontSize: { type: "number", description: "Font size in px (optional, affects AA threshold for large text)" },
        },
        required: ["foreground", "background"],
      },
    },
    {
      name: "ux_get_anti_patterns",
      description: "Get anti-patterns to avoid for a specific industry or design style.",
      inputSchema: {
        type: "object",
        properties: {
          industry: { type: "string", description: "Industry (optional, e.g., 'fintech', 'healthcare', 'ecommerce')" },
          style: { type: "string", description: "Design style ID (optional, e.g., 'dark-mode-oled', 'glassmorphism')" },
        },
      },
    },
    {
      name: "ux_get_stack_guidelines",
      description: "Get framework-specific implementation guidelines for UI components. Supports 15 stacks: react, next, vue, nuxt, svelte, astro, html-tailwind, shadcn-ui, angular, laravel, swiftui, jetpack-compose, react-native, flutter.",
      inputSchema: {
        type: "object",
        properties: {
          stack: { type: "string", description: "Framework/stack name", enum: ["react", "next", "vue", "nuxt", "svelte", "astro", "html-tailwind", "shadcn-ui", "angular", "laravel", "swiftui", "jetpack-compose", "react-native", "flutter"] },
          component: { type: "string", description: "Optional: specific component to get guidance for (button, modal, form, card, navbar, table)" },
        },
        required: ["stack"],
      },
    },
    {
      name: "ux_list_product_types",
      description: "List all supported product types. Optionally filter by category or search by name.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query (optional)" },
          category: { type: "string", description: "Filter by category (optional)", enum: ["Tech & SaaS", "Finance", "Healthcare", "E-commerce", "Services", "Creative", "Lifestyle", "Emerging Tech"] },
        },
      },
    },
    {
      name: "ux_list_styles",
      description: "List all available design styles with descriptions. Optionally filter by category.",
      inputSchema: {
        type: "object",
        properties: {
          category: { type: "string", description: "Filter by category (optional)", enum: ["general", "landing", "dashboard"] },
        },
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "ux_generate_design_system": {
        const schema = z.object({
          productType: z.string().min(1),
          platform: z.string().optional(),
          mood: z.string().optional(),
          pageType: z.enum(["landing", "dashboard", "general"]).optional(),
        });
        const { productType, platform, mood, pageType } = schema.parse(args);
        const result = engine.generate(productType, platform, mood, pageType);
        return { content: formatJson(result) };
      }

      case "ux_search_guidelines": {
        const schema = z.object({
          query: z.string().min(1),
          priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
          category: z.enum(["accessibility", "touch-interaction", "performance", "style-selection", "layout-responsive", "typography-color", "animation", "forms-feedback", "navigation", "charts-data"]).optional(),
          limit: z.number().min(1).max(30).optional().default(10),
        });
        const { query, priority, category, limit } = schema.parse(args);
        const result = engine.searchGuidelines(query, priority, category, limit);
        return { content: formatJson(result) };
      }

      case "ux_get_palette": {
        const schema = z.object({
          industry: z.string().min(1),
          mood: z.string().optional(),
        });
        const { industry, mood } = schema.parse(args);
        const result = engine.getPalette(industry, mood);
        if (!result) return { content: formatText(`No palette found for industry "${industry}". Try a different industry name.`) };
        return { content: formatJson(result) };
      }

      case "ux_get_typography": {
        const schema = z.object({
          mood: z.string().min(1),
          industry: z.string().optional(),
        });
        const { mood, industry } = schema.parse(args);
        const result = engine.getTypography(mood, industry);
        if (!result) return { content: formatText(`No typography pairing found for mood "${mood}". Try 'modern', 'elegant', 'friendly', or 'professional'.`) };
        return { content: formatJson(result) };
      }

      case "ux_get_style": {
        const schema = z.object({
          productType: z.string().min(1),
        });
        const { productType } = schema.parse(args);
        const result = engine.getStyle(productType);
        if (!result) return { content: formatText(`No style found for "${productType}". Use ux_list_styles to see all available styles.`) };
        return { content: formatJson(result) };
      }

      case "ux_check_accessibility": {
        const schema = z.object({
          foreground: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a hex color like #1E293B"),
          background: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a hex color like #FFFFFF"),
          fontSize: z.number().optional(),
        });
        const { foreground, background, fontSize } = schema.parse(args);
        const result = checkContrast(foreground, background, fontSize);
        return { content: formatJson(result) };
      }

      case "ux_get_anti_patterns": {
        const schema = z.object({
          industry: z.string().optional(),
          style: z.string().optional(),
        });
        const { industry, style } = schema.parse(args);
        const result = engine.getAntiPatterns(industry, style);
        if (result.length === 0) return { content: formatText("No anti-patterns found for the given filters.") };
        return { content: formatJson(result) };
      }

      case "ux_get_stack_guidelines": {
        const schema = z.object({
          stack: z.string().min(1),
          component: z.string().optional(),
        });
        const { stack, component } = schema.parse(args);
        const result = engine.getStackGuidelines(stack);
        if (!result) return { content: formatText(`No guidelines found for stack "${stack}". Supported stacks: react, next, vue, nuxt, svelte, astro, html-tailwind, shadcn-ui, angular, laravel, swiftui, jetpack-compose, react-native, flutter.`) };
        if (component && result.components[component]) {
          return { content: formatJson({ stack: result.stack, component, guidance: result.components[component] }) };
        }
        return { content: formatJson(result) };
      }

      case "ux_list_product_types": {
        const schema = z.object({
          query: z.string().optional(),
          category: z.string().optional(),
        });
        const { query, category } = schema.parse(args);
        const result = engine.listProductTypes(query, category);
        const summary = result.map((p) => ({ id: p.id, name: p.name, category: p.category }));
        return { content: formatJson(summary) };
      }

      case "ux_list_styles": {
        const schema = z.object({
          category: z.enum(["general", "landing", "dashboard"]).optional(),
        });
        const { category } = schema.parse(args);
        const result = engine.listStyles(category);
        const summary = result.map((s) => ({ id: s.id, name: s.name, bestFor: s.bestFor, category: s.category }));
        return { content: formatJson(summary) };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    const message = err instanceof z.ZodError ? err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ") : (err as Error).message;
    return { content: formatText(`Error: ${message}`), isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err.message}\n`);
  process.exit(1);
});
