import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  NEXT_PUBLIC_APP_NAME: z.string().default('Lakbay'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3002'),
  NEXT_PUBLIC_STELLAR_NETWORK: z.enum(['testnet', 'public']).default('testnet'),

  DRIZZLE_DATABASE_URL: z.string().url(),

  STELLAR_NETWORK: z.enum(['testnet', 'public', 'futurenet']).default('testnet'),
  STELLAR_HORIZON_URL: z.string().url().default('https://horizon-testnet.stellar.org'),
  STELLAR_NETWORK_PASSPHRASE: z.string().default('Test SDF Network ; September 2015'),

  // Soroban RPC + the deployed TravelFundPool contract (testnet).
  SOROBAN_RPC_URL: z.string().url().default('https://soroban-testnet.stellar.org'),
  TRAVEL_FUND_CONTRACT_ID: z
    .string()
    .default('CC6YMREXBYOITKX26BTDBGQ55AGRJ6RRGEBNMI3O4V6G2ZB45ZAB5H4T'),
  NEXT_PUBLIC_TRAVEL_FUND_CONTRACT_ID: z
    .string()
    .default('CC6YMREXBYOITKX26BTDBGQ55AGRJ6RRGEBNMI3O4V6G2ZB45ZAB5H4T'),
  // Native XLM Stellar Asset Contract (SAC) on testnet — the pool's settlement token.
  XLM_SAC_CONTRACT_ID: z
    .string()
    .default('CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC'),

  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 chars'),
  SESSION_COOKIE_NAME: z.string().default('lakbay_session'),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(86400),

  USDC_ASSET_CODE: z.string().default('USDC'),
  USDC_ASSET_ISSUER_TESTNET: z
    .string()
    .default('GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'),

  DEMO_MODE: z.coerce.boolean().default(false),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
  throw new Error(`[env] Missing or invalid env vars: ${missing}`);
}

export const env = parsed.data;
