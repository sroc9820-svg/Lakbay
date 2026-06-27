import { randomBytes } from 'node:crypto';
import { Account, Keypair, Operation, Transaction, TransactionBuilder } from '@stellar/stellar-sdk';
import { AppError } from '@/server/lib/http';
import { serverSeed } from '@/server/lib/session';
import { NETWORK_PASSPHRASE } from './network';

const HOME_DOMAIN = 'lakbay';

function serverKeypair(): Keypair {
  return Keypair.fromRawEd25519Seed(serverSeed());
}

/**
 * Build a SEP-10 style challenge transaction.
 * The challenge is signed by the server and must be co-signed by the user's wallet.
 * The network passphrase is pinned to the APP's network (testnet), regardless of the
 * wallet's currently-active network.
 */
export function buildChallenge(userPublicKey: string): { xdr: string; nonce: string } {
  const skp = serverKeypair();
  // sequence 0 — challenge transactions are never submitted.
  const serverAccount = new Account(skp.publicKey(), '0');
  const nonce = randomBytes(48).toString('base64');
  const tx = new TransactionBuilder(serverAccount, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.manageData({
        name: `${HOME_DOMAIN} auth`,
        value: nonce,
        source: userPublicKey,
      }),
    )
    .setTimeout(300)
    .build();
  tx.sign(skp);
  return { xdr: tx.toXDR(), nonce };
}

/**
 * Verify a signed challenge: the user's signature must be valid over the tx hash,
 * the embedded nonce must match what we issued, and the server signature must be present.
 */
export function verifyChallenge(
  signedXdr: string,
  userPublicKey: string,
  expectedNonce: string,
): boolean {
  let tx: Transaction;
  try {
    tx = new Transaction(signedXdr, NETWORK_PASSPHRASE);
  } catch {
    throw new AppError('INVALID_INPUT', 'Malformed challenge transaction', 400);
  }

  // The single manageData op must carry our nonce and belong to the user.
  const op = tx.operations[0];
  if (!op || op.type !== 'manageData' || op.source !== userPublicKey) {
    throw new AppError('UNAUTHORIZED', 'Challenge does not match this wallet', 401);
  }
  const value = op.value ? Buffer.from(op.value).toString('utf8') : '';
  if (value !== expectedNonce) {
    throw new AppError('UNAUTHORIZED', 'Challenge nonce mismatch', 401);
  }

  const hash = tx.hash();
  const userKp = Keypair.fromPublicKey(userPublicKey);
  const userSigned = tx.signatures.some((sig) => {
    try {
      return userKp.verify(hash, sig.signature());
    } catch {
      return false;
    }
  });
  if (!userSigned) {
    throw new AppError('UNAUTHORIZED', 'Wallet signature invalid', 401);
  }
  return true;
}
