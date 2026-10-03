// Renders the frontmatter-language prompt as static HTML so its wording and
// layout can be reviewed in the isolated test vault (no Obsidian needed).
const fs = require("node:fs");
const path = require("node:path");

const REPO = "/mnt/data/projects/global-book-search-";
const OUT = path.join(REPO, "test_vault", "prompt-preview.html");

const { SCRIPT_LABELS } = { SCRIPT_LABELS: {
  Latin: "Latin", Arabic: "Arabic", Cyrillic: "Cyrillic", Greek: "Greek",
  Hebrew: "Hebrew", Han: "Chinese", Japanese: "Japanese", Hangul: "Korean",
} };

const prompt = {
  bookTitle: "موسم الهجرة إلى الشمال",
  currentTemplate: "English",
  suggestion: "Arabic",
  script: "Arabic",
};

const scriptLabel = SCRIPT_LABELS[prompt.script];
const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Frontmatter language prompt</title>
<style>
  body { background:#1e1e1e; color:#dcddde; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
         display:flex; align-items:center; justify-content:center; height:100vh; margin:0; }
  .modal { width:min(560px, 92vw); background:#262626; border:1px solid #333; border-radius:12px; padding:20px 24px; }
  h2 { margin:0 0 12px; font-size:1.15rem; }
  p { margin:0 0 10px; line-height:1.5; }
  .modal-description { color:#a8a8a8; font-size:.92rem; }
  .frontmatter-preview { margin:14px 0 18px; padding:8px 12px; border-radius:6px; background:#1e1e1e; font-size:.85rem; }
  .modal-button-container { display:flex; flex-wrap:wrap; gap:8px; justify-content:flex-end; }
  button { padding:7px 14px; border-radius:6px; border:1px solid #444; background:#333; color:#dcddde; font-size:.9rem; cursor:pointer; }
  button.mod-cta { background:#7f6df2; border-color:#7f6df2; color:#fff; }
</style></head>
<body>
  <div class="modal">
    <h2>Use a different frontmatter?</h2>
    <p>"${prompt.bookTitle}" looks like it is written in ${scriptLabel}.</p>
    <p class="modal-description">Your template uses "${prompt.currentTemplate}" keys. The "${prompt.suggestion}" template writes them in ${scriptLabel}, which may read better for this book.</p>
    <div class="frontmatter-preview"><code>${prompt.suggestion} keys — see Settings → Frontmatter → Language</code></div>
    <div class="modal-button-container">
      <button class="mod-cta">${prompt.suggestion} for this note</button>
      <button>Keep my template</button>
      <button>Use ${prompt.suggestion} for all books</button>
    </div>
  </div>
</body></html>`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html, "utf-8");
console.log("wrote", OUT);
