'use client';

import { ArrowRight, MapPin, Plane, Plus, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/ui/components/button';
import { ConnectButton } from '@/ui/components/connect-button';
import { SiteFooter, SiteHeader } from '@/ui/components/site-header';
import { api, shorten } from '@/ui/lib/api';
import { useWallet } from '@/ui/wallet/wallet-provider';

type Trip = {
  id: string;
  name: string;
  destination: string;
  organizerWallet: string;
  contractId: string;
  status: 'open' | 'closed';
  createdAt: string;
};

export default function TripsPage() {
  const router = useRouter();
  const { publicKey, sign } = useWallet();
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [creating, setCreating] = useState(false);

  function load() {
    api
      .get<Trip[]>('/api/trips')
      .then(setTrips)
      .catch(() => setTrips([]));
  }
  useEffect(load, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!publicKey) {
      toast.error('Connect your wallet first — you sign the on-chain open');
      return;
    }
    if (name.trim().length < 2) {
      toast.error('Give your fund a name (at least 2 characters)');
      return;
    }
    setCreating(true);
    try {
      // 1. Create the draft row + build the organiser-signed open_trip invoke.
      const { trip, xdr } = await api.post<{ trip: Trip; xdr: string }>('/api/trips', {
        name: name.trim(),
        destination: destination.trim(),
      });
      // 2. Organiser signs; 3. server submits the on-chain open.
      const signedXdr = await sign(xdr);
      await api.post(`/api/trips/${trip.id}/open/confirm`, { signedXdr });
      toast.success('Fund pool opened on-chain');
      router.push(`/trips/${trip.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open fund');
      setCreating(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* List */}
          <section>
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-3xl font-bold">Trip funds</h1>
                <p className="mt-1 text-ink-soft">
                  Every fund is custodied by the Lakbay pool contract on Stellar.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {trips === null && (
                <>
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-28 w-full rounded-2xl skeleton" />
                  ))}
                </>
              )}

              {trips?.length === 0 && (
                <div className="rounded-2xl border border-dashed border-line-strong bg-white/60 p-10 text-center">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-teal/10 text-teal">
                    <Plane className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 text-lg font-bold">No funds yet</h3>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
                    Be the first to open a trip fund. One form, one signature, and a live on-chain
                    pool is ready for the crew.
                  </p>
                </div>
              )}

              {trips?.map((t) => (
                <Link
                  key={t.id}
                  href={`/trips/${t.id}`}
                  className="ticket group flex items-center gap-5 p-5 transition-shadow hover:shadow-md"
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-teal/10 text-teal">
                    <MapPin className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-lg font-bold">{t.name}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${
                          t.status === 'open' ? 'bg-teal/10 text-teal' : 'bg-line text-ink-soft'
                        }`}
                      >
                        {t.status === 'open' ? 'open' : 'settled'}
                      </span>
                    </div>
                    <p className="truncate text-sm text-ink-soft">
                      {t.destination || 'No destination set'} · organiser{' '}
                      <span className="font-mono">{shorten(t.organizerWallet, 4, 4)}</span>
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 shrink-0 text-ink-soft transition-transform group-hover:translate-x-1 group-hover:text-teal" />
                </Link>
              ))}
            </div>
          </section>

          {/* Create */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <form
              onSubmit={create}
              className="rounded-2xl border border-line bg-white p-6 shadow-sm"
            >
              <div className="flex items-center gap-2 text-teal">
                <Sparkles className="h-5 w-5" />
                <h2 className="font-display text-lg font-bold text-ink">Open a new fund</h2>
              </div>
              <p className="mt-1 text-sm text-ink-soft">
                You sign one transaction to open the pool on-chain — you become its organiser.
              </p>

              <label className="mt-5 block text-sm font-semibold" htmlFor="name">
                Fund name
              </label>
              <input
                id="name"
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Bali crew, March"
                className="mt-1.5 w-full rounded-xl border border-line-strong bg-sand/40 px-3.5 py-2.5 text-sm outline-none focus:border-teal focus:ring-4 focus:ring-teal/15"
              />

              <label className="mt-4 block text-sm font-semibold" htmlFor="destination">
                Destination <span className="font-normal text-ink-soft">(optional)</span>
              </label>
              <input
                id="destination"
                value={destination}
                maxLength={80}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. Bali, Indonesia"
                className="mt-1.5 w-full rounded-xl border border-line-strong bg-sand/40 px-3.5 py-2.5 text-sm outline-none focus:border-teal focus:ring-4 focus:ring-teal/15"
              />

              {publicKey ? (
                <Button type="submit" size="lg" loading={creating} className="mt-5 w-full">
                  {!creating && <Plus className="h-5 w-5" />}
                  {creating ? 'Opening pool on-chain…' : 'Create fund'}
                </Button>
              ) : (
                <div className="mt-5 flex flex-col items-center gap-2">
                  <ConnectButton size="lg" />
                  <p className="text-center text-xs text-ink-soft">
                    Connect a wallet to sign the on-chain open.
                  </p>
                </div>
              )}
            </form>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
