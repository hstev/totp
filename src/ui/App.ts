import { Html5Qrcode } from "html5-qrcode";
import { Base32 } from "../core/Base32";
import { OtpAuthUri } from "../core/OtpAuthUri";
import { TotpKey } from "../core/TotpKey";
import { Vault } from "../core/Vault";

type Screen = "setup" | "unlock" | "main";

export class App {
  private readonly vault = new Vault();
  private readonly root: HTMLElement;
  private screen: Screen = "unlock";
  private tickTimer: number | null = null;
  private qrScanner: Html5Qrcode | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  start(): void {
    this.screen = this.vault.isSetup() ? "unlock" : "setup";
    this.render();
  }

  private render(): void {
    this.stopTick();
    this.stopQrScanner();

    switch (this.screen) {
      case "setup":
        this.renderSetup();
        break;
      case "unlock":
        this.renderUnlock();
        break;
      case "main":
        this.renderMain();
        this.startTick();
        break;
    }
  }

  private renderSetup(): void {
    this.root.innerHTML = `
      <main class="panel">
        <header class="header">
          <h1>TOTP Vault</h1>
          <p class="subtitle">Create a master password to encrypt your keys locally. It is never stored.</p>
        </header>
        <form id="setup-form" class="form">
          <label>
            Master password
            <input type="password" id="setup-password" autocomplete="new-password" required minlength="8" />
          </label>
          <label>
            Confirm password
            <input type="password" id="setup-confirm" autocomplete="new-password" required minlength="8" />
          </label>
          <p id="setup-error" class="error" hidden></p>
          <button type="submit" class="btn btn-primary">Create vault</button>
        </form>
      </main>
    `;

    this.root.querySelector("#setup-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      void this.handleSetup();
    });
  }

  private async handleSetup(): Promise<void> {
    const password = this.getInputValue("setup-password");
    const confirm = this.getInputValue("setup-confirm");
    const errorEl = this.root.querySelector("#setup-error") as HTMLElement;

    if (password.length < 8) {
      this.showError(errorEl, "Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      this.showError(errorEl, "Passwords do not match");
      return;
    }

    try {
      await this.vault.setup(password);
      this.screen = "main";
      this.render();
    } catch (err) {
      this.showError(errorEl, err instanceof Error ? err.message : "Setup failed");
    }
  }

  private renderUnlock(): void {
    this.root.innerHTML = `
      <main class="panel">
        <header class="header">
          <h1>TOTP Vault</h1>
          <p class="subtitle">Enter your master password to decrypt your keys.</p>
        </header>
        <form id="unlock-form" class="form">
          <label>
            Master password
            <input type="password" id="unlock-password" autocomplete="current-password" required />
          </label>
          <p id="unlock-error" class="error" hidden></p>
          <button type="submit" class="btn btn-primary">Unlock</button>
        </form>
        <button type="button" id="reset-vault" class="btn btn-ghost btn-danger-text">Delete vault and start over</button>
      </main>
    `;

    this.root.querySelector("#unlock-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      void this.handleUnlock();
    });

    this.root.querySelector("#reset-vault")?.addEventListener("click", () => {
      if (
        confirm(
          "This permanently deletes all stored keys. You cannot recover them without a backup."
        )
      ) {
        void this.vault.destroyVault();
        this.screen = "setup";
        this.render();
      }
    });
  }

  private async handleUnlock(): Promise<void> {
    const password = this.getInputValue("unlock-password");
    const errorEl = this.root.querySelector("#unlock-error") as HTMLElement;

    try {
      await this.vault.unlock(password);
      this.screen = "main";
      this.render();
    } catch (err) {
      this.showError(
        errorEl,
        err instanceof Error ? err.message : "Unlock failed"
      );
    }
  }

  private renderMain(): void {
    const keys = this.vault.getKeys();

    this.root.innerHTML = `
      <main class="main-view">
        <header class="toolbar">
          <h1>Authenticator</h1>
          <div class="toolbar-actions">
            <button type="button" id="btn-add" class="btn btn-primary">Add key</button>
            <button type="button" id="btn-lock" class="btn btn-ghost">Lock</button>
          </div>
        </header>
        <section id="keys-list" class="keys-list">
          ${
            keys.length === 0
              ? '<p class="empty">No keys yet. Add one from a QR code or manual entry.</p>'
              : keys.map((k) => this.keyCardHtml(k.id, k.label)).join("")
          }
        </section>
      </main>
      <dialog id="add-dialog" class="dialog">
        <form id="add-form" method="dialog" class="dialog-body">
          <h2>Add TOTP key</h2>
          <div class="tabs">
            <button type="button" class="tab active" data-tab="manual">Manual</button>
            <button type="button" class="tab" data-tab="qr">Scan QR</button>
            <button type="button" class="tab" data-tab="uri">URI</button>
          </div>
          <div id="tab-manual" class="tab-panel">
            <label>Issuer <input type="text" id="add-issuer" placeholder="Google" /></label>
            <label>Account <input type="text" id="add-account" placeholder="you@email.com" /></label>
            <label>Secret (Base32) <input type="text" id="add-secret" placeholder="JBSWY3DPEHPK3PXP" required autocomplete="off" spellcheck="false" /></label>
          </div>
          <div id="tab-qr" class="tab-panel" hidden>
            <div id="qr-reader" class="qr-reader"></div>
            <p class="hint">Point your camera at the authenticator QR code.</p>
          </div>
          <div id="tab-uri" class="tab-panel" hidden>
            <label>otpauth URI
              <textarea id="add-uri" rows="3" placeholder="otpauth://totp/..."></textarea>
            </label>
          </div>
          <p id="add-error" class="error" hidden></p>
          <div class="dialog-actions">
            <button type="button" id="add-cancel" class="btn btn-ghost">Cancel</button>
            <button type="submit" class="btn btn-primary">Save</button>
          </div>
        </form>
      </dialog>
    `;

    void this.refreshCodes();

    this.root.querySelector("#btn-lock")?.addEventListener("click", () => {
      this.vault.lock();
      this.screen = "unlock";
      this.render();
    });

    this.root.querySelector("#btn-add")?.addEventListener("click", () => {
      this.openAddDialog();
    });

    this.root.querySelector("#add-cancel")?.addEventListener("click", () => {
      this.closeAddDialog();
    });

    this.root.querySelector("#add-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      void this.handleAddKey();
    });

    this.root.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const name = (tab as HTMLElement).dataset.tab!;
        this.switchAddTab(name);
      });
    });

    this.root.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = (btn as HTMLElement).dataset.remove!;
        void this.removeKey(id);
      });
    });
  }

  private keyCardHtml(id: string, label: string): string {
    return `
      <article class="key-card" data-key-id="${id}">
        <div class="key-card-header">
          <h2 class="key-label">${this.escapeHtml(label)}</h2>
          <button type="button" class="btn-icon" data-remove="${id}" title="Remove" aria-label="Remove key">×</button>
        </div>
        <p class="otp-code" data-otp="${id}">------</p>
        <div class="progress-wrap">
          <div class="progress-bar" data-progress="${id}"></div>
        </div>
        <span class="countdown" data-countdown="${id}">30s</span>
      </article>
    `;
  }

  private async refreshCodes(): Promise<void> {
    const now = new Date();
    for (const key of this.vault.getKeys()) {
      const code = await key.getCode(now);
      const remaining = key.secondsRemaining(now);
      const period = key.period;
      const pct = ((period - remaining) / period) * 100;

      const otpEl = this.root.querySelector(`[data-otp="${key.id}"]`);
      const progressEl = this.root.querySelector(
        `[data-progress="${key.id}"]`
      ) as HTMLElement | null;
      const countdownEl = this.root.querySelector(
        `[data-countdown="${key.id}"]`
      );

      if (otpEl) otpEl.textContent = this.formatCode(code);
      if (progressEl) progressEl.style.width = `${pct}%`;
      if (countdownEl) countdownEl.textContent = `${remaining}s`;
    }
  }

  private formatCode(code: string): string {
    if (code.length === 6) {
      return `${code.slice(0, 3)} ${code.slice(3)}`;
    }
    return code;
  }

  private startTick(): void {
    void this.refreshCodes();
    this.tickTimer = window.setInterval(() => void this.refreshCodes(), 1000);
  }

  private stopTick(): void {
    if (this.tickTimer !== null) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  private openAddDialog(): void {
    const dialog = this.root.querySelector("#add-dialog") as HTMLDialogElement;
    dialog.showModal();
    this.switchAddTab("manual");
  }

  private closeAddDialog(): void {
    this.stopQrScanner();
    const dialog = this.root.querySelector("#add-dialog") as HTMLDialogElement;
    dialog.close();
  }

  private switchAddTab(name: string): void {
    this.stopQrScanner();

    this.root.querySelectorAll(".tab").forEach((t) => {
      t.classList.toggle("active", (t as HTMLElement).dataset.tab === name);
    });

    const panels = ["manual", "qr", "uri"] as const;
    for (const p of panels) {
      const el = this.root.querySelector(`#tab-${p}`) as HTMLElement;
      el.hidden = p !== name;
    }

    if (name === "qr") {
      void this.startQrScanner();
    }
  }

  private async startQrScanner(): Promise<void> {
    const containerId = "qr-reader";
    const el = document.getElementById(containerId);
    if (!el) return;

    this.qrScanner = new Html5Qrcode(containerId);
    try {
      await this.qrScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decoded) => {
          if (decoded.startsWith("otpauth://")) {
            this.setInputValue("add-uri", decoded);
            this.switchAddTab("uri");
            void this.handleAddKey();
          }
        },
        () => {}
      );
    } catch {
      const errorEl = this.root.querySelector("#add-error") as HTMLElement;
      this.showError(errorEl, "Camera access denied or unavailable");
    }
  }

  private stopQrScanner(): void {
    if (this.qrScanner) {
      void this.qrScanner.stop().catch(() => {});
      this.qrScanner.clear();
      this.qrScanner = null;
    }
  }

  private async handleAddKey(): Promise<void> {
    const errorEl = this.root.querySelector("#add-error") as HTMLElement;
    errorEl.hidden = true;

    try {
      const key = this.parseAddForm();
      await this.vault.addKey(key);
      this.closeAddDialog();
      this.render();
    } catch (err) {
      this.showError(
        errorEl,
        err instanceof Error ? err.message : "Could not add key"
      );
    }
  }

  private parseAddForm(): TotpKey {
    const uri = this.getInputValue("add-uri").trim();
    if (uri) {
      return this.keyFromUri(uri);
    }

    const issuer = this.getInputValue("add-issuer").trim();
    const account = this.getInputValue("add-account").trim();
    const secret = this.getInputValue("add-secret").trim().replace(/\s/g, "");

    if (!secret) throw new Error("Secret is required");
    if (!Base32.isValid(secret)) throw new Error("Invalid Base32 secret");

    return new TotpKey({
      id: crypto.randomUUID(),
      issuer,
      account,
      secret,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
    });
  }

  private keyFromUri(uri: string): TotpKey {
    const parsed = OtpAuthUri.parse(uri);
    if (!Base32.isValid(parsed.secret)) {
      throw new Error("Invalid secret in URI");
    }

    return new TotpKey({
      id: crypto.randomUUID(),
      issuer: parsed.issuer,
      account: parsed.account,
      secret: parsed.secret,
      algorithm: parsed.algorithm,
      digits: parsed.digits,
      period: parsed.period,
    });
  }

  private async removeKey(id: string): Promise<void> {
    if (!confirm("Remove this key from your vault?")) return;
    await this.vault.removeKey(id);
    this.render();
  }

  private getInputValue(id: string): string {
    const el = this.root.querySelector(`#${id}`) as HTMLInputElement | null;
    return el?.value ?? "";
  }

  private setInputValue(id: string, value: string): void {
    const el = this.root.querySelector(`#${id}`) as HTMLInputElement | null;
    if (el) el.value = value;
  }

  private showError(el: HTMLElement, message: string): void {
    el.textContent = message;
    el.hidden = false;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}
