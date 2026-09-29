[![GitHub Repo stars](https://img.shields.io/github/stars/AhmedAlfahdi/global-book-search-?style=flat&logo=obsidian&color=%23483699)](https://github.com/AhmedAlfahdi/global-book-search-/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/AhmedAlfahdi/global-book-search-?logo=obsidian&color=%23483699)](https://github.com/AhmedAlfahdi/global-book-search-/issues)
[![GitHub closed issues](https://img.shields.io/github/issues-closed/AhmedAlfahdi/global-book-search-?logo=obsidian&color=%23483699)](https://github.com/AhmedAlfahdi/global-book-search-/issues?q=is%3Aissue+is%3Aclosed)
[![GitHub manifest version](https://img.shields.io/github/manifest-json/v/AhmedAlfahdi/global-book-search-?logo=obsidian&color=%23483699)](https://github.com/AhmedAlfahdi/global-book-search-/blob/main/manifest.json)


![Cover Image](screenshots/cover.png)

# Global Book Search

**Global Book Search** is an advanced metadata aggregation plugin for Obsidian. It facilitates the creation of comprehensive book notes by consolidating data from multiple international sources, scraping dynamic web content, and applying automated enrichment pipelines.

> ### About this repository
> This is a **personal fork** of [DuckTapeKiller/global-book-search](https://github.com/DuckTapeKiller/global-book-search), maintained by [AhmedAlfahdi](https://github.com/AhmedAlfahdi).
> It adds **Arabic frontmatter support**, renders `Categories` as a proper YAML list, and fixes several metadata-correctness bugs. See [What's New in This Fork](#whats-new-in-this-fork).

---

## Table of Contents

- [What's New in This Fork](#whats-new-in-this-fork)
- [Core Architecture](#core-architecture)
- [Search Modalities](#search-modalities)
- [Metadata Sources](#metadata-sources)
- [Universal Enrichment Pipeline](#universal-enrichment-pipeline)
- [Template System and Variables](#template-system-and-variables)
- [How to Use](#how-to-use)
- [Duplicate Detection](#duplicate-detection)
- [Calibre Integration](#calibre-integration)
- [Mobile Optimization](#mobile-optimization)
- [Installation and Credits](#installation-and-credits)

---

## What's New in This Fork

### 1. Arabic frontmatter
A full Arabic template with Arabic YAML property names (`العنوان`, `المؤلف`, `التصنيفات`, …). Pick it from **Settings → Global Book Search → Frontmatter → Language → Arabic**. Obsidian reads the keys like any other property — only the names change.

### 2. Categories and Tags are real YAML lists
`Categories: {{categories}}` used to produce one comma-joined sentence, which Obsidian stored as a **single** value:

```yaml
# Before — one long string, one tag
Categories: Science Fiction, Fantasy, Adventure
```

It now produces one entry per line:

```yaml
# After — three separate values
Categories:
- Science Fiction
- Fantasy
- Adventure
```

The same applies to `Tags`. Every shipped template benefits, and it works whether you write `{{categories}}` or `"{{categories}}"`.

### 3. Frontmatter that cannot break
Book APIs return descriptions with blank lines, titles starting with `-`, and `#` characters mid-title. Those used to produce YAML that Obsidian could not parse — and because a broken value invalidates the whole block, the note lost **all** of its properties. Values are now quoted and escaped as needed, and nothing is silently dropped:

- Multi-paragraph descriptions keep their paragraphs.
- `- not a list`, `Book #1`, `{not a map}`, `ends with colon:` are written as strings.
- Page counts and ISBNs stay strings rather than becoming numbers.

### 4. Duplicate detection actually finds your notes
Notes written by this plugin store their ISBNs as `isbn 10` / `isbn 13` (with a space), but the duplicate check looked for `isbn10` / `isbn13` — so it never matched by ISBN. It now accepts every spelling, and the title fallback also recognises the `<title> - <author>` file names this plugin creates.

### 5. "Update Metadata" works
Choosing **Update Metadata** in the duplicate dialog used to fall through to *create* — giving you a "File already exists" error, or a second copy of the note. It now updates the existing note in place, leaving fields you maintain by hand (reading dates, ratings, notes) untouched.

### 6. Dead Goodreads links no longer poison the note
Goodreads answers a request for a deleted book id with **HTTP 200** and a "Page not found" page whose OpenGraph tags describe the site, not a book. The scraper accepted it, so the note's title became `Goodreads`, its cover became the Goodreads logo, and its description became marketing copy. Such pages are now rejected and the search result is kept instead.

### 7. English is the default template
New installs start from the English template. Your existing template is untouched — the default only applies before you have saved one.


## Core Architecture

The plugin is designed around a multi-stage extraction engine that prioritizes data integrity and depth. Unlike standard plugins that rely on a single API, **Global Book Search** uses a hybrid approach:

- [x] **Direct API Integration**: Utilizes official REST APIs for Google Books and OpenLibrary.
- [x] **Resilient Web Scraping**: Implements custom parsing engines for Goodreads and StoryGraph to capture data not available via public APIs.
- [x] **Conflict Resolution**: Merges data from multiple providers using a prioritized scoring system.

---

## Search Modalities

### [i] Global Search
Consolidates results from all configured services into a single unified view. 
- Automatically deduplicates results by normalizing titles and authors.
- Displays source badges for each result to indicate data availability.
- Triggers the full enrichment pipeline upon selection.
- QR/Barcode Scanner: You can now point your camera at a physical book’s barcode to instantly trigger the extraction pipeline.

### [i] Individual Service Search
Allows for targeted searching within a specific provider (e.g., searching only your local Calibre library or only StoryGraph).

---

## Metadata Sources

### StoryGraph (Advanced Scraper)
A high-resilience engine designed to bypass common scraping blocks.
- [!] **Translator Extraction**: Specifically targets and isolates translator information.
- [!] **Edition Precision**: Allows selection of specific editions (e.g., by publisher or cover).
- [!] **JSON-LD Fallback**: Parses structured metadata even when standard HTML elements are obscured.

### Goodreads (Primary Enrichment)
The industry standard for social book metadata.
- [!] **Rich Metadata**: Captures original titles, total pages, and ASINs.
- [!] **High-Res Covers**: Automatically attempts to fetch the highest resolution available.

### OpenLibrary and Google Books
Reliable fallbacks for ISBN validation and categorized genre data.

---

## Universal Enrichment Pipeline

When a book is selected, the plugin initiates a sequential enrichment process:

1. **Step 1: Primary Fetch**: Retrieves full details from the selected source.
2. **Step 2: Goodreads Fallback**: If the primary source lacks an ISBN, the plugin searches Goodreads by title/author to recover the identifier.
3. **Step 3: Multi-Source Bridge**: Uses the ISBN to fetch missing fields (description, genres, publisher) from all other providers in parallel.
4. **Step 4: Passive Enrichment (Fable.co)**: Scans Fable.co for high-quality descriptions and covers if still missing.
5. **Step 5: Library of Congress (LoC)**: Validates publication dates and page counts against official records.

---

## Template System and Variables

The plugin utilizes a Handlebars-based template system.

### [!] Default Frontmatter Template (English)
The plugin provides localized default templates. Below is the English structure:

```yaml
---
Title: "{{title}}"
Original title: "{{originalTitle}}"
Author: "{{author}}"
Translator: "{{translator}}"
Prologue: ""
Description: "{{description}}"
Total Pages: "{{totalPage}}"
Publisher: {{publisher}}
Categories: {{categories}}
isbn 10: "{{isbn10}}"
isbn 13: "{{isbn13}}"
Asin: {{asin}}
Published: {{publishDate}}
Date read:
Cover: "{{localCoverImage}}"
Link: {{link}}
Tags: {{tags}}
Read: false
---
```

### [i] Supported Languages
[!] **Default Language**: The plugin initializes with the English template by default.
[i] **Customization**: You can choose and restore default templates for any of the following 12 languages directly from the settings menu:
- Spanish, English, French, German, Italian, Portuguese, Dutch, Russian, Simplified Chinese, Japanese, Korean, and **Arabic**.

> Arabic notes are written with Arabic YAML keys (e.g. `العنوان`, `المؤلف`, `التصنيفات`). The keys are plain UTF-8, so Obsidian reads them like any other property — only the names change, never the structure.

### [!] List Properties (Categories and Tags)
Variables that hold several values — such as `{{categories}}` — are written as a **YAML list**, one entry per line:

```yaml
Categories:
- Science Fiction
- Fantasy
- Adventure
```

Older versions flattened these into a single comma-joined string (`Categories: Science Fiction, Fantasy, Adventure`), which Obsidian stored as **one** long value. If you prefer the old flat string for a single field, add a modifier to that variable (e.g. `Categories: {{categories:raw}}`).

### [i] Safe YAML Values
Descriptions and titles are escaped so the frontmatter stays readable by Obsidian no matter what the providers return:

- Multi-paragraph descriptions keep their blank lines (the value is written as a quoted scalar with `\n` escapes rather than a raw line break, which would invalidate the block).
- Values that would otherwise change meaning are quoted automatically — a title starting with `-`, containing ` #`, or holding a `: ` sequence.
- Year-only or numeric fields such as page counts and ISBNs stay **strings**, never YAML numbers.

### [!] Mandatory Tag Syntax
When using the `{{tags}}` variable in YAML, it must be wrapped in quotes to remain valid during the transformation process:
`tags: "{{tags}}"`
The plugin will automatically convert this into a proper YAML list format upon note creation.


### Available Variables
- `{{title}}`: Current edition title.
- `{{originalTitle}}`: Original work title.
- `{{author}}`: Primary author.
- `{{translator}}`: Book translator (StoryGraph/Goodreads).
- `{{description}}`: Full summary.
- `{{totalPage}}`: Page count.
- `{{publisher}}`: Publishing house.
- `{{publishDate}}`: Publication date.
- `{{isbn13}}` / `{{isbn10}}`: Industry identifiers.
- `{{asin}}`: Amazon identification number.
- `{{link}}`: Direct link to the source book page.
- `{{categories}}`: List of genres and categories.
- `{{localCoverImage}}`: Locally saved cover. In **Local** cover mode this is a `[[wikilink]]`; in **Remote** mode it is the image URL.
- `{{coverUrl}}`: Remote URL of the cover image (available regardless of cover mode).
- `{{tags}}`: Automated `author/name` and `libros/title` tags.

### Modifiers

Append `:modifier` to any variable to transform its output. Modifiers can be chained left-to-right:

- `:raw` — strip surrounding `[[ ]]` wikilink brackets, leaving the bare path.
- `:url` — URL-encode the value (spaces become `%20`), preserving `/` and `:` so it works for both vault paths and URLs.

```
Cover: "{{localCoverImage:raw:url}}"   →  Cover: "images/foo%20bar.png"
![[{{localCoverImage:raw}}|150]]       →  ![[images/foo bar.png|150]]
```

Variables without a modifier are unchanged, so existing templates keep working exactly as before.

### LibraryThing "Common Knowledge" variables

The **LibraryThing** provider exposes extra literary metadata from a book's "Common Knowledge". These are **not** in the default frontmatter template — add the ones you want to your own template (they fill in only when LibraryThing has the data, and are empty for other providers):

- `{{characters}}` — main characters (e.g. `Frederic Henry; Catherine Barkley`)
- `{{places}}` — important places
- `{{events}}` — important events
- `{{firstWords}}` — opening line(s)
- `{{lastWords}}` — closing line(s)
- `{{quotes}}` — notable epigraph/quotes
- `{{dedication}}` — dedication
- `{{blurbers}}` — blurbers
- `{{relatedMovies}}` — related film adaptations
- `{{originalLanguage}}` — original language

Example template additions:

```
Characters: "{{characters}}"
Places: "{{places}}"
First words: "{{firstWords}}"
Original language: {{originalLanguage}}
```

> Note: LibraryThing is behind Cloudflare's bot protection. The provider works only if your client can reach the site; it degrades gracefully (no results) otherwise.

---

## How to Use

### 1. Install and enable
See [Installation](#installation-and-credits). After enabling the plugin, open **Settings → Global Book Search**. Everything below can be reached from the ribbon icon (the library icon in the left sidebar) or the command palette.

### 2. Choose your template language (optional)
**Settings → Book notes → Frontmatter → Language** and pick one of the 13 templates. The textarea below shows the raw template, so you can edit it freely; **Restore default** puts the shipped version back.

For Arabic notes, choose **Arabic**. You get:

```yaml
---
العنوان: "موسم الهجرة إلى الشمال"
العنوان الأصلي: "..."
المؤلف: "الطيب صالح"
المترجم: "..."
مقدمة: ""
الوصف: "..."
عدد الصفحات: "176"
الناشر: "..."
التصنيفات:
- رواية
- أدب عربي
- أدب أفريقي
isbn 10: "..."
isbn 13: "..."
تاريخ النشر: 1966
الغلاف: ""
الرابط: ...
tags:
- الطيب_صالح
- موسم_الهجرة_إلى_الشمال
مقروء: false
---
```

### 3. Create a book note
1. Click the ribbon icon (or run **Global Book Search: Create new book note**).
2. Type a title, author, or ISBN and pick a result. With **Global Search** you get results from every configured provider at once, each tagged with its source.
3. The plugin enriches the selection from the other providers, then creates the note from your template and opens it.

### 4. Commands
Open the command palette (`Ctrl/Cmd + P`) and search for "book" / "Calibre":

| Command | What it does |
| --- | --- |
| **Create new book note** | Search the provider selected in settings, then create the note. |
| **Global Search (all sources)** | Query every configured provider at once and merge the results. |
| **Search Google Books / Goodreads / Calibre / OpenLibrary / StoryGraph / Hardcover / LibraryThing** | Search a single provider. |
| **Search Calibre (Multi-Select)** | Batch-import from a local Calibre library. |
| **Browse Calibre Library** | Browse the local library by author, series, or tag. |
| **Bulk import from ISBN list** | Paste a list of ISBNs and create a note for each. |
| **Insert the metadata** | Write the frontmatter into the note you already have open. |
| **Clear search history** | Empty the stored list of recent queries. |
| **Test Hardcover / LibraryThing connectivity** | Check that the configured API token works. |

### 5. Scan a physical book
Inside the search dialog, the barcode button opens the camera; point it at a book's EAN-13 barcode and the plugin looks the book up by ISBN. This is mainly useful on mobile.

### 6. Tune how the note looks
- **New file location** — the folder for new notes.
- **New file name** — a template such as `{{title}} - {{author}}`.
- **Content** — text appended after the frontmatter of every note (headings, prompts, reading-log scaffolding).
- **Cover mode** — `Local` downloads the cover into the vault, so `{{localCoverImage}}` becomes a `[[wikilink]]`; `Remote` keeps the image URL; `None` disables covers.
- **Author / Title tag prefix** — e.g. `escritores/` so `{{tags}}` produces `escritores/name`.

### 7. Keep the frontmatter valid
- Multi-value variables (`{{categories}}`, `{{tags}}`) become YAML lists — one `- ` entry per line. Do not wrap them in quotes if you want a list.
- To keep the old flat string for one field, use the `:raw` modifier: `Categories: {{categories:raw}}`.
- Single-value variables can be quoted or bare; both work.

---

## Duplicate Detection

To maintain vault organization, the plugin includes an automated safeguard:
- [x] **Vault Scanning**: Before creating a note, the plugin checks for existing files with a matching title or ISBN. The ISBN check accepts `isbn 10`, `isbn 13`, `isbn10`, `isbn13`, `isbn-13`, and YAML numbers, and the title check also matches the `<title> - <author>` file names the default format produces.
- [x] **Action Prompts**: If a match is found you can **Open Existing**, **Update Metadata**, **Create Anyway**, or **Cancel**.

**Open Existing** opens the note you already have. **Update Metadata** rewrites that note's properties from the freshly fetched book data while leaving properties the plugin does not manage — reading dates, ratings, your own notes — untouched. **Create Anyway** writes a second note even though one exists.

> If nothing happens when you pick **Update Metadata**, check that the duplicate is inside your configured **New file location**; notes outside that folder are ignored.


---

## Calibre Integration

To integrate with a local Calibre library, the **Calibre Content Server** must be active:
1. Enable **Sharing over the net** in Calibre Preferences.
2. Ensure the port (default 8080) is accessible.
3. [!] **Calibre Workflows**:
   - [x] **Search Calibre (Multi-Select)**: Allows batch importing via search results.
     - **Enrichment Limit**: If importing **5 or fewer books**, the plugin performs full online enrichment (multi-source).
     - **Batch Import**: If selecting **more than 5 books**, enrichment is skipped to maintain performance, using only Calibre metadata.
   - [x] **Browse Calibre Library**: Allows navigating your library by Author, Series, or Tag. This mode **always** uses local Calibre metadata exclusively to ensure instant results while browsing large collections.


---

## Mobile Optimization

The interface has been specifically hardened for the Obsidian Mobile application (iOS/Android):
- [+] **Responsive Modals**: Search inputs and result lists automatically adapt to small viewports.
- [+] **Keyboard Clearance**: Modals are positioned to remain visible while the system keyboard is active.
- [+] **Flexible Settings**: Textareas and input fields in the settings panel utilize an adaptive vertical layout on mobile devices.

---

## Installation and Credits

### [i] Installation
1. Navigate to your Obsidian vault's hidden configuration folder: `<vault>/.obsidian/plugins/`.
2. Create a new directory named `global-book-search` (the folder name must match the plugin `id` in `manifest.json`).
3. Download `main.js`, `manifest.json`, and `styles.css` from this repository (or build them — see below) and place all three in that folder.
4. Open Obsidian and enable **Global Book Search** in the Community Plugins settings.

To build from source:

```bash
pnpm install
pnpm build   # lints, type-checks, then bundles main.js
pnpm test    # 150 unit tests
```

### [i] Acknowledgments
- Original plugin by [DuckTapeKiller](https://github.com/DuckTapeKiller/global-book-search); this fork is maintained by [AhmedAlfahdi](https://github.com/AhmedAlfahdi).
- Based on the original [obsidian-book-search-plugin](https://github.com/anpigon/obsidian-book-search-plugin) by anpigon.
