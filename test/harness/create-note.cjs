#!/usr/bin/env node
/**
 * Isolated integration harness.
 *
 * Loads the BUILT plugin bundle (`main.js`) with a stubbed Obsidian runtime and
 * writes a real book note into ./test_vault, so note generation can be checked
 * end to end without touching a personal vault.
 *
 *   node test/harness/create-note.cjs                        # default sample book
 *   node test/harness/create-note.cjs --template <file>      # custom frontmatter template
 *   node test/harness/create-note.cjs --categories "a, b, c"
 *   node test/harness/create-note.cjs --json                 # print resolved frontmatter
 *
 * The template defaults to the vault's saved settings only if you pass
 * --from-settings; otherwise it uses test/harness/templates/default.md.
 */
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");

const REPO = path.resolve(__dirname, "..", "..");
const VAULT = path.join(REPO, "test_vault");
const BOOKS_DIR = "Books";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith("--") ? next : true;
}

// ── Stubbed Obsidian runtime ───────────────────────────────────────────────
const noop = () => {};
class App {}
class TFile {
  constructor(p) {
    this.path = p;
    this.basename = path.basename(p).replace(/\.md$/, "");
  }
}
class Notice {}
class Plugin {
  constructor(app) {
    this.app = app;
  }
}
class PluginSettingTab {}
class Modal {}
class Setting {}
class Menu {}
class Component {}
class SecretComponent extends Component {}
class AbstractInputSuggest {}
const stub = new Proxy(
  {
    App,
    TFile,
    Notice,
    Plugin,
    PluginSettingTab,
    Modal,
    Setting,
    Menu,
    Component,
    SecretComponent,
    AbstractInputSuggest,
    normalizePath: (p) =>
      String(p || "")
        .replace(/\\/g, "/")
        .replace(/^\/+|\/+$/g, ""),
    requestUrl: async () => ({
      status: 200,
      text: "",
      json: {},
      arrayBuffer: new ArrayBuffer(0),
      headers: {},
    }),
    Platform: { isMobile: false, isDesktop: true },
  },
  {
    get: (target, prop) => (prop in target ? target[prop] : noop),
  },
);

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "obsidian") return stub;
  return originalLoad.call(this, request, parent, isMain);
};

// ── moment shim (only what applyTemplateTransformations touches) ───────────
const momentShim = () => ({
  format: () => "2026-01-01",
  add() {
    return this;
  },
  clone() {
    return this;
  },
  set() {
    return this;
  },
  get: () => 0,
});
momentShim.locale = () => "en";
global.window = { moment: momentShim, setTimeout, clearTimeout };

// ── Inputs ────────────────────────────────────────────────────────────────
const templateFlag = arg("template", null);
const templatePath =
  typeof templateFlag === "string"
    ? path.resolve(templateFlag)
    : path.join(__dirname, "templates", "default.md");
const templateText = fs.readFileSync(templatePath, "utf-8");

const categories =
  typeof arg("categories", null) === "string"
    ? arg("categories", "")
    : "Philosophy, Nonfiction, Classics, Spain, Self Help, Spanish Literature, Psychology, Literature, Politics, History";

const titleFlag = arg("title", null);
const book = {
  title:
    typeof titleFlag === "string" ? titleFlag : "محيي الدين بن عربي",
  author: "طه عبد الباقي سرور",
  authors: ["طه عبد الباقي سرور"],
  originalTitle: "",
  translator: "",
  publisher: "وكالة الصحافة العربية",
  publishDate: "2026",
  totalPage: 280,
  isbn10: "",
  isbn13: "",
  asin: "B0DN27CCTL",
  categories:
    typeof arg("categories", null) === "string"
      ? arg("categories", "")
      : "Nonfiction, Biography",
  description:
    "محيي الدين بن عربي، قمة شامخة في سمومها الرائع، شامخة بأسرارها وعلومها وإلهاماتها، قمة هي أعظم ما وصل إليه الخيال المُخلِّق في ميادين العلم والفلسفة والدين.\n\nقمة قد أحاطها صاحبها بالصعاب والمشاق والتهويل، حتى غدا الوصول إليها ضررًا من كفاح لا ينتهي.",
  coverUrl: "",
  link: "https://www.goodreads.com/book/show/40137843",
};

// ── Fake vault that writes into test_vault ────────────────────────────────
const written = new Map();
const vault = {
  adapter: {
    exists: async () => true,
    writeBinary: async () => {},
  },
  create: async (p, data) => {
    written.set(p, data);
    return new TFile(p);
  },
  createFolder: async () => {},
  cachedRead: async () => "",
};
const app = {
  vault,
  metadataCache: { getFirstLinkpathDest: () => null },
  fileManager: { processFrontMatter: async () => {} },
  plugins: {},
};

