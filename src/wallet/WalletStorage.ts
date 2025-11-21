/**
 * Wallet storage abstractions
 */

import { Keypair } from "@solana/web3.js";
import { readFile, writeFile, mkdir, access } from "fs/promises";
import { join, dirname } from "path";
import { randomBytes, createCipheriv, createDecipheriv } from "crypto";
import { WalletStorage, WalletStorageType } from "./types";
import { WalletError, ErrorCode } from "../utils/errors";
import { getLogger } from "../utils/logger";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
// TAG_LENGTH is 16 for GCM mode

class FileStorage implements WalletStorage {
  private path: string;
  private encrypted: boolean;
  private password?: string;
  private logger = getLogger();

  constructor(path: string, encrypted: boolean = true, password?: string) {
    this.path = path;
    this.encrypted = encrypted;
    this.password = password;
  }

  async save(
    keypair: Keypair,
    encrypted?: boolean,
    password?: string
  ): Promise<void> {
    const useEncryption = encrypted ?? this.encrypted;
    const usePassword = password ?? this.password;

    try {
      const keypairData = {
        publicKey: keypair.publicKey.toBase58(),
        secretKey: Array.from(keypair.secretKey),
      };

      let data: string;
      if (useEncryption && usePassword) {
        data = await this.encrypt(JSON.stringify(keypairData), usePassword);
      } else {
        data = JSON.stringify(keypairData);
      }

      // Ensure directory exists
      const dir = dirname(this.path);
      await mkdir(dir, { recursive: true });

      await writeFile(this.path, data, "utf-8");
      this.logger.debug("Wallet saved", {
        path: this.path,
        encrypted: useEncryption,
      });
    } catch (error) {
      throw new WalletError(
        ErrorCode.WALLET_ENCRYPTION_FAILED,
        `Failed to save wallet: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async load(password?: string): Promise<Keypair | null> {
    try {
      await access(this.path);
    } catch {
      return null;
    }

    try {
      const usePassword = password ?? this.password;
      const data = await readFile(this.path, "utf-8");

      let keypairData: { publicKey: string; secretKey: number[] };
      try {
        // Try to parse as JSON (unencrypted)
        keypairData = JSON.parse(data);
      } catch {
        // If parsing fails, try to decrypt
        if (!usePassword) {
          throw new WalletError(
            ErrorCode.WALLET_DECRYPTION_FAILED,
            "Wallet is encrypted but no password provided"
          );
        }
        const decrypted = await this.decrypt(data, usePassword);
        keypairData = JSON.parse(decrypted);
      }

      const secretKey = Uint8Array.from(keypairData.secretKey);
      return Keypair.fromSecretKey(secretKey);
    } catch (error) {
      if (error instanceof WalletError) {
        throw error;
      }
      throw new WalletError(
        ErrorCode.WALLET_DECRYPTION_FAILED,
        `Failed to load wallet: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async exists(): Promise<boolean> {
    try {
      await access(this.path);
      return true;
    } catch {
      return false;
    }
  }

  async delete(): Promise<void> {
    try {
      const { unlink } = await import("fs/promises");
      await unlink(this.path);
      this.logger.debug("Wallet deleted", { path: this.path });
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  async backup(): Promise<string> {
    const data = await readFile(this.path, "utf-8");
    return Buffer.from(data).toString("base64");
  }

  async restore(backupData: string, password?: string): Promise<Keypair> {
    const data = Buffer.from(backupData, "base64").toString("utf-8");
    const tempPath = join(dirname(this.path), `.temp-${Date.now()}.json`);

    try {
      await writeFile(tempPath, data, "utf-8");
      const tempStorage = new FileStorage(
        tempPath,
        this.encrypted,
        password ?? this.password
      );
      const keypair = await tempStorage.load(password);
      await tempStorage.delete();

      if (!keypair) {
        throw new WalletError(
          ErrorCode.WALLET_NOT_FOUND,
          "Failed to restore wallet from backup"
        );
      }

      return keypair;
    } catch (error) {
      // Clean up temp file
      try {
        const { unlink } = await import("fs/promises");
        await unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  private async encrypt(text: string, password: string): Promise<string> {
    const salt = randomBytes(SALT_LENGTH);
    const key = await this.deriveKey(password, salt);
    const iv = randomBytes(IV_LENGTH);

    const cipher = createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag();

    const result = {
      encrypted,
      iv: iv.toString("hex"),
      salt: salt.toString("hex"),
      tag: tag.toString("hex"),
    };

    return JSON.stringify(result);
  }

  private async decrypt(
    encryptedData: string,
    password: string
  ): Promise<string> {
    const data = JSON.parse(encryptedData);
    const salt = Buffer.from(data.salt, "hex");
    const key = await this.deriveKey(password, salt);
    const iv = Buffer.from(data.iv, "hex");
    const tag = Buffer.from(data.tag, "hex");

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(data.encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  private async deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    const { pbkdf2 } = await import("crypto/promises");
    return pbkdf2(password, salt, 100000, 32, "sha256");
  }
}

class MemoryStorage implements WalletStorage {
  private keypair: Keypair | null = null;
  private encrypted: boolean;
  private password?: string;

  constructor(_encrypted: boolean = false, _password?: string) {
    // Memory storage doesn't use encryption
  }

  async save(keypair: Keypair): Promise<void> {
    this.keypair = keypair;
  }

  async load(): Promise<Keypair | null> {
    return this.keypair;
  }

  async exists(): Promise<boolean> {
    return this.keypair !== null;
  }

  async delete(): Promise<void> {
    this.keypair = null;
  }

  async backup(): Promise<string> {
    if (!this.keypair) {
      throw new WalletError(
        ErrorCode.WALLET_NOT_FOUND,
        "No wallet in memory to backup"
      );
    }
    const data = {
      publicKey: this.keypair.publicKey.toBase58(),
      secretKey: Array.from(this.keypair.secretKey),
    };
    return Buffer.from(JSON.stringify(data)).toString("base64");
  }

  async restore(backupData: string): Promise<Keypair> {
    const data = JSON.parse(
      Buffer.from(backupData, "base64").toString("utf-8")
    );
    const secretKey = Uint8Array.from(data.secretKey);
    this.keypair = Keypair.fromSecretKey(secretKey);
    return this.keypair;
  }
}

export function createStorage(
  type: WalletStorageType,
  path?: string,
  encrypted?: boolean,
  password?: string
): WalletStorage {
  switch (type) {
    case "file":
      if (!path) {
        throw new Error("Path is required for file storage");
      }
      return new FileStorage(path, encrypted, password);
    case "memory":
      return new MemoryStorage(encrypted, password);
    case "hardware":
      throw new Error("Hardware wallet storage not yet implemented");
    default:
      throw new Error(`Unknown storage type: ${type}`);
  }
}
