import { createHash } from 'node:crypto';
import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  nativeToScVal,
  rpc,
  scValToNative,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import { env } from '@/server/config/env';
import { fromStroops } from './money';
import { NETWORK_PASSPHRASE } from './network';

/**
 * Server-side client for the TravelFundPool Soroban contract.
 *
 * Pattern (no secret keys on the server): the server *builds + simulates* an
 * invoke transaction sourced from the signer (member or organizer) and returns
 * the prepared XDR; the browser signs it with Freighter; the server submits the
 * signed XDR via the Soroban RPC and polls until applied. Reads go through
 * simulation — no fee, no signature.
 */

const CONTRACT_ID = env.TRAVEL_FUND_CONTRACT_ID;
const PASSPHRASE = NETWORK_PASSPHRASE;

// Highest account sequence we have built an invoke against, per source account.
// Lets `buildInvoke` serialize rapid same-account builds so a stale RPC node
// can't hand back an already-consumed sequence (which would be txBadSeq).
const lastBuiltSeq = new Map<string, bigint>();

function server(): rpc.Server {
  return new rpc.Server(env.SOROBAN_RPC_URL, {
    allowHttp: env.SOROBAN_RPC_URL.startsWith('http://'),
  });
}

function contract(): Contract {
  return new Contract(CONTRACT_ID);
}

/** Stable 32-byte on-chain key for a Postgres trip UUID. */
export function tripIdToBytes32(tripUuid: string): Buffer {
  return createHash('sha256').update(tripUuid).digest();
}

/** 32-byte memo committing a payout description to the on-chain spend ledger. */
export function memoToBytes32(text: string): Buffer {
  return createHash('sha256').update(text).digest();
}

/** The XLM Stellar Asset Contract (SAC) — the pool's settlement token. */
export function xlmSac(): string {
  return env.XLM_SAC_CONTRACT_ID;
}

/**
 * Build + simulate + assemble an invoke tx sourced from `source`, returning
 * unsigned XDR.
 *
 * `prepareTransaction` simulates the call, so it can transiently fail right
 * after a preceding write (e.g. contributing immediately after a trip was
 * opened) when the load-balanced testnet RPC node it lands on hasn't yet seen
 * that write. We retry a few times so the second invoke isn't penalised for the
 * first one's confirmation lag, and we serialize same-account builds to dodge
 * txBadSeq.
 */
async function buildInvoke(source: string, method: string, args: xdr.ScVal[]): Promise<string> {
  const srv = server();
  let lastErr: unknown;
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const account: Account = await srv.getAccount(source);
      const seq = BigInt(account.sequenceNumber());

      // Serialize builds per source account: the load-balanced RPC can hand back
      // a stale (already-consumed) sequence right after a prior tx from the same
      // account, which would make this invoke fail with txBadSeq at submit.
      const prev = lastBuiltSeq.get(source);
      if (prev !== undefined && seq <= prev) {
        await new Promise((r) => setTimeout(r, 4000));
        continue;
      }

      const tx = new TransactionBuilder(account, {
        fee: (Number(BASE_FEE) * 100).toString(),
        networkPassphrase: PASSPHRASE,
      })
        .addOperation(contract().call(method, ...args))
        // Generous bound: the user signs in Freighter between build and submit.
        .setTimeout(300)
        .build();

      // prepareTransaction simulates, then attaches the Soroban footprint,
      // resource fees, and auth entries required to submit.
      const prepared = await srv.prepareTransaction(tx);
      lastBuiltSeq.set(source, seq);
      return prepared.toXDR();
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 4000));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Failed to prepare contract invoke');
}

/** open_trip(organizer, trip_id, token) — organizer-signed. */
export function buildOpenTrip(args: {
  organizer: string;
  tripUuid: string;
  token: string;
}): Promise<string> {
  return buildInvoke(args.organizer, 'open_trip', [
    new Address(args.organizer).toScVal(),
    xdr.ScVal.scvBytes(tripIdToBytes32(args.tripUuid)),
    new Address(args.token).toScVal(),
  ]);
}

/** contribute(member, trip_id, amount) — member-signed. */
export function buildContribute(args: {
  member: string;
  tripUuid: string;
  amount: bigint;
}): Promise<string> {
  return buildInvoke(args.member, 'contribute', [
    new Address(args.member).toScVal(),
    xdr.ScVal.scvBytes(tripIdToBytes32(args.tripUuid)),
    nativeToScVal(args.amount, { type: 'i128' }),
  ]);
}

/** spend(organizer, trip_id, payee, amount, memo) — organizer-signed. */
export function buildSpend(args: {
  organizer: string;
  tripUuid: string;
  payee: string;
  amount: bigint;
  memoText: string;
}): Promise<string> {
  return buildInvoke(args.organizer, 'spend', [
    new Address(args.organizer).toScVal(),
    xdr.ScVal.scvBytes(tripIdToBytes32(args.tripUuid)),
    new Address(args.payee).toScVal(),
    nativeToScVal(args.amount, { type: 'i128' }),
    xdr.ScVal.scvBytes(memoToBytes32(args.memoText)),
  ]);
}

