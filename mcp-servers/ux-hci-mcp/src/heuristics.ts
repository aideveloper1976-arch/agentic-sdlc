import { Page } from 'playwright';
import { UsabilityResult, HeuristicResult, HeuristicIssue } from './types.js';

interface HeuristicCheck {
  name: string;
  check: (page: Page) => Promise<{ score: number; issues: HeuristicIssue[] }>;
}

const heuristics: HeuristicCheck[] = [
  {
    name: 'Visibility of System Status',
    check: async (page) => {
      const issues: HeuristicIssue[] = [];
      let score = 10;

      const hasLoading = await page.evaluate(() => {
        return document.querySelectorAll('[class*="loading"], [class*="spinner"], [role="progressbar"], [aria-busy="true"]').length > 0;
      });

      if (!hasLoading) {
        score -= 2;
        issues.push({
          heuristic: 'Visibility of System Status',
          severity: 'medium',
          description: 'No loading indicators or progress bars detected on the page.',
          recommendation: 'Add loading states and progress indicators for all async operations.',
          score: 8,
        });
      }

      const hasFeedback = await page.evaluate(() => {
        return document.querySelectorAll('[role="alert"], [role="status"], .toast, .notification, [class*="feedback"]').length > 0;
      });

      if (!hasFeedback) {
        score -= 2;
        issues.push({
          heuristic: 'Visibility of System Status',
          severity: 'medium',
          description: 'No system feedback mechanisms detected (toasts, alerts, status messages).',
          recommendation: 'Add toast notifications or status messages to confirm user actions.',
          score: 6,
        });
      }

      return { score, issues };
    },
  },
  {
    name: 'Match Between System and Real World',
    check: async (page) => {
      const issues: HeuristicIssue[] = [];
      let score = 10;

      const jargonTerms = await page.evaluate(() => {
        const body = document.body?.innerText || '';
        const terms = ['utilize', 'functionality', 'implement', 'commence', 'terminate', 'leveraging'];
        return terms.filter(t => body.toLowerCase().includes(t));
      });

      if (jargonTerms.length > 0) {
        score -= 2;
        issues.push({
          heuristic: 'Match Between System and Real World',
          severity: 'low',
          description: `Technical jargon detected in page content: ${jargonTerms.join(', ')}`,
          recommendation: 'Use plain, user-friendly language instead of technical jargon.',
          score: 8,
        });
      }

      return { score, issues };
    },
  },
  {
    name: 'User Control and Freedom',
    check: async (page) => {
      const issues: HeuristicIssue[] = [];
      let score = 10;

      const hasBack = await page.evaluate(() => {
        return document.querySelectorAll('[class*="back"], [class*="undo"], [class*="cancel"], [aria-label*="back" i], [aria-label*="undo" i], [aria-label*="cancel" i]').length > 0;
      });

      if (!hasBack) {
        score -= 3;
        issues.push({
          heuristic: 'User Control and Freedom',
          severity: 'high',
          description: 'No back, undo, or cancel controls detected on the page.',
          recommendation: 'Provide visible back buttons, undo options, and cancel controls for user actions.',
          score: 7,
        });
      }

      return { score, issues };
    },
  },
  {
    name: 'Consistency and Standards',
    check: async (page) => {
      const issues: HeuristicIssue[] = [];
      let score = 10;

      const linkData = await page.evaluate(() => {
        const links = document.querySelectorAll('a');
        const colors = new Set<string>();
        const underlineStates = new Set<string>();
        links.forEach(l => {
          const style = window.getComputedStyle(l);
          colors.add(style.color);
          underlineStates.add(style.textDecorationLine);
        });
        return { uniqueColors: colors.size, uniqueUnderlines: underlineStates.size, totalLinks: links.length };
      });

      if (linkData.uniqueColors > 2 && linkData.totalLinks > 3) {
        score -= 2;
        issues.push({
          heuristic: 'Consistency and Standards',
          severity: 'medium',
          description: `Inconsistent link styling detected (${linkData.uniqueColors} different colors used across ${linkData.totalLinks} links).`,
          recommendation: 'Use consistent styling for all links — same color, hover effects, and underline treatment.',
          score: 8,
        });
      }

      return { score, issues };
    },
  },
  {
    name: 'Error Prevention',
    check: async (page) => {
      const issues: HeuristicIssue[] = [];
      let score = 10;

      const formData = await page.evaluate(() => {
        const forms = document.querySelectorAll('form');
        let hasValidation = false;
        let hasConfirmation = false;
        forms.forEach(f => {
          const inputs = f.querySelectorAll('[required], [pattern], [minlength], [type="email"], [type="url"]');
          if (inputs.length > 0) hasValidation = true;
        });
        const confirmElements = document.querySelectorAll('[role="alertdialog"], .confirm, [class*="confirm"], [class*="dialog"]');
        if (confirmElements.length > 0) hasConfirmation = true;
        return { formCount: forms.length, hasValidation, hasConfirmation };
      });

      if (formData.formCount > 0 && !formData.hasValidation) {
        score -= 2;
        issues.push({
          heuristic: 'Error Prevention',
          severity: 'high',
          description: `Forms detected (${formData.formCount}) but no client-side validation (required, pattern, type constraints) found.`,
          recommendation: 'Add input validation with clear constraints (required, pattern, minlength) to prevent errors before submission.',
          score: 8,
        });
      }

      return { score, issues };
    },
  },
  {
    name: 'Recognition Rather Than Recall',
    check: async (page) => {
      const issues: HeuristicIssue[] = [];
      let score = 10;

      const navData = await page.evaluate(() => {
        const subMenus = document.querySelectorAll('nav li ul, nav li [role="menu"], .dropdown-menu, .sub-menu');
        const menuItems = document.querySelectorAll('nav a, nav button, [role="menuitem"]');
        return { subMenuCount: subMenus.length, menuItemCount: menuItems.length };
      });

      if (navData.subMenuCount > 2) {
        score -= 2;
        issues.push({
          heuristic: 'Recognition Rather Than Recall',
          severity: 'medium',
          description: `Deep navigation menus detected (${navData.subMenuCount} sub-menus, ${navData.menuItemCount} total items). Users must recall where items are hidden.`,
          recommendation: 'Keep navigation shallow (max 2 levels). Consider mega-menus, sitemaps, or simplifying information architecture.',
          score: 8,
        });
      }

      if (navData.menuItemCount > 10) {
        score -= 1;
        issues.push({
          heuristic: 'Recognition Rather Than Recall',
          severity: 'medium',
          description: `Navigation has ${navData.menuItemCount} items — exceeds recommended 5-7 items for user working memory.`,
          recommendation: 'Reduce navigation items to 5-7 primary options. Group secondary items under categories.',
          score: 9,
        });
      }

      return { score, issues };
    },
  },
  {
    name: 'Flexibility and Efficiency of Use',
    check: async (page) => {
      const issues: HeuristicIssue[] = [];
      let score = 10;

      const hasShortcuts = await page.evaluate(() => {
        return document.querySelectorAll('[accesskey], [aria-keyshortcuts]').length > 0;
      });

      if (!hasShortcuts) {
        score -= 1;
        issues.push({
          heuristic: 'Flexibility and Efficiency of Use',
          severity: 'low',
          description: 'No keyboard shortcuts or accelerators detected.',
          recommendation: 'Consider adding keyboard shortcuts for power users using accesskey or aria-keyshortcuts attributes.',
          score: 9,
        });
      }

      return { score, issues };
    },
  },
  {
    name: 'Aesthetic and Minimalist Design',
    check: async (page) => {
      const issues: HeuristicIssue[] = [];
      let score = 10;

      const overload = await page.evaluate(() => {
        const links = document.querySelectorAll('a, button').length;
        const inputs = document.querySelectorAll('input:not([type="hidden"]), select, textarea').length;
        const images = document.querySelectorAll('img').length;
        const hasCarousel = document.querySelectorAll('.carousel, .slider, [class*="carousel"], [class*="slider"]').length > 0;
        const hasModal = document.querySelectorAll('[role="dialog"], .modal, [class*="modal"]').length > 0;
        return { totalInteractive: links + inputs, images, hasCarousel, hasModal };
      });

      if (overload.totalInteractive > 50) {
        score -= 2;
        issues.push({
          heuristic: 'Aesthetic and Minimalist Design',
          severity: 'medium',
          description: `High number of interactive elements (${overload.totalInteractive}) on page — likely causes visual clutter and cognitive overload.`,
          recommendation: 'Reduce interactive elements. Aim for fewer than 50 actionable items per page. Prioritize key actions.',
          score: 8,
        });
      }

      if (overload.images > 20) {
        score -= 1;
        issues.push({
          heuristic: 'Aesthetic and Minimalist Design',
          severity: 'low',
          description: `${overload.images} images detected. Excessive imagery can slow load times and distract users.`,
          recommendation: 'Optimize images — use lazy loading, reduce count, or use CSS effects instead.',
          score: 9,
        });
      }

      if (overload.hasCarousel) {
        score -= 1;
        issues.push({
          heuristic: 'Aesthetic and Minimalist Design',
          severity: 'low',
          description: 'Carousel/slider detected. Research shows carousels have low engagement and hide content.',
          recommendation: 'Consider hero sections or grid layouts that show all content without requiring user interaction.',
          score: 9,
        });
      }

      return { score, issues };
    },
  },
  {
    name: 'Help Users Recognize, Diagnose, and Recover from Errors',
    check: async (page) => {
      const issues: HeuristicIssue[] = [];
      let score = 10;

      const errorData = await page.evaluate(() => {
        const errorElements = document.querySelectorAll('[role="alert"], .error, .error-message, [class*="error"]');
        const hasRequired = document.querySelectorAll('[required], [aria-required="true"]').length > 0;
        const helpBlocks = document.querySelectorAll('[role="alert"]');
        return { errorCount: errorElements.length, hasRequired, helpBlockCount: helpBlocks.length };
      });

      if (!errorData.hasRequired) {
        score -= 2;
        issues.push({
          heuristic: 'Help Users Recognize, Diagnose, and Recover from Errors',
          severity: 'high',
          description: 'No required field indicators (required, aria-required) found in forms.',
          recommendation: 'Use visual indicators (asterisks) and aria-required attributes on mandatory fields.',
          score: 8,
        });
      }

      if (errorData.errorCount === 0) {
        score -= 1;
        issues.push({
          heuristic: 'Help Users Recognize, Diagnose, and Recover from Errors',
          severity: 'low',
          description: 'No error message containers found. Users may not receive feedback on invalid input.',
          recommendation: 'Add inline error messages near fields and a summary error banner at the top of forms.',
          score: 9,
        });
      }

      return { score, issues };
    },
  },
  {
    name: 'Help and Documentation',
    check: async (page) => {
      const issues: HeuristicIssue[] = [];
      let score = 10;

      const hasHelp = await page.evaluate(() => {
        return document.querySelectorAll('[class*="help"], [class*="tooltip"], [aria-describedby], a[href*="help"], a[href*="support"], a[href*="faq"], a[href*="guide"], [class*="faq"]').length > 0;
      });

      if (!hasHelp) {
        score -= 2;
        issues.push({
          heuristic: 'Help and Documentation',
          severity: 'low',
          description: 'No help links, tooltips, or documentation references detected.',
          recommendation: 'Provide contextual help (tooltips), a help center link, FAQ section, or documentation links.',
          score: 8,
        });
      }

      return { score, issues };
    },
  },
];

export async function evaluateUsability(page: Page, url: string): Promise<UsabilityResult> {
  await page.goto(url, { waitUntil: 'networkidle' });

  const results: HeuristicResult[] = [];
  const allIssues: HeuristicIssue[] = [];

  for (const heuristic of heuristics) {
    const result = await heuristic.check(page);
    results.push({
      heuristic: heuristic.name,
      score: result.score,
      maxScore: 10,
      issues: result.issues,
    });
    allIssues.push(...result.issues);
  }

  const overallScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length * 10);

  return {
    url,
    overallScore,
    heuristics: results,
    issues: allIssues,
  };
}
