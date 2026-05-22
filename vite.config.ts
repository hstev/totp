import { defineConfig, type Plugin } from "vite";
import {
  buildRobotsTxt,
  buildSeoHead,
  buildSitemapXml,
  resolveSiteUrl,
} from "./src/seo";

function seoPlugin(): Plugin {
  const siteUrl = resolveSiteUrl();

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

export default defineConfig({
  base: "./",
  plugins: [seoPlugin()],
});
