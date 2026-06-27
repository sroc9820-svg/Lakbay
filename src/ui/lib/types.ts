export type Asset = 'XLM' | 'USDC';

export type TripPublic = {
  id: string;
  name: string;
  destination: string;
  organizerWallet: string;
  contractId: string;
  openTxHash: string;
  usdcEnabled: boolean;
  status: 'open' | 'closed';
  createdAt: string;
};

export type ContributionRow = {
  id: string;
  contributorWallet: string;
  contributorLabel: string;
  amount: string;
  asset: string;
  txHash: string;
  createdAt: string;
};

export type SpendRow = {
  id: string;
  description: string;
  category: string;
  kind: string;
  recipient: string;
  amount: string;
  asset: string;
  txHash: string;
  createdAt: string;
};

export type OnchainPool = {
  pooled: string;
  balance: string;
  spent: string;
  refunded: string;
  members: number;
  spends: number;
  status: 'Open' | 'Settled';
};

export type TripDetail = {
  trip: TripPublic;
  pool: OnchainPool;
  contributions: ContributionRow[];
  spends: SpendRow[];
  totals: { contributors: number; totalIn: string; totalOut: string };
};
