import { BASE_FEE, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import { db } from '@/server/db/client';
import { contributions, spends } from '@/server/db/schema';
import { AppError } from '@/server/lib/http';
import { isValidAmount, toStroops } from '@/server/stellar/money';
import {
  isValidPublicKey,
  NETWORK_PASSPHRASE,
  resolveAsset,
  server,
} from '@/server/stellar/network';
import {
  buildContribute,
  buildSpend,
  readTrip,
  submit,
  travelFundContractId,
} from '@/server/stellar/soroban';
import { getTripRow, setUsdcEnabled } from './trip.service';

function validateAmount(raw: string): { display: string; stroops: bigint } {
  if (!isValidAmount(raw)) {
    throw new AppError('INVALID_INPUT', 'Amount must be a positive number (max 7 decimals)', 400);
  }
  const stroops = toStroops(raw);
  if (stroops > 1_000_000n * 10_000_000n) {
    throw new AppError('INVALID_INPUT', 'Amount is too large', 400);
  }
  return { display: raw.trim(), stroops };
}

async function ensureOpened(tripId: string) {
  const trip = await getTripRow(tripId);
  if (!trip.openTxHash) {
    throw new AppError('CONFLICT', 'This fund is not open on-chain yet', 409);
  }
  return trip;
}

/** Build the member-signed `contribute` invoke (member wallet -> pool contract). */
export async function buildContribution(input: {
  tripId: string;
  source: string;
  amount: string;
}): Promise<{ xdr: string; contractId: string }> {
  const trip = await ensureOpened(input.tripId);
  if (trip.status === 'closed') throw new AppError('CONFLICT', 'This fund is settled', 409);
  if (!isValidPublicKey(input.source)) {
    throw new AppError('INVALID_PUBLIC_KEY', 'INVALID_PUBLIC_KEY', 400);
  }
  const { stroops } = validateAmount(input.amount);
  const xdr = await buildContribute({
    member: input.source,
    tripUuid: trip.id,
    amount: stroops,
  });
  return { xdr, contractId: travelFundContractId };
}

/** Submit the signed contribution invoke and record it. */
export async function confirmContribution(input: {
  tripId: string;
  signedXdr: string;
  contributorWallet: string;
  contributorLabel?: string;
  amount: string;
}) {
  const trip = await getTripRow(input.tripId);
  const { display } = validateAmount(input.amount);
  const res = await submit(input.signedXdr);
  const rows = await db
    .insert(contributions)
    .values({
      tripId: trip.id,
      contributorWallet: input.contributorWallet,
      contributorLabel: (input.contributorLabel ?? '').trim().slice(0, 40),
      amount: display,
      asset: 'XLM',
      txHash: res.hash,
    })
    .returning();
  return rows[0];
}

/** Build the organiser-signed `spend` invoke (pool contract -> payee). */
export async function buildSpendTx(input: {
  tripId: string;
  organizer: string;
  description: string;
  recipient: string;
  amount: string;
}): Promise<{ xdr: string }> {
  const trip = await ensureOpened(input.tripId);
  if (!isValidPublicKey(input.organizer)) {
    throw new AppError('INVALID_PUBLIC_KEY', 'INVALID_PUBLIC_KEY', 400);
  }
  if (trip.organizerWallet && trip.organizerWallet !== input.organizer) {
    throw new AppError('FORBIDDEN', 'Only the trip organiser can spend from the pool', 403);
  }
  const description = input.description?.trim();
  if (!description || description.length < 2) {
    throw new AppError('INVALID_INPUT', 'Describe what the spend is for', 400);
  }
  if (description.length > 80) throw new AppError('INVALID_INPUT', 'Description is too long', 400);
  if (!isValidPublicKey(input.recipient)) {
    throw new AppError('INVALID_PUBLIC_KEY', 'INVALID_PUBLIC_KEY', 400);
  }
  const { stroops } = validateAmount(input.amount);

  // Guard against an obvious over-spend before asking the user to sign.
  const onchain = await readTrip(trip.id).catch(() => null);
  if (onchain && toStroops(onchain.balance) < stroops) {
    throw new AppError('CONFLICT', `Pool only holds ${onchain.balance} XLM`, 409);
  }

  const xdr = await buildSpend({
    organizer: input.organizer,
    tripUuid: trip.id,
    payee: input.recipient,
    amount: stroops,
    memoText: description,
  });
  return { xdr };
}

/** Submit the signed spend invoke and record it in the ledger mirror. */
export async function confirmSpend(input: {
  tripId: string;
  signedXdr: string;
  description: string;
  category?: string;
  recipient: string;
  amount: string;
}) {
  const trip = await getTripRow(input.tripId);
  const { display } = validateAmount(input.amount);
  const res = await submit(input.signedXdr);
  const rows = await db
    .insert(spends)
    .values({
      tripId: trip.id,
      description: input.description.trim().slice(0, 80),
      category: (input.category ?? 'general').trim().slice(0, 24) || 'general',
      kind: 'spend',
      recipient: input.recipient,
      amount: display,
      asset: 'XLM',
      txHash: res.hash,
    })
    .returning();
  return rows[0];
}

/**
 * Build a changeTrust XDR that adds a USDC trustline to the connected wallet
 * (opt-in). XLM, the pool's settlement asset, never needs this.
 */
export async function buildEnableUsdc(wallet: string): Promise<{ xdr: string }> {
  if (!isValidPublicKey(wallet)) {
    throw new AppError('INVALID_PUBLIC_KEY', 'INVALID_PUBLIC_KEY', 400);
  }
  const account = await server.loadAccount(wallet);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.changeTrust({ asset: resolveAsset('USDC') }))
    .setTimeout(180)
    .build();
  return { xdr: tx.toXDR() };
}

/** Submit the signed changeTrust and flag the fund as USDC-enabled for the UI. */
export async function confirmEnableUsdc(input: {
  tripId: string;
  signedXdr: string;
}): Promise<{ txHash: string }> {
  const tx = TransactionBuilder.fromXDR(input.signedXdr, NETWORK_PASSPHRASE);
  const res = await server.submitTransaction(tx);
  await setUsdcEnabled(input.tripId, true);
  return { txHash: res.hash };
}
