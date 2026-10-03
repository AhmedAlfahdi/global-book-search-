/**
 * Script-aware frontmatter suggestions.
 *
 * A note's frontmatter keys should be readable to whoever reads the note. When a
 * book's metadata is written in a non-Latin script, the Latin-keyed template is
 * a poor fit, so we can offer the matching localized template for that one note.
 */

export type ScriptName =
  | "Latin"
  | "Arabic"
  | "Cyrillic"
  | "Greek"
  | "Hebrew"
  | "Han"
  | "Japanese"
  | "Hangul";

/** A named script a template is written in. */
export type TemplateLanguage =
  | "Arabic"
  | "Russian"
  | "Greek"
  | "Hebrew"
  | "Simplified Chinese"
  | "Japanese"
  | "Korean"
  | "Latin";

const SCRIPT_RANGES: Array<{ script: ScriptName; pattern: RegExp }> = [
  // Kana are checked before Han so a Japanese title is not mistaken for Chinese.
  { script: "Japanese", pattern: /[\u3040-\u309f\u30a0-\u30ff]/u },
  { script: "Hangul", pattern: /[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/u },
  { script: "Han", pattern: /[\u4e00-\u9fff\u3400-\u4dbf]/u },
  {
    script: "Arabic",
    pattern:
      /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff]/u,
  },
  { script: "Cyrillic", pattern: /[\u0400-\u04ff\u0500-\u052f]/u },
  { script: "Greek", pattern: /[\u0370-\u03ff\u1f00-\u1fff]/u },
  { script: "Hebrew", pattern: /[\u0590-\u05ff]/u },
];

/** Templates that a script maps to, keyed by the template's own language. */
export const SCRIPT_TO_TEMPLATE: Record<ScriptName, TemplateLanguage> = {
  Latin: "Latin",
  Arabic: "Arabic",
  Cyrillic: "Russian",
  Greek: "Greek",
  Hebrew: "Hebrew",
  Han: "Simplified Chinese",
  Japanese: "Japanese",
  Hangul: "Korean",
};

/** True when a template's keys are legible for a script. */
function isCompatible(current: TemplateLanguage, script: ScriptName): boolean {
  const suggested = SCRIPT_TO_TEMPLATE[script];
  if (current === suggested) return true;
  // A Japanese template renders Chinese text fine, and vice versa — both are
  // Han-based, so they are interchangeable as a *key* set.
  const hanBased = new Set<TemplateLanguage>([
    "Japanese",
    "Simplified Chinese",
  ]);
  return hanBased.has(current) && hanBased.has(suggested);
}

/**
 * Which template language a template's *keys* are written in.
 *
 * Only the non-Latin templates need naming — everything else (English, Spanish,
 * French, German, Italian, Portuguese, Dutch) uses Latin keys and is grouped
 * under "Latin", since the choice between them is a user preference rather than
 * a legibility problem.
 */
export const TEMPLATE_LANGUAGE: Record<string, TemplateLanguage> = {
  Arabic: "Arabic",
  Russian: "Russian",
  "Simplified Chinese": "Simplified Chinese",
  Japanese: "Japanese",
  Korean: "Korean",
};

export function templateLanguageOf(templateName: string): TemplateLanguage {
  return TEMPLATE_LANGUAGE[templateName] ?? "Latin";
}

export interface ScriptCount {
  script: ScriptName;
  count: number;
}

/** Count the letters of each script present in the text. */
export function countScripts(text: string): ScriptCount[] {
  const counts = new Map<ScriptName, number>();
  let latin = 0;

  for (const char of text || "") {
    let matched: ScriptName | null = null;
    for (const { script, pattern } of SCRIPT_RANGES) {
      if (pattern.test(char)) {
        matched = script;
        break;
      }
    }
    if (matched) {
      counts.set(matched, (counts.get(matched) ?? 0) + 1);
    } else if (/\p{Script=Latin}/u.test(char)) {
      latin++;
    }
  }

  const out: ScriptCount[] = [];
  if (latin > 0) out.push({ script: "Latin", count: latin });
  for (const [script, count] of counts) out.push({ script, count });
  return out.sort((a, b) => b.count - a.count);
}

