jest.mock("@settings/settings", () => ({}));
import type { App } from "obsidian";
import { BookNoteCreator } from "@utils/note_creator";
import { makeBook, makeSettings } from "@utils/test_utils";
import { FRONTMATTER_TEMPLATES } from "@settings/frontmatter_templates";

describe("per-note frontmatter override", () => {
  const book = makeBook({
    title: "موسم الهجرة إلى الشمال",
    author: "الطيب صالح",
    categories: "رواية, أدب عربي",
  });

  function creator(settings = makeSettings()) {
    return new BookNoteCreator({} as unknown as App, settings);
  }

  it("uses the saved template when no override is given", async () => {
    const output = await creator().getRenderedContents(book);
    expect(output).toContain("Title: موسم الهجرة إلى الشمال");
  });

  it("uses the override for that note only", async () => {
    const output = await creator().getRenderedContents(
      book,
      FRONTMATTER_TEMPLATES.Arabic,
    );

    expect(output).toContain("العنوان: موسم الهجرة إلى الشمال");
    expect(output).toContain("المؤلف: الطيب صالح");
    expect(output).toContain("التصنيفات:\n- رواية\n- أدب عربي");
    expect(output).not.toContain("Title:");
  });

  it("leaves settings.frontmatter untouched when overriding", async () => {
    const settings = makeSettings({ frontmatter: "Title: {{title}}" });
    const before = settings.frontmatter;
    await creator(settings).getRenderedContents(
      book,
      FRONTMATTER_TEMPLATES.Arabic,
    );
    expect(settings.frontmatter).toBe(before);
  });

  it("applies the override through create() as well", async () => {
    const written: Array<[string, string]> = [];
    const app = {
      vault: {
        adapter: { exists: async () => true },
        createFolder: async () => {},
        create: async (path: string, data: string) => {
          written.push([path, data]);
          return { path, basename: path };
        },
      },
      plugins: {},
    } as unknown as App;

    await new BookNoteCreator(app, makeSettings()).create(
      book,
      FRONTMATTER_TEMPLATES.Arabic,
    );

    expect(written).toHaveLength(1);
    expect(written[0][1]).toContain("العنوان:");
  });

  it("still resolves the default frontmatter additions alongside an override", async () => {
    const output = await creator(
      makeSettings({
        useDefaultFrontmatter: true,
        frontmatter: "العنوان: {{title}}",
      }),
    ).getRenderedContents(book);
    expect(output).toContain("العنوان:");
  });
});
