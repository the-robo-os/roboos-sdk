/**
 * Wallet types and interfaces
 */

import { Keypair } from "@solana/web3.js";

export type WalletStorageType = "file" | "memory" | "hardware";

export interface WalletStorage {
  save(keypair: Keypair, encrypted?: boolean, password?: string): Promise<void>;
  load(password?: string): Promise<Keypair | null>;
  exists(): Promise<boolean>;
  delete(): Promise<void>;
  backup(): Promise<string>;
  restore(backupData: string, password?: string): Promise<Keypair>;
}

export interface WalletOptions {
  storage: WalletStorageType;
  path?: string;
  encrypted?: boolean;
  password?: string;
  autoBackup?: boolean;
  backupInterval?: number; // milliseconds
}

export interface WalletInfo {
  publicKey: string;
  address: string;
  isEncrypted: boolean;
  createdAt: Date;
  lastBackup?: Date;
}

export interface X402StealthAddress {
  viewKey: Uint8Array;
  spendKey: Uint8Array;
  address: string;
}

export interface X402Payment {
  stealthAddress: X402StealthAddress;
  amount: number;
  memo?: string;
  timestamp: Date;
}
