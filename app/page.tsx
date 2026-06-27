import { ArrowRight, Coins, MapPin, Plane, Receipt, ShieldCheck, Wallet } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/ui/components/button';
import { SiteFooter, SiteHeader } from '@/ui/components/site-header';

const steps = [
  {
    icon: MapPin,
    title: 'Open a fund',
    body: 'Name the trip and sign once. Lakbay opens an on-chain pool inside the Soroban travel-fund contract that escrows the money.',
  },
  {
    icon: Coins,
    title: 'Everyone chips in',
    body: 'Friends contribute XLM straight from their own wallet into the contract — each deposit a signed, on-chain invoke.',
  },
  {
    icon: Receipt,
    title: 'Spend in the open',
    body: 'The organiser releases payments from the pool contract to vendors. Every payout is an immutable on-chain ledger entry.',
  },
];

const facts = [
  {
    icon: Wallet,
    label: 'Default asset',
    value: 'XLM — no trustline, works for any funded wallet',
  },
  { icon: ShieldCheck, label: 'Custody', value: 'Soroban travel-fund contract escrows every pool' },
  { icon: Plane, label: 'Optional USDC', value: 'One tap adds a USDC trustline to your wallet' },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-teal-deep text-white">
          <div className="hero-grid absolute inset-0 opacity-60" aria-hidden="true" />
          <div
            className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-teal-bright/30 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-5 py-20 md:grid-cols-[1.05fr_0.95fr] md:py-28">
            <div className="float-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-medium tracking-wide text-teal-bright">
                <span className="h-1.5 w-1.5 rounded-full bg-amber" /> Group travel fund on Stellar
              </span>
              <h1 className="mt-6 max-w-xl text-4xl font-extrabold leading-[1.05] md:text-6xl">
                One pooled travel fund, spent in the open.
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/80">
                Stop chasing friends for their share. Lakbay escrows everyone&apos;s money in one
                on-chain pool contract, then lets the organiser spend straight from it — every unit
                of it traceable, none of it custodial guesswork.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" variant="secondary">
                  <Link href="/trips">
                    Start a trip fund <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/30 bg-white/5 text-white hover:border-white hover:text-white"
                >
                  <Link href="/trips">Browse funds</Link>
                </Button>
              </div>
              <p className="mt-4 text-sm text-white/55">
                No wallet needed to look around — connect only when you contribute or spend.
              </p>
            </div>

            {/* Boarding-pass style illustration (not real data) */}
            <div className="float-up self-center">
              <div className="ticket mx-auto max-w-sm p-6 text-ink shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-widest text-ink-soft">
                    Illustration
                  </span>
                  <span className="rounded-full bg-line px-2.5 py-1 text-xs font-semibold text-ink-soft">
                    EXAMPLE
                  </span>
                </div>
                <h3 className="mt-3 text-2xl font-bold">Your trip name here</h3>
                <p className="text-sm text-ink-soft">Destination · travellers</p>
                <div className="my-5 dotline" />
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-ink-soft">Pool balance</p>
                    <p className="font-display text-3xl font-extrabold text-teal">— XLM</p>
                  </div>
                  <Plane className="h-9 w-9 text-amber" aria-hidden="true" />
                </div>
                <div className="mt-5 space-y-2 text-sm">
                  <Row label="Contributed" value="in" tone="in" />
                  <Row label="Spent on-chain" value="out" tone="out" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-5 py-20">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold md:text-4xl">How a Lakbay fund works</h2>
            <p className="mt-3 text-ink-soft">
              Three honest steps. No middle-man wallet, no spreadsheet, no &quot;trust me, I&apos;ll
              pay you back&quot;.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.title} className="rounded-2xl border border-line bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-teal/10 text-teal">
                    <s.icon className="h-6 w-6" />
                  </span>
                  <span className="font-display text-3xl font-extrabold text-line-strong">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Facts strip */}
        <section className="border-y border-line bg-sand-deep/60">
          <div className="mx-auto grid max-w-6xl gap-px px-5 py-3 sm:grid-cols-3">
            {facts.map((f) => (
              <div key={f.label} className="flex items-start gap-3 px-2 py-5">
                <f.icon className="mt-0.5 h-5 w-5 shrink-0 text-teal" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    {f.label}
                  </p>
                  <p className="text-sm text-ink">{f.value}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-5 py-20">
          <div className="overflow-hidden rounded-3xl bg-teal-deep px-8 py-14 text-center text-white">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold md:text-4xl">
              Your next group trip, funded the honest way.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-white/75">
              Pool real funds, spend transparently, and let the ledger settle the &quot;who paid for
              what&quot; arguments.
            </p>
            <div className="mt-8">
              <Button asChild size="lg" variant="secondary">
                <Link href="/trips">
                  Create your fund <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone: 'in' | 'out' }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-soft">{label}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
          tone === 'in' ? 'bg-teal/10 text-teal' : 'bg-coral/10 text-coral'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
