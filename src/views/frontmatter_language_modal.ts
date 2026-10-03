import { App, Modal } from "obsidian";
import { ScriptName, TemplateLanguage } from "@utils/book_script";

export enum FrontmatterChoice {
  /** Use the suggested template for this note only. */
  USE_FOR_NOTE = "note",
  /** Keep the saved template for this note. */
  KEEP = "keep",
  /** Make the suggested template the saved default as well. */
  USE_AS_DEFAULT = "default",
}

export interface FrontmatterPrompt {
  bookTitle: string;
  currentTemplate: string;
  suggestion: TemplateLanguage;
  script: ScriptName;
}

/** Display labels for the script that triggered the prompt. */
export const SCRIPT_LABELS: Record<ScriptName, string> = {
  Latin: "Latin",
  Arabic: "Arabic",
  Cyrillic: "Cyrillic",
  Greek: "Greek",
  Hebrew: "Hebrew",
  Han: "Chinese",
  Japanese: "Japanese",
  Hangul: "Korean",
};

/**
 * Ask whether a non-Latin book should use the matching localized frontmatter.
 *
 * Resolves to KEEP when dismissed (Esc / backdrop click), so a stray keypress
 * never changes how a note is written.
 */
export class FrontmatterLanguageModal extends Modal {
  private result: FrontmatterChoice = FrontmatterChoice.KEEP;
  private resolvePromise: ((choice: FrontmatterChoice) => void) | null = null;
  private settled = false;

  constructor(
    app: App,
    private readonly prompt: FrontmatterPrompt,
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    this.modalEl.addClass("book-search-frontmatter-modal");

    const scriptLabel = SCRIPT_LABELS[this.prompt.script] ?? this.prompt.script;

    contentEl.createEl("h2", { text: "Use a different frontmatter?" });

    contentEl.createEl("p", {
      text: `"${this.prompt.bookTitle}" looks like it is written in ${scriptLabel}.`,
    });

    contentEl.createEl("p", {
      cls: "modal-description",
      text:
        `Your template uses "${this.prompt.currentTemplate}" keys. ` +
        `The "${this.prompt.suggestion}" template writes them in ${scriptLabel}, ` +
        `which may read better for this book.`,
    });

    const preview = contentEl.createDiv({ cls: "frontmatter-preview" });
    preview.createEl("code", {
      text:
        this.prompt.suggestion === "Latin"
          ? "Title / Author / Categories"
          : `${this.prompt.suggestion} keys — see Settings → Frontmatter → Language`,
    });

    const buttons = contentEl.createDiv({ cls: "modal-button-container" });

    const suggestBtn = buttons.createEl("button", {
      text: `${this.prompt.suggestion} for this note`,
      cls: "mod-cta",
    });
    suggestBtn.addEventListener("click", () => {
      this.result = FrontmatterChoice.USE_FOR_NOTE;
      this.close();
    });

    const keepBtn = buttons.createEl("button", { text: "Keep my template" });
    keepBtn.addEventListener("click", () => {
      this.result = FrontmatterChoice.KEEP;
      this.close();
    });

    const defaultBtn = buttons.createEl("button", {
      text: `Use ${this.prompt.suggestion} for all books`,
    });
    defaultBtn.addEventListener("click", () => {
      this.result = FrontmatterChoice.USE_AS_DEFAULT;
      this.close();
    });
  }

  onClose(): void {
    this.contentEl.empty();
    if (!this.settled) {
      this.settled = true;
      this.resolvePromise?.(this.result);
    }
  }

  /** Open the modal and resolve with the user's choice. */
  async waitForChoice(): Promise<FrontmatterChoice> {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      this.open();
    });
  }
}
