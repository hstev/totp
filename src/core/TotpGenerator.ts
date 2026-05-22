import { Base32 } from "./Base32";

export interface TotpOptions {
  algorithm?: "SHA1" | "SHA256" | "SHA512";
  digits?: number;
  period?: number;
}

/**
 * RFC 6238 TOTP — compatible with Google Authenticator, Microsoft Authenticator, etc.
 */
export class TotpGenerator {
  private readonly secretBytes: Uint8Array;
  private readonly algorithm: "SHA-1" | "SHA-256" | "SHA-512";
  private readonly digits: number;
  private readonly period: number;

  constructor(secretBase32: string, options: TotpOptions = {}) {
    this.secretBytes = Base32.decode(secretBase32);
    this.algorithm = TotpGenerator.mapAlgorithm(options.algorithm ?? "SHA1");
    this.digits = options.digits ?? 6;
    this.period = options.period ?? 30;
  }

  async generate(at: Date = new Date()): Promise<string> {
    const counter = Math.floor(at.getTime() / 1000 / this.period);
    const counterBytes = new ArrayBuffer(8);
    const view = new DataView(counterBytes);
    view.setUint32(0, 0);
    view.setUint32(4, counter);

    const key = await crypto.subtle.importKey(
      "raw",
      this.secretBytes.buffer.slice(
        this.secretBytes.byteOffset,
        this.secretBytes.byteOffset + this.secretBytes.byteLength
      ) as ArrayBuffer,
      { name: "HMAC", hash: this.algorithm },
      false,
      ["sign"]
    );

    const signature = new Uint8Array(
      await crypto.subtle.sign("HMAC", key, counterBytes)
    );

    const offset = signature[signature.length - 1] & 0x0f;
    const binary =
      ((signature[offset] & 0x7f) << 24) |
      ((signature[offset + 1] & 0xff) << 16) |
      ((signature[offset + 2] & 0xff) << 8) |
      (signature[offset + 3] & 0xff);

    const otp = binary % 10 ** this.digits;
    return otp.toString().padStart(this.digits, "0");
  }

  secondsRemaining(at: Date = new Date()): number {
    const elapsed = Math.floor(at.getTime() / 1000) % this.period;
    return this.period - elapsed;
  }

  private static mapAlgorithm(
    algo: "SHA1" | "SHA256" | "SHA512"
  ): "SHA-1" | "SHA-256" | "SHA-512" {
    switch (algo) {
      case "SHA256":
        return "SHA-256";
      case "SHA512":
        return "SHA-512";
      default:
        return "SHA-1";
    }
  }
}
