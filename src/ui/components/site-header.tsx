import Link from 'next/link';
import { ConnectButton } from '@/ui/components/connect-button';
import { Logo } from '@/ui/components/logo';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-sand/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/trips"
            className="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
          >
            Funds
          </Link>
          <Link
            href="/stats"
            className="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
          >
            Stats
          </Link>
          <div className="ml-1 sm:ml-2">
            <ConnectButton size="sm" />
          </div>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line/70 bg-sand">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-7 text-sm text-ink-soft sm:flex-row">
        <Logo />
        <p className="text-center sm:text-right">
          Built on Stellar testnet · Pooled funds &amp; payouts are real on-chain transactions ·{' '}
          <Link href="/stats" className="font-medium text-teal hover:underline">
            See the numbers
          </Link>
        </p>
      </div>
    </footer>
  );
}
