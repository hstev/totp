import { TotpKey, type TotpKeyData } from "./TotpKey";
import { VaultCrypto, type EncryptedVault } from "./VaultCrypto";
import { VaultStorage } from "./VaultStorage";

export interface VaultPlaintext {
  keys: TotpKeyData[];
}

/**
 * In-memory collection of TOTP keys.
 * Unlocked with master password; persisted only in encrypted form.
 */
export class Vault {
  private keys: TotpKey[] = [];
  private readonly crypto = new VaultCrypto();
  private readonly storage = new VaultStorage();
  private masterPassword: string | null = null;

  isSetup(): boolean {
    return this.storage.hasVault();
  }

  isUnlocked(): boolean {
    return this.masterPassword !== null;
  }

  getKeys(): readonly TotpKey[] {
    return this.keys;
  }

  async setup(masterPassword: string): Promise<void> {
    this.keys = [];
    this.masterPassword = masterPassword;
    await this.persist();
  }

  async unlock(masterPassword: string): Promise<void> {
    const encrypted = this.storage.load();
    if (!encrypted) {
      throw new Error("No vault found");
    }

    const json = await this.crypto.decrypt(encrypted, masterPassword);
    const data = JSON.parse(json) as VaultPlaintext;
    this.keys = data.keys.map((k) => TotpKey.fromJSON(k));
    this.masterPassword = masterPassword;
  }

  lock(): void {
    this.keys = [];
    this.masterPassword = null;
  }

  async addKey(key: TotpKey): Promise<void> {
    this.requireUnlocked();
    if (this.keys.some((k) => k.id === key.id)) {
      throw new Error("Key already exists");
    }
    this.keys.push(key);
    await this.persist();
  }

  async removeKey(id: string): Promise<void> {
    this.requireUnlocked();
    this.keys = this.keys.filter((k) => k.id !== id);
    await this.persist();
  }

  async changeMasterPassword(
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const encrypted = this.storage.load();
    if (!encrypted) throw new Error("No vault found");

    await this.crypto.decrypt(encrypted, currentPassword);
    this.masterPassword = newPassword;
    await this.persist();
  }

  async destroyVault(): Promise<void> {
    this.lock();
    this.storage.clear();
  }

  private async persist(): Promise<void> {
    const password = this.masterPassword;
    if (!password) {
      throw new Error("Vault is locked");
    }

    const plaintext: VaultPlaintext = {
      keys: this.keys.map((k) => k.toJSON()),
    };

    const encrypted = await this.crypto.encrypt(
      JSON.stringify(plaintext),
      password
    );
    this.storage.save(encrypted);
  }

  private requireUnlocked(): void {
    if (!this.masterPassword) {
      throw new Error("Vault is locked");
    }
  }
}

export type { EncryptedVault };
