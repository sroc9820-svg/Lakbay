'use client';

import { Check, ChevronDown, LogOut, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/ui/components/button';
import { shorten } from '@/ui/lib/api';
import { useWallet } from '@/ui/wallet/wallet-provider';

export function ConnectButton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const { publicKey, status, connect, disconnect } = useWallet();
  const [open, setOpen] = useState(false);

  if (status === 'loading') {
    return <div className="h-11 w-32 rounded-xl skeleton" aria-hidden="true" />;
  }

  if (publicKey) {
    return (
      <div className="relative">
        <Button
          variant="outline"
          size={size}
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span className="grid h-5 w-5 place-items-center rounded-full bg-teal/10 text-teal">
            <Check className="h-3 w-3" />
          </span>
          <span className="font-mono text-xs">{shorten(publicKey, 4, 4)}</span>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
        {open && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-10 cursor-default"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            />
            <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-line bg-white p-1.5 shadow-lg">
              <div className="px-3 py-2 text-xs text-ink-soft">Connected wallet</div>
              <div className="truncate px-3 pb-2 font-mono text-xs text-ink">{publicKey}</div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  void disconnect();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-sand-deep"
              >
                <LogOut className="h-4 w-4" /> Disconnect
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <Button size={size} loading={status === 'connecting'} onClick={() => void connect()}>
      <Wallet className="h-4 w-4" />
      {status === 'connecting' ? 'Connecting…' : 'Connect wallet'}
    </Button>
  );
}
