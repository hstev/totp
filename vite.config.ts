import { defineConfig, loadEnv, type Plugin } from "vite";
import { GITHUB_REPO_URL } from "./src/config";
import {
  buildRobotsTxt,
  buildSeoHead,
  buildSitemapXml,
  normalizeSiteUrl,
  siteUrlFromRepo,
} from "./src/seo";

function resolveSiteUrl(env: Record<string, string>): string {
  const fromEnv = env.VITE_SITE_URL?.trim();
  if (fromEnv) return normalizeSiteUrl(fromEnv);
  return siteUrlFromRepo(GITHUB_REPO_URL);
}

function seoPlugin(siteUrl: string): Plugin {
  return {
    name: "seo",
    transformIndexHtml(html) {
      return html.replace("<!-- SEO_HEAD -->", buildSeoHead(siteUrl));
    },
    generateBundle() {
      if (!siteUrl) return;

      this.emitFile({
        type: "asset",
        fileName: "robots.txt",
        source: buildRobotsTxt(siteUrl),
      });
      this.emitFile({
        type: "asset",
        fileName: "sitemap.xml",
        source: buildSitemapXml(siteUrl),
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const siteUrl = resolveSiteUrl(env);

  return {
    base: "./",
    plugins: [seoPlugin(siteUrl)],
  };
});
