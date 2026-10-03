jest.mock("@settings/settings", () => ({}));
import {
  countScripts,
  decideFrontmatterPrompt,
  detectBookScript,
  suggestFrontmatterForBook,
  templateLanguageOf,
} from "@utils/book_script";
import type { Book } from "@models/book.model";

function book(overrides: Partial<Book>): Book {
  return {
    title: "",
    author: "",
    authors: [],
    coverUrl: "",
    link: "",
    ...overrides,
  };
}

describe("countScripts", () => {
  it("counts Latin and non-Latin letters separately", () => {
    const counts = countScripts("Dune دن");
    expect(counts).toEqual(
      expect.arrayContaining([
        { script: "Latin", count: 4 },
        { script: "Arabic", count: 2 },
      ]),
    );
  });

  it("ignores digits, punctuation and whitespace", () => {
    expect(countScripts("123 --- !!!")).toEqual([]);
  });

  it("classifies kana as Japanese rather than Han", () => {
    const scripts = countScripts("砂の惑星").map((c) => c.script);
    expect(scripts).toContain("Japanese");
  });

  it("classifies Hangul separately from Han", () => {
    const scripts = countScripts("코스모스").map((c) => c.script);
    expect(scripts).toEqual(["Hangul"]);
  });

  it("handles Latin letters carrying diacritics", () => {
    expect(countScripts("Gracián")).toEqual([{ script: "Latin", count: 7 }]);
  });
});

describe("detectBookScript", () => {
  it("treats a plain English book as Latin", () => {
    expect(
      detectBookScript(book({ title: "Dune", author: "Frank Herbert" })).script,
    ).toBe("Latin");
  });

  it("detects an Arabic book from its title", () => {
    expect(
      detectBookScript(
        book({ title: "موسم الهجرة إلى الشمال", author: "الطيب صالح" }),
      ).script,
    ).toBe("Arabic");
  });

  it("detects Cyrillic, Greek and Hebrew", () => {
    expect(
      detectBookScript(book({ title: "Преступление и наказание" })).script,
    ).toBe("Cyrillic");
    expect(detectBookScript(book({ title: "Ο Δράκος" })).script).toBe("Greek");
    expect(detectBookScript(book({ title: "מיכאל שלי" })).script).toBe(
      "Hebrew",
    );
  });

  it("separates Japanese, Chinese and Korean", () => {
    expect(detectBookScript(book({ title: "こころ" })).script).toBe("Japanese");
    expect(detectBookScript(book({ title: "活着" })).script).toBe("Han");
    expect(detectBookScript(book({ title: "코스모스" })).script).toBe("Hangul");
  });

  it("ignores a single stray non-Latin character in an English title", () => {
    expect(
      detectBookScript(
        book({ title: "Dune ★ Special Edition", author: "Frank Herbert" }),
      ).script,
    ).toBe("Latin");
  });

  it("weights the title over a transliterated author name", () => {
    const detection = detectBookScript(
      book({ title: "Kosmos", author: "كارل ساغان", authors: ["كارل ساغان"] }),
    );
    // Latin title carries the book; the Arabic author name is a minority.
    expect(detection.script).toBe("Latin");
  });

  it("still detects the script when the title is the only signal", () => {
    expect(detectBookScript(book({ title: "موسم الهجرة" })).script).toBe(
      "Arabic",
    );
  });

  it("falls back to Latin for empty metadata", () => {
    const detection = detectBookScript(book({}));
    expect(detection.script).toBe("Latin");
    expect(detection.count).toBe(0);
  });

  it("reports every script it saw, dominant first", () => {
    const detection = detectBookScript(
      book({ title: "Dune", originalTitle: "موسم الهجرة إلى الشمال" }),
    );
    expect(detection.counts.map((c) => c.script)).toEqual(["Arabic", "Latin"]);
  });
});

