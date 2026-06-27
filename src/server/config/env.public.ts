// Public env vars (safe to expose to browser)
export const publicEnv = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? 'Lakbay',
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3002',
  network: (process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'testnet') as 'testnet' | 'public',
  contractId:
    process.env.NEXT_PUBLIC_TRAVEL_FUND_CONTRACT_ID ??
    'CC6YMREXBYOITKX26BTDBGQ55AGRJ6RRGEBNMI3O4V6G2ZB45ZAB5H4T',
};

// Network passphrase pinned to the APP's configured network (not the wallet's active net).
export const NETWORK_PASSPHRASE =
  publicEnv.network === 'public'
    ? 'Public Global Stellar Network ; September 2015'
    : 'Test SDF Network ; September 2015';
