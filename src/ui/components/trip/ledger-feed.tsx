'use client';

import { ArrowDownLeft, ArrowUpRight, ExternalLink, Radio } from 'lucide-react';
import { api, explorerTx, fmtAmount, shorten } from '@/ui/lib/api';
import type { ContributionRow, SpendRow } from '@/ui/lib/types';

type Entry = {
  id: string;
  kind: 'in' | 'out';
  title: string;
  sub: string;
  amount: string;
  asset: string;
  txHash: string;
  createdAt: string;
};

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function LedgerFeed({
  contributions,
  spends,
}: {
  contributions: ContributionRow[];
  spends: SpendRow[];
}) {
  void api;
  const entries: Entry[] = [
    ...contributions.map((c) => ({
      id: `c-${c.id}`,
      kind: 'in' as const,
      title: c.contributorLabel || shorten(c.contributorWallet, 5, 5),
      sub: `contributed · ${shorten(c.contributorWallet, 4, 4)}`,
      amount: c.amount,
      asset: c.asset,
      txHash: c.txHash,
      createdAt: c.createdAt,
    })),
    ...spends.map((s) => ({
      id: `s-${s.id}`,
      kind: 'out' as const,
      title: s.description,
      sub: `${s.kind === 'refund' ? 'refunded to' : 'paid to'} ${shorten(s.recipient, 4, 4)}`,
      amount: s.amount,
      asset: s.asset,
      txHash: s.txHash,
      createdAt: s.createdAt,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Radio className="h-5 w-5 text-teal" />
        <h2 className="font-display text-lg font-bold">Live ledger</h2>
        <span className="ml-auto text-xs text-ink-soft">{entries.length} on-chain events</span>
      </div>

      {entries.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-line-strong bg-sand/40 p-8 text-center text-sm text-ink-soft">
          Nothing here yet. The first contribution will show up the moment it settles on-chain.
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-4 py-3.5">
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                  e.kind === 'in' ? 'bg-teal/10 text-teal' : 'bg-coral/15 text-coral'
                }`}
              >
                {e.kind === 'in' ? (
                  <ArrowDownLeft className="h-4 w-4" />
                ) : (
                  <ArrowUpRight className="h-4 w-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{e.title}</p>
                <p className="truncate text-xs text-ink-soft">
                  {e.sub} · {relative(e.createdAt)}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${e.kind === 'in' ? 'text-teal' : 'text-coral'}`}>
                  {e.kind === 'in' ? '+' : '−'}
                  {fmtAmount(e.amount)} {e.asset}
                </p>
                <a
                  href={explorerTx(e.txHash)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-teal"
                >
                  tx <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