describe("suggestFrontmatterForBook", () => {
  const arabicBook = book({
    title: "موسم الهجرة إلى الشمال",
    author: "الطيب صالح",
    authors: ["الطيب صالح"],
  });

  it("says nothing for a Latin-script book", () => {
    expect(
      suggestFrontmatterForBook(book({ title: "Dune" }), "English"),
    ).toBeNull();
  });

  it("suggests Arabic for an Arabic book under an English template", () => {
    expect(suggestFrontmatterForBook(arabicBook, "English")).toEqual({
      script: "Arabic",
      suggestedTemplate: "Arabic",
      needsChange: true,
    });
  });

  it("stays quiet when the template already matches the script", () => {
    expect(suggestFrontmatterForBook(arabicBook, "Arabic")?.needsChange).toBe(
      false,
    );
  });

  it("does not offer Chinese keys for a Japanese book on a Chinese template", () => {
    const japanese = book({ title: "こころ", author: "夏目漱石" });
    expect(
      suggestFrontmatterForBook(japanese, "Simplified Chinese")?.needsChange,
    ).toBe(false);
  });

  it("does offer Japanese keys for a Japanese book on a Latin template", () => {
    const japanese = book({ title: "こころ", author: "夏目漱石" });
    expect(suggestFrontmatterForBook(japanese, "English")).toEqual({
      script: "Japanese",
      suggestedTemplate: "Japanese",
      needsChange: true,
    });
  });

  it("maps each script to its template", () => {
    const cases: Array<[string, string]> = [
      ["Преступление и наказание", "Russian"],
      ["Ο Δράκος", "Greek"],
      ["מיכאל שלי", "Hebrew"],
      ["活着", "Simplified Chinese"],
      ["코스모스", "Korean"],
    ];
    for (const [title, expected] of cases) {
      expect(
        `${title} -> ${suggestFrontmatterForBook(book({ title }), "English")?.suggestedTemplate}`,
      ).toBe(`${title} -> ${expected}`);
    }
  });
});

describe("templateLanguageOf", () => {
  it("names the language of the non-Latin templates", () => {
    expect(templateLanguageOf("Arabic")).toBe("Arabic");
    expect(templateLanguageOf("Russian")).toBe("Russian");
    expect(templateLanguageOf("Korean")).toBe("Korean");
  });

  it("groups the Latin-keyed templates together", () => {
    for (const name of [
      "English",
      "Spanish",
      "French",
      "German",
      "Italian",
      "Portuguese",
      "Dutch",
    ]) {
      expect(`${name}:${templateLanguageOf(name)}`).toBe(`${name}:Latin`);
    }
  });
});

describe("decideFrontmatterPrompt", () => {
  const arabic = { title: "موسم الهجرة إلى الشمال", author: "الطيب صالح" };
  const english = { title: "Dune", author: "Frank Herbert" };

  it("prompts for a non-Latin book on a Latin template", () => {
    expect(decideFrontmatterPrompt(arabic, "English", true)).toEqual({
      suggestedTemplate: "Arabic",
      script: "Arabic",
      shouldPrompt: true,
    });
  });

  it("never prompts when the setting is off", () => {
    expect(
      decideFrontmatterPrompt(arabic, "English", false)?.shouldPrompt,
    ).toBe(false);
  });

  it("does not prompt when the template already matches", () => {
    expect(decideFrontmatterPrompt(arabic, "Arabic", true)?.shouldPrompt).toBe(
      false,
    );
  });

  it("returns null for Latin books, so callers can skip the modal entirely", () => {
    expect(decideFrontmatterPrompt(english, "English", true)).toBeNull();
  });

  it("still reports a suggestion when prompting is off", () => {
    const decision = decideFrontmatterPrompt(arabic, "English", false);
    expect(decision?.suggestedTemplate).toBe("Arabic");
  });

  it("handles a custom template by treating it as Latin keys", () => {
    expect(decideFrontmatterPrompt(arabic, undefined, true)?.shouldPrompt).toBe(
      true,
    );
  });
});
