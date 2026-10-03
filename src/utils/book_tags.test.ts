jest.mock("@settings/settings", () => ({}));
import type { App } from "obsidian";
import { createBookTags } from "@utils/utils";
import { BookNoteCreator } from "@utils/note_creator";
import type { BookSearchPluginSettings } from "@settings/settings";
import type { Book } from "@models/book.model";
import { makeSettings } from "@utils/test_utils";

/**
 * These tests build books explicitly rather than through `makeBook`, because
 * that factory fills `authors` with a default that would mask the behaviour
 * under test.
 */
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

describe("createBookTags", () => {
  it("prefixes the author tag so it forms a browsable namespace", () => {
    const tags = createBookTags(
      book({ author: "Ursula K. Le Guin" }),
      "authors/",
      "",
      false,
    );

    expect(tags).toEqual(["authors/ursula_k_le_guin"]);
  });

  it("tags every credited author, primary first", () => {
    const tags = createBookTags(
      book({
        author: "Terry Pratchett",
        authors: ["Terry Pratchett", "Neil Gaiman"],
      }),
      "authors/",
      "",
      false,
    );

    expect(tags).toEqual(["authors/terry_pratchett", "authors/neil_gaiman"]);
  });

  it("falls back to the authors list when author is empty", () => {
    const tags = createBookTags(
      book({ authors: ["China Miéville", "Keanu Reeves"] }),
      "authors/",
      "",
      false,
    );

    expect(tags).toEqual(["authors/china_miéville", "authors/keanu_reeves"]);
  });

  it("does not duplicate an author credited twice", () => {
    const tags = createBookTags(
      book({ author: "Ann Leckie", authors: ["Ann Leckie", "Ann Leckie"] }),
      "authors/",
      "",
      false,
    );

    expect(tags).toEqual(["authors/ann_leckie"]);
  });

  it("omits the title tag when the feature is off", () => {
    expect(
      createBookTags(book({ title: "Dune" }), "authors/", "", false),
    ).toEqual([]);
  });

  it("still includes the title tag when the flag is omitted (upstream contract)", () => {
    expect(createBookTags(book({ title: "Dune" }), "authors/")).toEqual([
      "dune",
    ]);
  });

  it("adds a prefixed title tag when explicitly enabled", () => {
    const tags = createBookTags(
      book({ author: "Frank Herbert", title: "Dune" }),
      "authors/",
      "books/",
      true,
    );

    expect(tags).toEqual(["authors/frank_herbert", "books/dune"]);
  });

  it("keeps an Arabic author name in one namespace segment", () => {
    const tags = createBookTags(
      book({ author: "الطيب صالح" }),
      "authors/",
      "",
      false,
    );

    expect(tags).toEqual(["authors/الطيب_صالح"]);
  });

  it("skips names that sanitise to nothing", () => {
    const tags = createBookTags(
      book({ author: "!!!", title: "Dune" }),
      "authors/",
      "books/",
      true,
    );

    // "authors/" on its own would be a namespace, not a tag.
    expect(tags).toEqual(["books/dune"]);
  });

  it("keeps the upstream shape when no prefixes are configured", () => {
    const tags = createBookTags(
      book({ author: "Frank Herbert", title: "Dune" }),
    );

    expect(tags).toEqual(["frank_herbert", "dune"]);
  });
});

describe("tags written into the note", () => {
  async function renderTags(
    overrides: Partial<BookSearchPluginSettings>,
    subject: Book,
  ): Promise<unknown> {
    const creator = new BookNoteCreator(
      {} as unknown as App,
      makeSettings({ frontmatter: "Tags: {{tags}}", ...overrides }),
    );
    const fm = await creator.getResolvedFrontmatter(subject);
    return fm.Tags;
  }

  const coAuthored = book({
    title: "Good Omens",
    author: "Terry Pratchett",
    authors: ["Terry Pratchett", "Neil Gaiman"],
  });

  it("writes one author tag per author, and no title tag by default", async () => {
    expect(
      await renderTags(
        { authorTagPrefix: "authors/", enableTitleTag: false },
        coAuthored,
      ),
    ).toEqual(["authors/terry_pratchett", "authors/neil_gaiman"]);
  });

  it("adds the title tag when the setting is on", async () => {
    expect(
      await renderTags(
        {
          authorTagPrefix: "authors/",
          titleTagPrefix: "",
          enableTitleTag: true,
        },
        coAuthored,
      ),
    ).toEqual(["authors/terry_pratchett", "authors/neil_gaiman", "good_omens"]);
  });

  it("treats a missing enableTitleTag setting as on (upstream compatibility)", async () => {
    const settings = makeSettings({
      authorTagPrefix: "authors/",
      frontmatter: "Tags: {{tags}}",
    });
    delete (settings as unknown as Record<string, unknown>).enableTitleTag;

    const creator = new BookNoteCreator({} as unknown as App, settings);
    const fm = await creator.getResolvedFrontmatter(
      book({ title: "Dune", author: "Frank Herbert" }),
    );

    expect(fm.Tags).toEqual(["authors/frank_herbert", "dune"]);
  });
});