/** refund(organizer, trip_id, member, amount, memo) — organizer-signed. */
export function buildRefund(args: {
  organizer: string;
  tripUuid: string;
  member: string;
  amount: bigint;
  memoText: string;
}): Promise<string> {
  return buildInvoke(args.organizer, 'refund', [
    new Address(args.organizer).toScVal(),
    xdr.ScVal.scvBytes(tripIdToBytes32(args.tripUuid)),
    new Address(args.member).toScVal(),
    nativeToScVal(args.amount, { type: 'i128' }),
    xdr.ScVal.scvBytes(memoToBytes32(args.memoText)),
  ]);
}

export interface SubmitResult {
  hash: string;
  returnValue: unknown;
  /** True if the network accepted the tx but it wasn't confirmed before the poll deadline. */
  pending: boolean;
}

/**
 * Submit a Freighter-signed invoke XDR and poll until applied.
 *
 * The tx was already validated by `prepareTransaction` (simulation) when it was
 * built, so it is well-formed and funded. We throw only when the network
 * *rejects* it (`sendTransaction` ERROR) or it *fails on-chain* (`FAILED`). The
 * public testnet RPC is load-balanced, so `getTransaction` can keep returning
 * NOT_FOUND from a lagging node well after the tx has actually landed; rather
 * than fail a genuinely-accepted transaction, we return it as `pending` and let
 * the on-chain reader reconcile state on the next poll.
 */
export async function submit(signedXdr: string): Promise<SubmitResult> {
  const srv = server();
  const tx = TransactionBuilder.fromXDR(signedXdr, PASSPHRASE);
  // Record the account sequence this tx was built against (its own sequence
  // minus one) so the next build for the same account waits until the node
  // reflects it — belt-and-braces against txBadSeq, consistent with buildInvoke.
  try {
    const t = tx as unknown as { source?: string; sequence?: string };
    if (t.source && t.sequence) {
      const builtAgainst = BigInt(t.sequence) - 1n;
      const prev = lastBuiltSeq.get(t.source);
      if (prev === undefined || builtAgainst > prev) lastBuiltSeq.set(t.source, builtAgainst);
    }
  } catch {
    /* non-fatal */
  }
  const sent = await srv.sendTransaction(tx);
  if (sent.status === 'ERROR') {
    throw new Error(`Soroban submit failed: ${JSON.stringify(sent.errorResult)}`);
  }

  let got = await srv.getTransaction(sent.hash);
  const deadline = Date.now() + 45_000;
  while (got.status === 'NOT_FOUND' && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2000));
    got = await srv.getTransaction(sent.hash);
  }

  if (got.status === 'FAILED') {
    throw new Error(`Transaction ${sent.hash} failed on-chain`);
  }

  let returnValue: unknown = null;
  try {
    returnValue =
      got.status === 'SUCCESS' && got.returnValue ? scValToNative(got.returnValue) : null;
  } catch {
    /* non-fatal */
  }
  return { hash: sent.hash, returnValue, pending: got.status !== 'SUCCESS' };
}

export interface OnchainTrip {
  pooled: string;
  balance: string;
  spent: string;
  refunded: string;
  members: number;
  spends: number;
  status: 'Open' | 'Settled';
}

/** Read a trip's live on-chain state via simulation (no fee, no signature). */
export async function readTrip(tripUuid: string): Promise<OnchainTrip | null> {
  const srv = server();
  const account = new Account(Keypair.random().publicKey(), '0');
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: PASSPHRASE,
  })
    .addOperation(contract().call('get_trip', xdr.ScVal.scvBytes(tripIdToBytes32(tripUuid))))
    .setTimeout(60)
    .build();

  const sim = await srv.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim) || !sim.result?.retval) {
    return null; // trip not opened on-chain yet
  }
  const t = scValToNative(sim.result.retval) as {
    pooled: bigint;
    balance: bigint;
    spent: bigint;
    refunded: bigint;
    members: number;
    spends: number;
    status: { tag: string } | string;
  };
  const statusTag = typeof t.status === 'string' ? t.status : t.status?.tag;
  return {
    pooled: fromStroops(BigInt(t.pooled)),
    balance: fromStroops(BigInt(t.balance)),
    spent: fromStroops(BigInt(t.spent)),
    refunded: fromStroops(BigInt(t.refunded)),
    members: Number(t.members),
    spends: Number(t.spends),
    status: statusTag === 'Settled' ? 'Settled' : 'Open',
  };
}

/** Poll until a freshly-opened trip is readable on-chain (rides out RPC lag). */
export async function waitForTripReadable(tripUuid: string, timeoutMs = 20_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const t = await readTrip(tripUuid).catch(() => null);
    if (t) return true;
    await new Promise((r) => setTimeout(r, 2500));
  }
  return false;
}

export const travelFundContractId = CONTRACT_ID;
