export interface ParsedOtpAuth {
  issuer: string;
  account: string;
  secret: string;
  algorithm: "SHA1" | "SHA256" | "SHA512";
  digits: number;
  period: number;
}

/** Parses `otpauth://totp/...` URIs from Google, Microsoft, and other apps. */
export class OtpAuthUri {
  static parse(uri: string): ParsedOtpAuth {
    let url: URL;
    try {
      url = new URL(uri.trim());
    } catch {
      throw new Error("Invalid otpauth URI");
    }

    if (url.protocol !== "otpauth:" || url.hostname !== "totp") {
      throw new Error("URI must be otpauth://totp/...");
    }

    const path = decodeURIComponent(url.pathname.slice(1));
    const issuerParam = url.searchParams.get("issuer") ?? "";
    const secret = (url.searchParams.get("secret") ?? "").replace(/\s/g, "");

    if (!secret) {
      throw new Error("Missing secret in URI");
    }

    let issuer = issuerParam;
    let account = path;

    if (path.includes(":")) {
      const [pathIssuer, ...rest] = path.split(":");
      if (!issuer) issuer = pathIssuer;
      account = rest.join(":");
    }

    const algorithm = OtpAuthUri.parseAlgorithm(
      url.searchParams.get("algorithm") ?? "SHA1"
    );
    const digits = parseInt(url.searchParams.get("digits") ?? "6", 10);
    const period = parseInt(url.searchParams.get("period") ?? "30", 10);

    if (digits < 6 || digits > 8) {
      throw new Error("Unsupported digit count");
    }
    if (period !== 30) {
      throw new Error("Only 30-second periods are supported");
    }

    return { issuer, account, secret, algorithm, digits, period };
  }

  private static parseAlgorithm(
    value: string
  ): ParsedOtpAuth["algorithm"] {
    const upper = value.toUpperCase();
    if (upper === "SHA1" || upper === "SHA256" || upper === "SHA512") {
      return upper;
    }
    throw new Error(`Unsupported algorithm: ${value}`);
  }
}
