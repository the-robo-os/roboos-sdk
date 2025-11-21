/**
 * Main Robot Wallet class
 */

import {
  Keypair,
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  WalletStorage,
  WalletOptions,
  WalletInfo,
  X402StealthAddress,
} from "./types";
import { createStorage } from "./WalletStorage";
import { generateStealthAddress, verifyStealthAddress } from "./x402";
import { WalletError, ErrorCode } from "../utils/errors";
import { getLogger } from "../utils/logger";
import { EventEmitter } from "eventemitter3";

export interface WalletEvents {
  balanceChanged: (balance: number) => void;
  backupCreated: (backup: string) => void;
  error: (error: Error) => void;
}

export class RobotWallet extends EventEmitter<WalletEvents> {
  private keypair: Keypair | null = null;
  private storage: WalletStorage;
  private connection: Connection | null = null;
  private stealthAddress: X402StealthAddress | null = null;
  private options: WalletOptions;
  private logger = getLogger();
  private backupInterval?: NodeJS.Timeout;

  constructor(storage: WalletStorage, options: WalletOptions) {
    super();
    this.storage = storage;
    this.options = options;

    if (options.autoBackup && options.backupInterval) {
      this.startAutoBackup();
    }
  }

  /**
   * Create a new wallet
   */
  static async create(options: WalletOptions): Promise<RobotWallet> {
    const storage = createStorage(
      options.storage,
      options.path,
      options.encrypted,
      options.password
    );

    const wallet = new RobotWallet(storage, options);

    // Generate new keypair if wallet doesn't exist
    const exists = await storage.exists();
    if (!exists) {
      const keypair = Keypair.generate();
      await wallet.save(keypair);
      wallet.logger.info("New wallet created", {
        publicKey: keypair.publicKey.toBase58(),
      });
    } else {
      await wallet.load();
    }

    return wallet;
  }

  /**
   * Load wallet from storage
   */
  async load(): Promise<void> {
    try {
      const keypair = await this.storage.load(this.options.password);
      if (!keypair) {
        throw new WalletError(
          ErrorCode.WALLET_NOT_FOUND,
          "Wallet not found in storage"
        );
      }
      this.keypair = keypair;
      this.stealthAddress = generateStealthAddress(keypair);
      this.logger.info("Wallet loaded", {
        publicKey: keypair.publicKey.toBase58(),
      });
    } catch (error) {
      if (error instanceof WalletError) {
        throw error;
      }
      throw new WalletError(
        ErrorCode.WALLET_NOT_FOUND,
        `Failed to load wallet: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Save wallet to storage
   */
  async save(keypair?: Keypair): Promise<void> {
    const toSave = keypair ?? this.keypair;
    if (!toSave) {
      throw new WalletError(ErrorCode.INVALID_KEYPAIR, "No keypair to save");
    }

    try {
      await this.storage.save(
        toSave,
        this.options.encrypted,
        this.options.password
      );
      this.keypair = toSave;
      this.stealthAddress = generateStealthAddress(toSave);
      this.logger.debug("Wallet saved");
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

  /**
   * Get wallet public key
   */
  getPublicKey(): PublicKey {
    if (!this.keypair) {
      throw new WalletError(ErrorCode.INVALID_KEYPAIR, "Wallet not loaded");
    }
    return this.keypair.publicKey;
  }

  /**
   * Get wallet keypair (use with caution)
   */
  getKeypair(): Keypair {
    if (!this.keypair) {
      throw new WalletError(ErrorCode.INVALID_KEYPAIR, "Wallet not loaded");
    }
    return this.keypair;
  }

  /**
   * Get x402 stealth address
   */
  getStealthAddress(): X402StealthAddress {
    if (!this.stealthAddress) {
      throw new WalletError(ErrorCode.INVALID_KEYPAIR, "Wallet not loaded");
    }
    return this.stealthAddress;
  }

  /**
   * Get wallet balance
   */
  async getBalance(connection?: Connection): Promise<number> {
    const conn = connection ?? this.connection;
    if (!conn) {
      throw new Error(
        "Connection not set. Provide connection or set it with setConnection()"
      );
    }

    if (!this.keypair) {
      throw new WalletError(ErrorCode.INVALID_KEYPAIR, "Wallet not loaded");
    }

    try {
      const balance = await conn.getBalance(this.keypair.publicKey);
      const balanceInSOL = balance / LAMPORTS_PER_SOL;

      this.emit("balanceChanged", balanceInSOL);
      return balanceInSOL;
    } catch (error) {
      throw new WalletError(
        ErrorCode.NETWORK_ERROR,
        `Failed to get balance: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Set Solana connection
   */
  setConnection(connection: Connection): void {
    this.connection = connection;
  }

  /**
   * Get wallet info
   */
  async getInfo(): Promise<WalletInfo> {
    if (!this.keypair) {
      throw new WalletError(ErrorCode.INVALID_KEYPAIR, "Wallet not loaded");
    }

    return {
      publicKey: this.keypair.publicKey.toBase58(),
      address: this.getStealthAddress().address,
      isEncrypted: this.options.encrypted ?? false,
      createdAt: new Date(), // In production, store this in metadata
    };
  }

  /**
   * Create backup
   */
  async backup(): Promise<string> {
    if (!this.keypair) {
      throw new WalletError(ErrorCode.INVALID_KEYPAIR, "Wallet not loaded");
    }

    try {
      const backup = await this.storage.backup();
      this.emit("backupCreated", backup);
      this.logger.info("Wallet backup created");
      return backup;
    } catch (error) {
      throw new WalletError(
        ErrorCode.WALLET_ENCRYPTION_FAILED,
        `Failed to create backup: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Restore from backup
   */
  async restore(backupData: string, password?: string): Promise<void> {
    try {
      const keypair = await this.storage.restore(
        backupData,
        password ?? this.options.password
      );
      await this.save(keypair);
      this.logger.info("Wallet restored from backup");
    } catch (error) {
      throw new WalletError(
        ErrorCode.WALLET_DECRYPTION_FAILED,
        `Failed to restore wallet: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Verify stealth address ownership
   */
  verifyStealthAddress(stealthAddress: X402StealthAddress): boolean {
    if (!this.keypair) {
      return false;
    }
    return verifyStealthAddress(this.keypair, stealthAddress);
  }

  /**
   * Start automatic backup
   */
  private startAutoBackup(): void {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
    }

    this.backupInterval = setInterval(async () => {
      try {
        await this.backup();
      } catch (error) {
        this.emit(
          "error",
          error instanceof Error ? error : new Error("Backup failed")
        );
        this.logger.error(
          "Auto backup failed",
          error instanceof Error ? error : undefined
        );
      }
    }, this.options.backupInterval);
  }

  /**
   * Stop automatic backup
   */
  stopAutoBackup(): void {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = undefined;
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopAutoBackup();
    this.removeAllListeners();
  }
}
