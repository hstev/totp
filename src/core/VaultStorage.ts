import type { EncryptedVault } from "./VaultCrypto";

const STORAGE_KEY = "totp-vault-encrypted";

/** Persists only the encrypted vault blob — never the master password. */
export class VaultStorage {
  hasVault(): boolean {
    return localStorage.getItem(STORAGE_KEY) !== null;
  }

  load(): EncryptedVault | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as EncryptedVault;
    } catch {
      return null;
    }
  }

  save(encrypted: EncryptedVault): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(encrypted));
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}
