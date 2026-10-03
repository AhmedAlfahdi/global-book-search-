# Test harness

An isolated vault for checking note generation end to end, so testing never
touches a real vault.

```bash
node test/harness/create-note.cjs                 # write a sample book note
node test/harness/create-note.cjs --json          # print resolved frontmatter only
node test/harness/create-note.cjs --categories "a, b, c"
node test/harness/create-note.cjs --template path/to/template.md
```

Output lands in `test_vault/` (gitignored). `test_vault/.obsidian` is a minimal
vault config, including `types.json`, which pins `Categories` to `multitext` so
Obsidian renders it as separate values rather than one string.

The harness bundles `src/utils/note_creator.ts` with esbuild and stubs the
Obsidian runtime. It deliberately does not load `main.js`, because the barcode
dependency in the full bundle requires browser APIs.

To open the vault in Obsidian: *Open folder as vault* → `test_vault/`.
