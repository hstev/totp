import { GITHUB_REPO_URL } from "./config";
import { App } from "./ui/App";

function initFooter(): void {
  const link = document.getElementById("github-link") as HTMLAnchorElement | null;
  const label = document.getElementById("github-label");
  if (!link) return;

  link.href = GITHUB_REPO_URL;
  if (label) {
    label.textContent = new URL(GITHUB_REPO_URL).pathname.replace(/^\//, "");
  }
}

const root = document.getElementById("app");
if (!root) {
  throw new Error("Missing #app element");
}

initFooter();

const app = new App(root);
app.start();