export interface BookScriptDetection {
  script: ScriptName;
  /** Letters of the dominant script. */
  count: number;
  /** Letters of every script seen, dominant first. */
  counts: ScriptCount[];
}

/** Minimum letters of one script before it counts as the book's script. */
const MIN_SCRIPT_LETTERS = 3;
/** Minimum share of all letters the dominant script must hold. */
const MIN_SCRIPT_SHARE = 0.3;

/**
 * Work out which script a book's metadata is written in.
 *
 * Latin is the fallback, so Latin-script books never trigger a suggestion.
 * Titles are weighted twice because they are the strongest signal — a
 * transliterated author name should not decide the language of the note.
 */
export function detectBookScript(book: {
  title?: string;
  originalTitle?: string;
  author?: string;
  authors?: string[];
  translator?: string;
  description?: string;
}): BookScriptDetection {
  // `author` and `authors` usually hold the same name(s); use one or the other
  // so an author is never counted twice.
  const authorText = (book.author ?? "").trim()
    ? (book.author ?? "")
    : (book.authors ?? []).join(" ");

  const weighted: Array<[string, number]> = [
    [book.title ?? "", 2],
    [book.originalTitle ?? "", 1],
    [authorText, 1],
    [book.translator ?? "", 1],
    // A description is long and could dominate, so it only breaks ties.
    [book.description ?? "", 1],
  ];

  const totals = new Map<ScriptName, number>();
  for (const [text, weight] of weighted) {
    for (const { script, count } of countScripts(text)) {
      totals.set(script, (totals.get(script) ?? 0) + count * weight);
    }
  }

  const counts = [...totals.entries()]
    .map(([script, count]) => ({ script, count }))
    .sort((a, b) => b.count - a.count);

  const allLetters = counts.reduce((sum, c) => sum + c.count, 0);
  const top = counts[0];

  if (
    !top ||
    top.script === "Latin" ||
    top.count < MIN_SCRIPT_LETTERS ||
    top.count / allLetters < MIN_SCRIPT_SHARE
  ) {
    return { script: "Latin", count: totals.get("Latin") ?? 0, counts };
  }

  return { script: top.script, count: top.count, counts };
}

export interface TemplateSuggestion {
  script: ScriptName;
  /** Template that matches the script, e.g. "Arabic". */
  suggestedTemplate: TemplateLanguage;
  /** True when the note's current template cannot display these keys well. */
  needsChange: boolean;
}

/**
 * Decide whether to offer a different frontmatter template for this book.
 * Returns `null` when nothing should be asked — a Latin-script book, or a book
 * whose script already matches the template in use.
 */
export function suggestFrontmatterForBook(
  book: Parameters<typeof detectBookScript>[0],
  currentTemplateName?: string,
): TemplateSuggestion | null {
  const detection = detectBookScript(book);
  if (detection.script === "Latin") return null;

  const suggestedTemplate = SCRIPT_TO_TEMPLATE[detection.script];
  const currentLanguage = currentTemplateName
    ? templateLanguageOf(currentTemplateName)
    : "Latin";

  return {
    script: detection.script,
    suggestedTemplate,
    needsChange: !isCompatible(currentLanguage, detection.script),
  };
}

export interface PromptDecision {
  /** Template to offer, e.g. "Arabic". */
  suggestedTemplate: TemplateLanguage;
  script: ScriptName;
  /** The user should be asked (not disabled, and the current template differs). */
  shouldPrompt: boolean;
}

/**
 * Decide what to do for a book, given the saved template and the user setting.
 *
 * Kept free of Obsidian APIs so the whole decision can be unit-tested; the
 * caller turns `shouldPrompt` into a modal and applies `suggestedTemplate`.
 */
export function decideFrontmatterPrompt(
  book: Parameters<typeof detectBookScript>[0],
  currentTemplateName: string | undefined,
  askEnabled: boolean,
): PromptDecision | null {
  const suggestion = suggestFrontmatterForBook(book, currentTemplateName);
  if (!suggestion) return null;

  return {
    suggestedTemplate: suggestion.suggestedTemplate,
    script: suggestion.script,
    shouldPrompt: askEnabled && suggestion.needsChange,
  };
}
