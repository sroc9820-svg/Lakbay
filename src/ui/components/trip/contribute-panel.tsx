'use client';

import { ArrowDownToLine, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/ui/components/button';
import { ConnectButton } from '@/ui/components/connect-button';
import { api, explorerTx } from '@/ui/lib/api';
import { useWallet } from '@/ui/wallet/wallet-provider';

export function ContributePanel({ tripId, onDone }: { tripId: string; onDone: () => void }) {
  const { publicKey, sign } = useWallet();
  const [amount, setAmount] = useState('');
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);

  async function contribute(e: React.FormEvent) {
    e.preventDefault();
    if (!publicKey) return;
    const n = Number.parseFloat(amount);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error('Enter an amount greater than zero');
      return;
    }
    setBusy(true);
    try {
      const { xdr } = await api.post<{ xdr: string; contractId: string }>(
        `/api/trips/${tripId}/contribute`,
        { source: publicKey, amount },
      );
      const signedXdr = await sign(xdr);
      const row = await api.post<{ txHash: string }>(`/api/trips/${tripId}/contribute/confirm`, {
        signedXdr,
        contributorWallet: publicKey,
        contributorLabel: label,
        amount,
      });
      toast.success('Contribution locked in the pool contract', {
        action: {
          label: 'View tx',
          onClick: () => window.open(explorerTx(row.txHash), '_blank'),
        },
      });
      setAmount('');
      setLabel('');
      onDone();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Contribution failed';
      toast.error(
        msg.toLowerCase().includes('underfunded') || msg.toLowerCase().includes('insufficient')
          ? 'Your wallet does not have enough XLM for that amount (plus fees).'
          : msg,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-teal/10 text-teal">
          <ArrowDownToLine className="h-5 w-5" />
        </span>
        <h2 className="font-display text-lg font-bold">Add to the pool</h2>
      </div>

      {!publicKey ? (
        <div className="mt-4 rounded-xl border border-dashed border-line-strong bg-sand/40 p-5 text-center">
          <p className="text-sm text-ink-soft">Connect your wallet to contribute XLM.</p>
          <div className="mt-3 flex justify-center">
            <ConnectButton />
          </div>
        </div>
      ) : (
        <form onSubmit={contribute} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-semibold" htmlFor="c-amount">
              Amount
            </label>
            <div className="relative mt-1.5">
              <input
                id="c-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-line-strong bg-sand/40 px-3.5 py-2.5 pr-16 text-sm outline-none focus:border-teal focus:ring-4 focus:ring-teal/15"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-soft">
                XLM
              </span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold" htmlFor="c-label">
              Your label <span className="font-normal text-ink-soft">(optional)</span>
            </label>
            <input
              id="c-label"
              value={label}
              maxLength={40}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="How you show up in the ledger"
              className="mt-1.5 w-full rounded-xl border border-line-strong bg-sand/40 px-3.5 py-2.5 text-sm outline-none focus:border-teal focus:ring-4 focus:ring-teal/15"
            />
          </div>
          <Button type="submit" size="lg" loading={busy} className="w-full">
            {busy ? 'Waiting for signature…' : 'Contribute XLM'}
          </Button>
          <p className="flex items-center justify-center gap-1 text-center text-xs text-ink-soft">
            <ExternalLink className="h-3 w-3" /> Signed by your wallet · escrowed by the pool
            contract
          </p>
        </form>
      )}
    </div>
  );
}
