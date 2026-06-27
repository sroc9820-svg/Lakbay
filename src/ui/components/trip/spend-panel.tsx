'use client';

import { ArrowUpFromLine } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/ui/components/button';
import { ConnectButton } from '@/ui/components/connect-button';
import { api, explorerTx } from '@/ui/lib/api';
import { useWallet } from '@/ui/wallet/wallet-provider';

export function SpendPanel({
  tripId,
  organizerWallet,
  poolXlm,
  onDone,
}: {
  tripId: string;
  organizerWallet: string;
  poolXlm: string;
  onDone: () => void;
}) {
  const { publicKey, sign } = useWallet();
  const [description, setDescription] = useState('');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  const isOrganizer = !!publicKey && publicKey === organizerWallet;

  async function spend(e: React.FormEvent) {
    e.preventDefault();
    if (!publicKey) return;
    if (description.trim().length < 2) {
      toast.error('Describe what this spend is for');
      return;
    }
    const n = Number.parseFloat(amount);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error('Enter an amount greater than zero');
      return;
    }
    setBusy(true);
    try {
      const { xdr } = await api.post<{ xdr: string }>(`/api/trips/${tripId}/spend`, {
        description: description.trim(),
        recipient: recipient.trim(),
        amount,
      });
      const signedXdr = await sign(xdr);
      const row = await api.post<{ txHash: string }>(`/api/trips/${tripId}/spend/confirm`, {
        signedXdr,
        description: description.trim(),
        recipient: recipient.trim(),
        amount,
      });
      toast.success('Paid from the pool', {
        action: { label: 'View tx', onClick: () => window.open(explorerTx(row.txHash), '_blank') },
      });
      setDescription('');
      setRecipient('');
      setAmount('');
      onDone();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Spend failed';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-coral/15 text-coral">
            <ArrowUpFromLine className="h-5 w-5" />
          </span>
          <h2 className="font-display text-lg font-bold">Spend from the pool</h2>
        </div>
        <span className="hidden text-xs text-ink-soft sm:block">Pool holds {poolXlm} XLM</span>
      </div>

      {!publicKey ? (
        <div className="mt-4 rounded-xl border border-dashed border-line-strong bg-sand/40 p-5 text-center">
          <p className="text-sm text-ink-soft">
            Connect the organiser wallet to authorise payouts from the pool.
          </p>
          <div className="mt-3 flex justify-center">
            <ConnectButton />
          </div>
        </div>
      ) : !isOrganizer ? (
        <div className="mt-4 rounded-xl border border-dashed border-line-strong bg-sand/40 p-5 text-center text-sm text-ink-soft">
          Only the trip organiser can spend from the pool. Connect the organiser wallet to pay out.
        </div>
      ) : (
        <form onSubmit={spend} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-semibold" htmlFor="s-desc">
              What for
            </label>
            <input
              id="s-desc"
              value={description}
              maxLength={80}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Boat rental deposit"
              className="mt-1.5 w-full rounded-xl border border-line-strong bg-sand/40 px-3.5 py-2.5 text-sm outline-none focus:border-teal focus:ring-4 focus:ring-teal/15"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold" htmlFor="s-recipient">
              Pay to (Stellar address)
            </label>
            <input
              id="s-recipient"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="G…"
              className="mt-1.5 w-full rounded-xl border border-line-strong bg-sand/40 px-3.5 py-2.5 font-mono text-sm outline-none focus:border-teal focus:ring-4 focus:ring-teal/15"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold" htmlFor="s-amount">
              Amount
            </label>
            <div className="relative mt-1.5">
              <input
                id="s-amount"
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
          <Button type="submit" size="lg" variant="secondary" loading={busy} className="w-full">
            {busy ? 'Waiting for signature…' : `Pay ${amount || '0'} XLM`}
          </Button>
          <p className="text-center text-xs text-ink-soft">
            You sign the payout; the pool contract releases it on testnet.
          </p>
        </form>
      )}
    </div>
  );
}
