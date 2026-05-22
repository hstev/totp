import { GITHUB_REPO_URL } from "./config";

export const SITE_NAME = "TOTP Vault";

export const SEO_TITLE =
  "TOTP Vault — Browser Authenticator with Encrypted Keys";

export const SEO_DESCRIPTION =
  "Free browser-based TOTP authenticator compatible with Google Authenticator and Microsoft Authenticator. Add 2FA keys, view 6-digit codes, and encrypt your vault with a master password that is never stored.";

export const SEO_KEYWORDS = [
  "TOTP",
  "authenticator",
  "2FA",
  "two-factor authentication",
  "one-time password",
  "Google Authenticator",
  "Microsoft Authenticator",
  "otpauth",
  "encrypted vault",
  "browser authenticator",
].join(", ");

export function siteUrlFromRepo(repoUrl: string): string {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/.]+)/);
  if (!match) return "";
  const [, owner, repo] = match;
  return `https://${owner}.github.io/${repo}/`;
}

export function normalizeSiteUrl(url: string): string {
  const trimmed = url.trim();
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

export function buildSeoHead(siteUrl: string): string {
  const canonical = siteUrl ? `${siteUrl}` : "";
  const ogImage = siteUrl ? `${siteUrl}og-image.svg` : "/og-image.svg";

  const canonicalTag = canonical
    ? `    <link rel="canonical" href="${canonical}" />\n`
    : "";

  const ogUrlTag = canonical
    ? `    <meta property="og:url" content="${canonical}" />\n`
    : "";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    description: SEO_DESCRIPTION,
    applicationCategory: "SecurityApplication",
    operatingSystem: "Web browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    ...(canonical ? { url: canonical } : {}),
    codeRepository: GITHUB_REPO_URL,
  };

  return `
    <title>${SEO_TITLE}</title>
    <meta name="description" content="${SEO_DESCRIPTION}" />
    <meta name="keywords" content="${SEO_KEYWORDS}" />
    <meta name="author" content="hstev" />
    <meta name="robots" content="index, follow" />
    <meta name="theme-color" content="#0f1419" />
    <meta name="color-scheme" content="dark" />
${canonicalTag}    <link rel="icon" href="./favicon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="./favicon.svg" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:title" content="${SEO_TITLE}" />
    <meta property="og:description" content="${SEO_DESCRIPTION}" />
    <meta property="og:locale" content="en_US" />
${ogUrlTag}    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:alt" content="${SITE_NAME} — encrypted browser TOTP authenticator" />

    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${SEO_TITLE}" />
    <meta name="twitter:description" content="${SEO_DESCRIPTION}" />
    <meta name="twitter:image" content="${ogImage}" />

    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  `.trim();
}

export function buildRobotsTxt(siteUrl: string): string {
  const sitemap = siteUrl ? `Sitemap: ${siteUrl}sitemap.xml\n` : "";
  return `User-agent: *\nAllow: /\n\n${sitemap}`.trim() + "\n";
}

export function buildSitemapXml(siteUrl: string): string {
  if (!siteUrl) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>
`;
  }

  const lastmod = new Date().toISOString().slice(0, 10);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;
}
