/**
 * x402 Stealth Payment Protocol Integration
 */

import { Keypair, PublicKey } from '@solana/web3.js';
import { sha256 } from '@noble/hashes/sha256';
import { X402StealthAddress, X402Payment } from '../types';

/**
 * Generate x402 stealth address from a keypair
 */
export function generateStealthAddress(keypair: Keypair): X402StealthAddress {
  // x402 uses a dual-key system: view key and spend key
  // View key: for receiving payments (derived from public key)
  // Spend key: for spending (derived from secret key)
  
  const publicKeyBytes = keypair.publicKey.toBytes();
  const secretKeyBytes = keypair.secretKey.slice(0, 32); // First 32 bytes of secret key

  // Derive view key from public key hash
  const viewKeyHash = sha256(publicKeyBytes);
  const viewKey = new Uint8Array(viewKeyHash.slice(0, 32));

  // Derive spend key from secret key hash
  const spendKeyHash = sha256(secretKeyBytes);
  const spendKey = new Uint8Array(spendKeyHash.slice(0, 32));

  // Generate stealth address (base58 encoded combination)
  const addressBytes = new Uint8Array(64);
  addressBytes.set(viewKey, 0);
  addressBytes.set(spendKey, 32);
  
  // Use base58 encoding (simplified - in production, use proper encoding)
  const address = Buffer.from(addressBytes).toString('base64');

  return {
    viewKey,
    spendKey,
    address: `x402_${address}`,
  };
}

/**
 * Create a stealth payment
 */
export function createStealthPayment(
  stealthAddress: X402StealthAddress,
  amount: number,
  memo?: string
): X402Payment {
  return {
    stealthAddress,
    amount,
    memo,
    timestamp: new Date(),
  };
}

/**
 * Verify stealth address ownership
 */
export function verifyStealthAddress(
  keypair: Keypair,
  stealthAddress: X402StealthAddress
): boolean {
  const generated = generateStealthAddress(keypair);
  return (
    Buffer.from(generated.viewKey).equals(Buffer.from(stealthAddress.viewKey)) &&
    Buffer.from(generated.spendKey).equals(Buffer.from(stealthAddress.spendKey))
  );
}

/**
 * Derive stealth address from public key (for receiving)
 */
export function deriveStealthAddressFromPublicKey(publicKey: PublicKey): X402StealthAddress {
  const publicKeyBytes = publicKey.toBytes();
  const viewKeyHash = sha256(publicKeyBytes);
  const viewKey = new Uint8Array(viewKeyHash.slice(0, 32));
  
  // For receiving, we only need the view key
  // Spend key would be derived from the secret key when needed
  const addressBytes = new Uint8Array(64);
  addressBytes.set(viewKey, 0);
  
  const address = Buffer.from(addressBytes).toString('base64');
  
  return {
    viewKey,
    spendKey: new Uint8Array(32), // Placeholder - not needed for receiving
    address: `x402_${address}`,
  };
}