const settings = {
  folder: BOOKS_DIR,
  fileNameFormat: "{{title}} - {{author}}",
  frontmatter: templateText,
  content: "",
  useDefaultFrontmatter: false,
  defaultFrontmatterKeyType: "Camel Case",
  templateFile: "",
  serviceProvider: "google",
  localePreference: "default",
  apiKey: "",
  openPageOnCompletion: false,
  showCoverImageInSearch: false,
  enableCoverImageEdgeCurl: true,
  coverImagePath: "",
  coverImageMode: "none",
  coverImageFileExtension: "jpg",
  askForLocale: false,
  calibreServerUrl: "",
  calibreLibraryId: "",
  warnOnDuplicate: false,
  searchHistory: [],
  maxSearchHistory: 10,
  enableSeriesLinking: false,
  showTemplatePreview: false,
  showIndividualServiceButtons: false,
  authorTagPrefix: "authors/",
  titleTagPrefix: "",
  enableTitleTag: false,
};

// ── Run the real note-creation path ───────────────────────────────────────
// Bundles src/utils/note_creator.ts (the same source `main.js` is built from)
// rather than loading main.js, whose barcode dependency needs browser APIs.
function bundle(entry, out) {
  const esbuild = path.join(REPO, "node_modules", ".bin", "esbuild");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const { spawnSync } = require("node:child_process");
  const res = spawnSync(
    esbuild,
    [
      entry,
      "--bundle",
      "--format=cjs",
      "--target=es2018",
      "--external:obsidian",
      `--outfile=${out}`,
      "--log-level=error",
    ],
    { cwd: REPO, encoding: "utf-8" },
  );
  if (res.status !== 0) {
    console.error(res.stderr || res.stdout);
    process.exit(1);
  }
  return out;
}

function buildCreatorBundle() {
  return bundle(
    path.join(REPO, "src", "utils", "note_creator.ts"),
    path.join(REPO, "test_vault", ".harness", "note_creator.cjs"),
  );
}

/**
 * Build a bundle from a PAST commit, so legacy behaviour can be compared
 * against the current code instead of being simulated.
 *
 *   node test/harness/create-note.cjs --legacy-build 2.0.5
 */
function buildLegacyBundle(ref) {
  const cache = path.join(REPO, "test_vault", ".harness", `legacy-${ref}.cjs`);
  const worktree = path.join(REPO, "test_vault", ".harness", `wt-${ref}`);
  if (fs.existsSync(cache)) return cache;

  const { spawnSync } = require("node:child_process");
  const git = (args) => spawnSync("git", args, { cwd: REPO, encoding: "utf-8" });
  if (!fs.existsSync(worktree)) {
    const add = git(["worktree", "add", "--detach", worktree, ref]);
    if (add.status !== 0) {
      console.error(add.stderr || add.stdout);
      process.exit(1);
    }
  }
  return bundle(
    path.join(worktree, "src", "utils", "note_creator.ts"),
    cache,
  );
}

(async () => {
  const legacyRef =
    typeof arg("legacy-build", null) === "string" ? arg("legacy-build", null) : null;
  const modulePath = legacyRef
    ? buildLegacyBundle(legacyRef)
    : buildCreatorBundle();
  const { BookNoteCreator } = require(modulePath);
  if (legacyRef) console.log(`source: ${legacyRef} (pre-fix bundle)\n`);
  if (!BookNoteCreator) {
    console.error("BookNoteCreator was not exported by the bundled module.");
    process.exit(1);
  }

  const creator = new BookNoteCreator(app, settings);

  // --update: simulate Obsidian's processFrontMatter on an existing note whose
  // Categories were written by an older build (one flat comma-joined string).
  if (process.argv.includes("--update")) {
    const existing = {
      Title: "The Pocket Oracle and Art of Prudence",
      Categories:
        "Philosophy, Nonfiction, Classics, Spain, Self Help, Spanish Literature, Psychology, Literature, Politics, History",
      Read: false,
      "Date read": "",
    };
    const appWithFm = {
      ...app,
      fileManager: {
        processFrontMatter: async (_file, fn) => fn(existing),
      },
    };
    const creator2 = new BookNoteCreator(appWithFm, settings);
    console.log("BEFORE:", JSON.stringify(existing.Categories));
    await creator2.updateMetadata(
      { path: "Books/The Pocket Oracle and Art of Prudence - Baltasar Gracián.md" },
      book,
    );
    console.log("AFTER :", JSON.stringify(existing.Categories));
    console.log("Categories is a list now:", Array.isArray(existing.Categories));
    return;
  }

  if (process.argv.includes("--json")) {
    const resolved = await creator.getResolvedFrontmatter(book);
    console.log(JSON.stringify(resolved, null, 2));
    console.log(
      "\nCategories is a list:", Array.isArray(resolved.Categories) ? "YES" : "NO",
    );
    return;
  }

  const file = await creator.create(book);
  const contents = written.get(file.path);

  const outPath = path.join(VAULT, file.path);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, contents, "utf-8");

  console.log(`template : ${templatePath}`);
  console.log(`wrote    : test_vault/${file.path}\n`);
  console.log(contents.split("\n").slice(0, 24).join("\n"));
})();
