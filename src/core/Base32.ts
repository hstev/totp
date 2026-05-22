/** RFC 4648 Base32 decoder for TOTP secrets (A–Z, 2–7, padding optional). */
export class Base32 {
  private static readonly ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

  static decode(input: string): Uint8Array {
    const normalized = input
      .toUpperCase()
      .replace(/=+$/, "")
      .replace(/[^A-Z2-7]/g, "");

    if (normalized.length === 0) {
      throw new Error("Invalid Base32 secret");
    }

    let bits = 0;
    let value = 0;
    const output: number[] = [];

    for (const char of normalized) {
      const idx = Base32.ALPHABET.indexOf(char);
      if (idx === -1) continue;

      value = (value << 5) | idx;
      bits += 5;

      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }

    return new Uint8Array(output);
  }

  static isValid(input: string): boolean {
    try {
      Base32.decode(input);
      return true;
    } catch {
      return false;
    }
  }
}
