// Agent Tools — capabilities the AI assistant can invoke during a conversation.
// Each tool has an Ollama-compatible schema and an executor that runs in the
// Electron main process. Tools give the assistant access to app data (glossary,
// FAQ, tax tables) and live data (exchange rates) without bloating the system
// prompt with static content.

import type { Tool, ToolCall } from 'ollama';
import { glossaryTerms } from '../src/data/glossary';
import { appFaqSections } from '../src/data/appFaqs';
import { US_FEDERAL_TAX_RULES_2026, US_FICA_RULES_2026 } from '../src/data/usTaxData';

// ── Tool schemas ──────────────────────────────────────────────────────────────
// Sent with every chat request so the model knows what tools are available.

export const AGENT_TOOLS: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'look_up_term',
      description:
        'Look up the definition of a financial or app-specific term used in Paycheck Planner ' +
        '(e.g. "net pay", "amortization", "residual amount", "pre-tax deduction"). ' +
        'Use this whenever the user asks what a term means, or when including a definition ' +
        'would make the answer clearer.',
      parameters: {
        type: 'object',
        required: ['term'],
        properties: {
          term: {
            type: 'string',
            description: 'The term or phrase to look up.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_app_faq',
      description:
        'Search the Paycheck Planner app FAQ to answer questions about how the app works: ' +
        'finding features, navigating screens, changing settings, or completing a task ' +
        '(e.g. "how do I update my salary?", "what is the starting buffer?", ' +
        '"how do I open a plan?"). Use this for any how-to or feature question.',
      parameters: {
        type: 'object',
        required: ['query'],
        properties: {
          query: {
            type: 'string',
            description: 'A natural-language question about how to use Paycheck Planner.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_us_tax_reference',
      description:
        'Retrieve 2026 US federal income tax brackets, standard deduction amounts, and ' +
        'FICA (Social Security + Medicare) payroll tax rates for a given filing status. ' +
        'Use this for any US tax-related calculation or explanation ' +
        '(e.g. estimating federal withholding, explaining which bracket applies, ' +
        'calculating Social Security tax).',
      parameters: {
        type: 'object',
        required: ['filing_status'],
        properties: {
          filing_status: {
            type: 'string',
            enum: ['single', 'married_filing_jointly'],
            description: 'Federal filing status.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_exchange_rate',
      description:
        'Get the current exchange rate between two currencies. ' +
        'Use this when the user asks to see their income or expenses in a different currency ' +
        '(e.g. "what is my salary in EUR?", "how much is $500 in GBP?").',
      parameters: {
        type: 'object',
        required: ['from', 'to'],
        properties: {
          from: {
            type: 'string',
            description: 'Source currency ISO 4217 code (e.g. "USD").',
          },
          to: {
            type: 'string',
            description: 'Target currency ISO 4217 code (e.g. "EUR").',
          },
        },
      },
    },
  },
];

// ── Individual executors ──────────────────────────────────────────────────────

function execLookUpTerm(term: string): string {
  const q = term.toLowerCase().trim();

  // Exact term, id, or alias match first
  const exact = glossaryTerms.find(
    (t) =>
      t.term.toLowerCase() === q ||
      t.id === q.replace(/\s+/g, '-') ||
      (t.aliases?.some((a) => a.toLowerCase() === q) ?? false),
  );
  if (exact) {
    const related = exact.relatedTermIds?.length
      ? `\nRelated terms: ${exact.relatedTermIds.join(', ')}`
      : '';
    return `**${exact.term}**: ${exact.fullDefinition}${related}`;
  }

  // Partial / all-words match
  const words = q.split(/\s+/).filter((w) => w.length > 1);
  const partials = glossaryTerms.filter(
    (t) =>
      t.term.toLowerCase().includes(q) ||
      (t.aliases?.some((a) => a.toLowerCase().includes(q)) ?? false) ||
      (words.length > 1 && words.every((w) => t.term.toLowerCase().includes(w))),
  );
  if (partials.length > 0) {
    return partials
      .slice(0, 3)
      .map((t) => `**${t.term}**: ${t.fullDefinition}`)
      .join('\n\n');
  }

  return `No glossary entry found for "${term}". You may answer from general financial knowledge.`;
}

function execSearchAppFaq(query: string): string {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const scored: Array<{ score: number; question: string; answer: string }> = [];

  for (const section of appFaqSections) {
    for (const item of section.items) {
      const haystack = [item.question, item.answer, ...item.keywords, section.searchTerms]
        .join(' ')
        .toLowerCase();

      const score = words.filter((w) => haystack.includes(w)).length;
      if (score > 0) {
        scored.push({ score, question: item.question, answer: item.answer });
      }
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 3);

  if (top.length === 0) {
    return `No FAQ entries matched "${query}". This topic may not be documented in the app FAQ.`;
  }

  return top.map((r) => `Q: ${r.question}\nA: ${r.answer}`).join('\n\n---\n\n');
}

function execGetUsTaxReference(filingStatus: 'single' | 'married_filing_jointly'): string {
  const fs = filingStatus === 'married_filing_jointly' ? 'married_filing_jointly' : 'single';
  const brackets = US_FEDERAL_TAX_RULES_2026.brackets[fs];
  const stdDed = US_FEDERAL_TAX_RULES_2026.standardDeduction[fs];
  const fica = US_FICA_RULES_2026;

  const lines: string[] = [];
  lines.push(`US Federal Tax Reference — ${US_FEDERAL_TAX_RULES_2026.taxYear} (${fs.replace('_', ' ')})`);
  lines.push(`Standard deduction: $${stdDed.toLocaleString()}`);
  lines.push('');
  lines.push('Federal income tax brackets (on taxable income after standard deduction):');

  let prevUpTo = 0;
  for (const b of brackets) {
    const from = `$${prevUpTo.toLocaleString()}`;
    const to = b.upTo === Number.POSITIVE_INFINITY ? 'and above' : `$${b.upTo.toLocaleString()}`;
    lines.push(`  ${(b.rate * 100).toFixed(0)}%: ${from} – ${to}`);
    prevUpTo = b.upTo;
  }

  lines.push('');
  lines.push('FICA payroll taxes (employee share):');
  lines.push(
    `  Social Security: ${(fica.socialSecurityEmployeeRate * 100).toFixed(1)}% ` +
      `on wages up to $${fica.socialSecurityWageBase.toLocaleString()} (wage base)`,
  );
  lines.push(`  Medicare: ${(fica.medicareEmployeeRate * 100).toFixed(2)}% on all wages`);
  lines.push(
    `  Additional Medicare: +${(fica.medicareAdditionalRate * 100).toFixed(1)}% ` +
      `on wages above $${fica.medicareAdditionalThresholdSingle.toLocaleString()} (single) ` +
      `/ $${fica.medicareAdditionalThresholdMarried.toLocaleString()} (married)`,
  );

  lines.push('');
  lines.push(`Source: ${US_FEDERAL_TAX_RULES_2026.source}`);

  return lines.join('\n');
}

async function execGetExchangeRate(from: string, to: string): Promise<string> {
  const apiUrl =
    (process.env.CURRENCY_CONVERSION_URL as string | undefined) ??
    'https://api.frankfurter.app/latest';

  try {
    const url = new URL(apiUrl);
    url.searchParams.set('base', from.toUpperCase());
    url.searchParams.set('symbols', to.toUpperCase());

    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });

    if (!res.ok) {
      return `Exchange rate service returned HTTP ${res.status}. Unable to fetch ${from}→${to}.`;
    }

    const data = (await res.json()) as { rates?: Record<string, number>; date?: string };
    const rate = data.rates?.[to.toUpperCase()];

    if (typeof rate !== 'number') {
      return (
        `No rate data found for ${from.toUpperCase()}/${to.toUpperCase()}. ` +
        `Check that both codes are valid ISO 4217 currency codes.`
      );
    }

    return (
      `1 ${from.toUpperCase()} = ${rate} ${to.toUpperCase()} ` +
      `(Frankfurter, date: ${data.date ?? 'unknown'})`
    );
  } catch (err) {
    return `Could not fetch exchange rate: ${err instanceof Error ? err.message : String(err)}`;
  }
}

// ── Tool dispatcher ───────────────────────────────────────────────────────────
// Called by the agentic loop in agentIpc.ts for each tool_call the model emits.

export async function executeTool(tc: ToolCall): Promise<string> {
  const { name, arguments: args } = tc.function;

  try {
    switch (name) {
      case 'look_up_term':
        return execLookUpTerm(String(args['term'] ?? ''));

      case 'search_app_faq':
        return execSearchAppFaq(String(args['query'] ?? ''));

      case 'get_us_tax_reference': {
        const fs =
          args['filing_status'] === 'married_filing_jointly'
            ? 'married_filing_jointly'
            : 'single';
        return execGetUsTaxReference(fs);
      }

      case 'get_exchange_rate':
        return await execGetExchangeRate(
          String(args['from'] ?? 'USD'),
          String(args['to'] ?? 'EUR'),
        );

      default:
        return `Unknown tool: "${name}". Available tools: look_up_term, search_app_faq, get_us_tax_reference, get_exchange_rate.`;
    }
  } catch (err) {
    return `Tool "${name}" failed: ${err instanceof Error ? err.message : String(err)}`;
  }
}
