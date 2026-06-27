import { Asset, Horizon, Keypair, Networks } from '@stellar/stellar-sdk';
import { env } from '@/server/config/env';

/**
 * Single source of truth for Stellar network config — the app PINS all signing
 * to this network (testnet), never the wallet's active network.
 */

const networkMap = {
  testnet: {
    passphrase: Networks.TESTNET,
    horizonUrl: 'https://horizon-testnet.stellar.org',
  },
  public: {
    passphrase: Networks.PUBLIC,
    horizonUrl: 'https://horizon.stellar.org',
  },
  futurenet: {
    passphrase: Networks.FUTURENET,
    horizonUrl: 'https://horizon-futurenet.stellar.org',
  },
} as const;

const cfg = networkMap[env.STELLAR_NETWORK];

export const NETWORK = env.STELLAR_NETWORK;
export const NETWORK_PASSPHRASE = cfg.passphrase;
export const HORIZON_URL = env.STELLAR_HORIZON_URL || cfg.horizonUrl;
export const USDC_CODE = env.USDC_ASSET_CODE;
export const USDC_ISSUER = env.USDC_ASSET_ISSUER_TESTNET;

export const server = new Horizon.Server(HORIZON_URL);

export type AssetId = 'XLM' | 'USDC';

/** Resolve an asset id to a Stellar SDK Asset (XLM = native, no trustline). */
export function resolveAsset(assetId: AssetId): Asset {
  if (assetId === 'USDC') return new Asset(USDC_CODE, USDC_ISSUER);
  return Asset.native();
}

/** Validate a G... public key. */
export function isValidPublicKey(addr: string): boolean {
  try {
    Keypair.fromPublicKey(addr);
    return true;
  } catch {
    return false;
  }
}

const explorerNet = NETWORK === 'public' ? 'public' : 'testnet';

export function txExplorerUrl(hash: string): string {
  return `https://stellar.expert/explorer/${explorerNet}/tx/${hash}`;
}

export function accountExplorerUrl(account: string): string {
  return `https://stellar.expert/explorer/${explorerNet}/account/${account}`;
}

export function contractExplorerUrl(contractId: string): string {
  return `https://stellar.expert/explorer/${explorerNet}/contract/${contractId}`;
}
