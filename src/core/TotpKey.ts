import { TotpGenerator } from "./TotpGenerator";

export interface TotpKeyData {
  id: string;
  issuer: string;
  account: string;
  secret: string;
  algorithm: "SHA1" | "SHA256" | "SHA512";
  digits: number;
  period: number;
}

/** A single TOTP account entry in the vault. */
export class TotpKey {
  readonly id: string;
  readonly issuer: string;
  readonly account: string;
  readonly secret: string;
  readonly algorithm: "SHA1" | "SHA256" | "SHA512";
  readonly digits: number;
  readonly period: number;

  private generator: TotpGenerator | null = null;

  constructor(data: TotpKeyData) {
    this.id = data.id;
    this.issuer = data.issuer;
    this.account = data.account;
    this.secret = data.secret;
    this.algorithm = data.algorithm;
    this.digits = data.digits;
    this.period = data.period;
  }

  get label(): string {
    if (this.issuer && this.account) {
      return `${this.issuer} (${this.account})`;
    }
    return this.issuer || this.account || "Unknown";
  }

  toJSON(): TotpKeyData {
    return {
      id: this.id,
      issuer: this.issuer,
      account: this.account,
      secret: this.secret,
      algorithm: this.algorithm,
      digits: this.digits,
      period: this.period,
    };
  }

  static fromJSON(data: TotpKeyData): TotpKey {
    return new TotpKey(data);
  }

  async getCode(at?: Date): Promise<string> {
    return this.getGenerator().generate(at);
  }

  secondsRemaining(at?: Date): number {
    return this.getGenerator().secondsRemaining(at);
  }

  private getGenerator(): TotpGenerator {
    if (!this.generator) {
      this.generator = new TotpGenerator(this.secret, {
        algorithm: this.algorithm,
        digits: this.digits,
        period: this.period,
      });
    }
    return this.generator;
  }
}
