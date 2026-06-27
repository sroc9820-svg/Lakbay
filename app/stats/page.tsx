'use client';

import { Activity, ArrowDownLeft, ArrowUpRight, Plane, Users, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SiteFooter, SiteHeader } from '@/ui/components/site-header';
import { api, fmtAmount } from '@/ui/lib/api';

type Stats = {
  uniqueWallets: number;
  logins: number;
  trips: number;
  contributions: number;
  spends: number;
  volumeXlm: string;
};

const cards = [
  {
    key: 'uniqueWallets',
    label: 'Wallets connected',
    icon: Wallet,
    hint: 'distinct SEP-10 sign-ins',
  },
  { key: 'logins', label: 'Total sign-ins', icon: Activity, hint: 'verified auth sessions' },
  { key: 'trips', label: 'Trip funds', icon: Plane, hint: 'on-chain pools opened' },
  { key: 'contributions', label: 'Contributions', icon: ArrowDownLeft, hint: 'on-chain deposits' },
  { key: 'spends', label: 'Payouts', icon: ArrowUpRight, hint: 'on-chain spends from the pool' },
  {
    key: 'contributors',
    label: 'XLM pooled',
    icon: Users,
    hint: 'volume contributed',
    volume: true,
  },
] as const;

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api
      .get<Stats>('/api/stats')
      .then(setStats)
      .catch(() => setFailed(true));
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-12">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-teal/10 px-3 py-1 text-xs font-semibold text-teal">
            <Activity className="h-3.5 w-3.5" /> Live network activity
          </span>
          <h1 className="mt-4 text-3xl font-bold md:text-4xl">Lakbay in numbers</h1>
          <p className="mt-2 text-ink-soft">
            Real interaction counts straight from the database — wallet sign-ins, funds, and
            on-chain contributions and payouts. Demo and test wallets are excluded.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => {
            const value =
              'volume' in c && c.volume
                ? stats
                  ? `${fmtAmount(stats.volumeXlm)}`
                  : null
                : stats
                  ? (stats[c.key as keyof Stats] as number)
                  : null;
            return (
              <div key={c.label} className="rounded-2xl border border-line bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal/10 text-teal">
                    <c.icon className="h-5 w-5" />
                  </span>
                </div>
                {value === null && !failed ? (
                  <div className="mt-4 h-9 w-20 rounded skeleton" />
                ) : (
                  <p className="mt-4 font-display text-4xl font-extrabold text-ink">
                    {failed ? '—' : value}
                  </p>
                )}
                <p className="mt-1 text-sm font-semibold">{c.label}</p>
                <p className="text-xs text-ink-soft">{c.hint}</p>
              </div>
            );
          })}
        </div>

        {failed && (
          <p className="mt-6 text-sm text-coral">
            Could not load stats right now. Try again shortly.
          </p>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
