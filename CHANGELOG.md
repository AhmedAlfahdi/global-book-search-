# Changelog

All notable changes to this fork are documented in this file.

This fork is based on [DuckTapeKiller/global-book-search](https://github.com/DuckTapeKiller/global-book-search) (itself derived from [anpigon/obsidian-book-search-plugin](https://github.com/anpigon/obsidian-book-search-plugin)). Entries below 2.1.0 are upstream releases; 2.1.0 is this fork's first release.

## 2.3.2

### Changed

- **Arabic template field order and keys updated.** The read-date key is now
  `Date read` in English rather than `تاريخ القراءة`, and the fields follow the
  order used in practice:

  `العنوان، العنوان الأصلي، المؤلف، المترجم، مقدمة، الوصف، عدد الصفحات، الناشر، تاريخ النشر، التصنيفات، isbn 10، isbn 13، Asin، Date read، Link، localCover، tags، Read، direction`

  Reader-facing fields stay Arabic; keys that tools, themes and Obsidian
  recognise (`isbn 10`, `isbn 13`, `Asin`, `Link`, `localCover`, `tags`, `Read`)
  plus `Date read` keep their conventional spelling, so dates and queries behave
  the same in every language. `direction: rtl` is retained so an RTL plugin can
  lay the note out without extra setup.

### Fixed

- `tsconfig.json` now scopes type-checking to this project's own sources. Its
  `include: ["**/*.ts"]` was sweeping up the sibling `rtl-support/` project,
  whose CodeMirror types then collided with this repo's copies.

### Upgrade note

Templates live in `data.json`, so an update does not replace the one your vault
uses. To adopt it: **Settings → Book notes → Frontmatter → Language → Arabic**.

## 2.3.1

### Changed

- **Arabic template updated** to mix key styles deliberately: reader-facing
  fields stay Arabic (`العنوان`, `المؤلف`, `الوصف`, `التصنيفات`, `تاريخ النشر`,
  `تاريخ القراءة`), while keys that tools, themes and Obsidian recognise keep
  their conventional spelling (`isbn 10`, `isbn 13`, `Asin`, `Link`,
  `localCover`, `tags`, `Read`). The previous template used `الغلاف`, `الرابط`
  and `مقروء`, which nothing else understood.
- Added `direction: rtl`, so the reading view and RTL-aware themes lay the note
  out right-to-left.

### Upgrade note

Your saved template lives in `data.json`, so an update does not replace it. To
adopt the new Arabic template, open **Settings → Book notes → Frontmatter →
Language → Arabic**, which loads the shipped version into the editor.

## 2.3.0

### Added

- **Script-aware frontmatter.** When a book's metadata is written in a non-Latin
  script, the plugin offers the matching localized template for that note:
  Arabic, Russian (Cyrillic), Greek, Hebrew, Simplified Chinese (Han), Japanese
  and Korean. The prompt can apply the template to the one note or make it the
  default; dismissing it keeps the saved template. Notes are asked about only
  when the script differs from the current template, so Latin-script books are
  unaffected.
- New **Ask about frontmatter language** setting (on by default) to disable the
  prompt.
- `BookNoteCreator.create()` and `getRenderedContents()` accept an optional
  per-note frontmatter override, which is how the suggestion is applied without
  changing saved settings.

## 2.2.0

### Changed

- **Tags are author tags.** Every credited author gets one, so a co-authored book
  is findable under each name, and they are namespaced under `authors/` by
  default (`tag:#authors/` lists all authors, `tag:#authors/name` lists one
  author's books). Set the Author tag prefix to empty for the previous flat tags.
- **Title tags are off by default.** A title is unique to one book, so its tag is
  never reused — it duplicated the `Title` property without helping you browse.
  Re-enable it with the new **Create title tag** setting; the Title tag prefix
  still applies to it.

### Upgrade note

Existing notes keep the tags they already have; the change applies to notes
created (or updated via **Update Metadata**) afterwards. To adopt the new scheme
for an existing library, run **Update Metadata** per book from the duplicate
dialog, or edit the tags by hand.

## 2.1.0

First release of the fork. Adds Arabic frontmatter support and fixes several
metadata-correctness bugs.

### Added

- **Arabic frontmatter template**, selectable from the Language menu. Keys are
  Arabic (`العنوان`, `المؤلف`, `الوصف`, `التصنيفات`, `تاريخ النشر`, `مقروء`, …).
- **English is now the default template** for new installs. An existing template
  is untouched — the default applies only until a template is saved.

### Fixed

- **Categories and Tags are written as YAML lists.** Providers return genres as
  one comma-separated string, which YAML stored as a single value. Each genre is
  now its own list entry, for both `{{categories}}` and `"{{categories}}"`.
  `{{categories:raw}}` keeps the previous flat string.
- **Frontmatter that always parses.** A single invalid value invalidates the
  whole frontmatter block, so the note lost every property. Multi-paragraph
  descriptions (raw line breaks, and blank lines that dropped the field
  entirely), titles starting with `-`, and values containing a ` #` or `: ` are
  now quoted and escaped correctly. Page counts and ISBNs stay strings, including
  for localised keys such as `عدد الصفحات`.
- **Duplicate detection can find notes by ISBN.** Templates write `isbn 10` /
  `isbn 13`, but the lookup read only `isbn10` / `isbn13`. All spellings are now
  accepted, folder matching compares whole path segments, and the title fallback
  recognises the `<title> - <author>` filenames the default format produces.
- **"Update Metadata" is honoured.** It previously fell through to note creation,
  producing a "File already exists" error or a duplicate note. It now updates the
  existing note in place and leaves properties the plugin does not manage
  (reading dates, ratings, notes) untouched.
- **Dead Goodreads links no longer overwrite the note.** Goodreads serves a
  deleted book id as HTTP 200 with a "Page not found" page whose OpenGraph tags
  describe the site, which used to replace the note's title, cover and
  description with site chrome. Such pages are now rejected, on the archive route
  too.
- The "Goodreads page blocked" diagnostic now measures the fetched detail rather
  than the merged result, so it no longer fires for books that simply lack a
  publisher or ISBN.

### Internal

- Frontmatter templates moved to `src/settings/frontmatter_templates.ts` and
  `DefaultFrontmatterKeyType` to `src/settings/key_type.ts`. Both are re-exported
  from `settings.ts`, whose public surface is unchanged.
- Test count 82 → 150, including YAML assertions through a real parser and a
  captured Goodreads "Page not found" fixture.
