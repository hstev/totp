# TOTP Vault

Browser-based TOTP authenticator compatible with **Google Authenticator**, **Microsoft Authenticator**, and other RFC 6238 apps.

## Features

- **6-digit codes** with 30-second rotation (standard TOTP)
- **Add keys** via manual entry (issuer, account, Base32 secret), `otpauth://` URI, or QR scan
- **Master password** encrypts all keys with PBKDF2 + AES-GCM
- **Password never stored** — only used in memory to unlock and re-encrypt the vault
- **OOP architecture** — `TotpKey`, `TotpGenerator`, `Vault`, `VaultCrypto`, `VaultStorage`, `App`

## Security notes

- Keys are stored **only** as an encrypted blob in `localStorage`
- Losing the master password means **permanent data loss** (by design)
- Use a strong master password; this is a local-first tool with no cloud recovery

## Development

Requires **Node 20+** (Vite 6). With [nvm](https://github.com/nvm-sh/nvm):

```bash
nvm use          # reads .nvmrc (Node 22)
npm install
npm run dev
```

Open the URL shown by Vite (typically `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

Static files are in `dist/` and can be hosted on any static file server.

## SEO

The build injects meta tags (description, Open Graph, Twitter Card), JSON-LD (`WebApplication`), `robots.txt`, and `sitemap.xml`.

For GitHub Pages (`https://hstev.github.io/totp/`), URLs are inferred from the repo automatically. For a custom domain, set the public URL before building:

```bash
VITE_SITE_URL=https://your.domain/ npm run build
```

See `.env.example`.

## Compatibility

Supports standard `otpauth://totp/` URIs with:

- Algorithm: SHA1 (default), SHA256, SHA512
- 6 digits, 30-second period

This matches the defaults used by Google and Microsoft authenticator apps.
