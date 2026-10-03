# Changelog

All notable changes to this fork are documented in this file.

This fork is based on [DuckTapeKiller/global-book-search](https://github.com/DuckTapeKiller/global-book-search) (itself derived from [anpigon/obsidian-book-search-plugin](https://github.com/anpigon/obsidian-book-search-plugin)). Entries below 2.1.0 are upstream releases; 2.1.0 is this fork's first release.

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
