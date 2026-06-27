'use client';

import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  MapPin,
  Plane,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/ui/components/button';
import { SiteFooter, SiteHeader } from '@/ui/components/site-header';
import { ContributePanel } from '@/ui/components/trip/contribute-panel';
import { LedgerFeed } from '@/ui/components/trip/ledger-feed';
import { SpendPanel } from '@/ui/components/trip/spend-panel';
import { api, explorerContract, fmtAmount, shorten } from '@/ui/lib/api';
import type { TripDetail } from '@/ui/lib/types';
import { useWallet } from '@/ui/wallet/wallet-provider';

export default function TripDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { publicKey, sign } = useWallet();
  const [data, setData] = useState<TripDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enabling, setEnabling] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    api
      .get<TripDetail>(`/api/trips/${id}`)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load fund'));
  }, [id]);

  useEffect(load, [load]);

  async function enableUsdc() {
    if (!publicKey) {
      toast.error('Connect a wallet to enable USDC');
      return;
    }
    setEnabling(true);
    try {
      const { xdr } = await api.post<{ xdr: string }>(`/api/trips/${id}/enable-usdc`, {});
      const signedXdr = await sign(xdr);
      await api.post(`/api/trips/${id}/enable-usdc/confirm`, { signedXdr });
      toast.success('USDC trustline added to your wallet');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not enable USDC');
    } finally {
      setEnabling(false);
    }
  }

  function copyContract() {
    if (!data) return;
    navigator.clipboard.writeText(data.trip.contractId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (error) {
    return (
      <Shell>
        <div className="mx-auto max-w-md rounded-2xl border border-line bg-white p-10 text-center">
          <h1 className="text-xl font-bold">Fund not found</h1>
          <p className="mt-2 text-sm text-ink-soft">{error}</p>
          <Button asChild className="mt-5" variant="outline">
            <Link href="/trips">Back to funds</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  if (!data) {
    return (
      <Shell>
        <div className="space-y-5">
          <div className="h-44 w-full rounded-2xl skeleton" />
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="h-72 rounded-2xl skeleton" />
            <div className="h-72 rounded-2xl skeleton" />
          </div>
        </div>
      </Shell>
    );
  }

  const { trip, pool, totals } = data;

  return (
    <Shell>
      <Link
        href="/trips"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> All funds
      </Link>

      {/* Fund header / pool summary */}
      <section className="mt-4 overflow-hidden rounded-2xl border border-line bg-teal-deep text-white shadow-sm">
        <div className="grid gap-6 p-7 md:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="flex items-center gap-2 text-teal-bright">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">{trip.destination || 'Destination not set'}</span>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold md:text-4xl">{trip.name}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-white/10 px-3 py-1">
                {totals.contributors} contributor{totals.contributors === 1 ? '' : 's'}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1">
                {pool.status === 'Settled' ? 'settled' : 'open'}
              </span>
              <button
                type="button"
                onClick={copyContract}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-mono hover:bg-white/20"
              >
                pool {shorten(trip.contractId, 4, 4)}
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <a
                href={explorerContract(trip.contractId)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 hover:bg-white/20"
              >
                contract <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          <div className="rounded-2xl bg-white/10 p-5 backdrop-blur">
            <p className="text-xs uppercase tracking-wide text-white/60">Pool balance (on-chain)</p>
            <p className="mt-1 font-display text-4xl font-extrabold">
              {fmtAmount(pool.balance)} <span className="text-2xl text-teal-bright">XLM</span>
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-white/10 px-3 py-2">
                <p className="text-white/60">Pooled</p>
                <p className="font-bold text-teal-bright">+{fmtAmount(totals.totalIn)}</p>
              </div>
              <div className="rounded-lg bg-white/10 px-3 py-2">
                <p className="text-white/60">Spent</p>
                <p className="font-bold text-amber">−{fmtAmount(totals.totalOut)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* USDC opt-in strip (wallet-level trustline; the pool settles in XLM) */}
        {!trip.usdcEnabled && (
          <div className="flex flex-col items-start justify-between gap-3 border-t border-white/10 bg-black/10 px-7 py-4 sm:flex-row sm:items-center">
            <p className="text-sm text-white/80">
              <Wallet className="mr-1.5 inline h-4 w-4" />
              The pool settles in XLM by default — no trustline needed. Want to hold USDC too? Add a
              one-tap trustline to your wallet.
            </p>
            <Button
              size="sm"
              variant="secondary"
              loading={enabling}
              onClick={enableUsdc}
              className="shrink-0"
            >
              {enabling ? 'Enabling…' : 'Enable USDC'}
            </Button>
          </div>
        )}
      </section>

      {/* Action panels */}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <ContributePanel tripId={id} onDone={load} />
        <SpendPanel
          tripId={id}
          organizerWallet={trip.organizerWallet}
          poolXlm={fmtAmount(pool.balance)}
          onDone={load}
        />
      </div>

      {/* Ledger */}
      <div className="mt-6">
        <LedgerFeed contributions={data.contributions} spends={data.spends} />
      </div>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-ink-soft">
        <ShieldCheck className="h-3.5 w-3.5" /> Funds are escrowed by the Lakbay pool contract on
        Stellar testnet. <Plane className="h-3.5 w-3.5" /> Don&apos;t send mainnet value.
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8">{children}</main>
      <SiteFooter />
    </div>
  );
}
