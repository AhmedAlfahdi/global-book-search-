# Test harness

An isolated vault for checking note generation end to end, so testing never
touches a real vault.

```bash
node test/harness/create-note.cjs                     # write a sample book note
node test/harness/create-note.cjs --json              # resolved frontmatter only
node test/harness/create-note.cjs --update            # updateMetadata on a legacy note
node test/harness/create-note.cjs --categories "a, b, c"
node test/harness/create-note.cjs --title "My Book"
node test/harness/create-note.cjs --template path/to/template.md
node test/harness/create-note.cjs --legacy-build 2.0.5   # build from a PAST commit
```

## Comparing before/after

`--legacy-build <ref>` creates a git worktree for that ref and bundles
`src/utils/note_creator.ts` from it, so older behaviour can be compared against
the current code rather than guessed at:

```bash
node test/harness/create-note.cjs --legacy-build 2.0.5 --title "BEFORE (2.0.5)"
node test/harness/create-note.cjs                      --title "AFTER (current)"
```

The 2.0.5 build writes `Categories:` as one comma-joined line and emits the
description with a raw line break, which makes the frontmatter unparseable. The
current build writes a YAML list and escapes the newlines.

Output lands in `test_vault/` (gitignored). `test_vault/.obsidian` is a minimal
vault config, including `types.json`, which pins `Categories` to `multitext` so
Obsidian renders it as separate values rather than one string.

The harness bundles `src/utils/note_creator.ts` with esbuild and stubs the
Obsidian runtime. It deliberately does not load `main.js`, because the barcode
dependency in the full bundle requires browser APIs.

```bash
node test/harness/preview-prompt.cjs
```

Renders the script-aware frontmatter prompt as static HTML at
`test_vault/prompt-preview.html`, so its wording and layout can be reviewed in a
browser without launching Obsidian.

To open the vault in Obsidian: *Open folder as vault* → `test_vault/`.
