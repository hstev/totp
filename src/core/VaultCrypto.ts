const PBKDF2_ITERATIONS = 310_000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

export interface EncryptedVault {
  version: 1;
  salt: string;
  iv: string;
  ciphertext: string;
}

/**
 * Encrypts/decrypts vault data with a master password.
 * The password is never persisted — only used to derive keys in memory.
 */
export class VaultCrypto {
  async encrypt(
    plaintext: string,
    masterPassword: string
  ): Promise<EncryptedVault> {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const key = await this.deriveKey(masterPassword, salt);

    const encoded = new TextEncoder().encode(plaintext);
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: VaultCrypto.toArrayBuffer(iv) },
      key,
      encoded
    );

    return {
      version: 1,
      salt: VaultCrypto.bufferToBase64(salt),
      iv: VaultCrypto.bufferToBase64(iv),
      ciphertext: VaultCrypto.bufferToBase64(new Uint8Array(ciphertext)),
    };
  }

  async decrypt(
    encrypted: EncryptedVault,
    masterPassword: string
  ): Promise<string> {
    if (encrypted.version !== 1) {
      throw new Error("Unsupported vault version");
    }

    const salt = VaultCrypto.base64ToBuffer(encrypted.salt);
    const iv = VaultCrypto.base64ToBuffer(encrypted.iv);
    const ciphertext = VaultCrypto.base64ToBuffer(encrypted.ciphertext);
    const key = await this.deriveKey(masterPassword, salt);

    try {
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: VaultCrypto.toArrayBuffer(iv) },
        key,
        VaultCrypto.toArrayBuffer(ciphertext)
      );
      return new TextDecoder().decode(decrypted);
    } catch {
      throw new Error("Wrong master password or corrupted vault");
    }
  }

  private async deriveKey(
    password: string,
    salt: Uint8Array
  ): Promise<CryptoKey> {
    const baseKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt.buffer.slice(
          salt.byteOffset,
          salt.byteOffset + salt.byteLength
        ) as ArrayBuffer,
        iterations: PBKDF2_ITERATIONS,
        hash: "SHA-256",
      },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  private static toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    return bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    ) as ArrayBuffer;
  }

  private static bufferToBase64(buffer: Uint8Array): string {
    const binary = Array.from(buffer, (b) => String.fromCharCode(b)).join("");
    return btoa(binary);
  }

  private static base64ToBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
