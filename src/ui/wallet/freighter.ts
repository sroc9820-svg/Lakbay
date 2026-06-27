'use client';

import { getAddress, isConnected, requestAccess, signTransaction } from '@stellar/freighter-api';
import { NETWORK_PASSPHRASE } from '@/server/config/env.public';

export class WalletError extends Error {}

/** Returns true if a Freighter-compatible wallet is injected. */
export async function hasWallet(): Promise<boolean> {
  try {
    const res = await isConnected();
    return Boolean(res?.isConnected);
  } catch {
    return false;
  }
}

/** Prompt the wallet for access and return the active public key. */
export async function connectWallet(): Promise<string> {
  const access = await requestAccess();
  if (access?.error) throw new WalletError(String(access.error));
  if (access?.address) return access.address;
  const addr = await getAddress();
  if (addr?.error) throw new WalletError(String(addr.error));
  if (!addr?.address) throw new WalletError('No wallet address available');
  return addr.address;
}

/**
 * Sign a transaction XDR with the network passphrase pinned to the APP's network
 * (testnet) — NOT the wallet's currently active network.
 */
export async function signXdr(xdr: string, address: string): Promise<string> {
  const res = await signTransaction(xdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
    address,
  });
  // Freighter v6 returns { signedTxXdr }, older returns a string.
  if (typeof res === 'string') return res;
  const r = res as { signedTxXdr?: string; error?: unknown };
  if (r.error) throw new WalletError(String(r.error));
  if (!r.signedTxXdr) throw new WalletError('Wallet did not return a signed transaction');
  return r.signedTxXdr;
}
