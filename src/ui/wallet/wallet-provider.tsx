'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/ui/lib/api';
import { connectWallet, signXdr } from './freighter';

type Status = 'loading' | 'disconnected' | 'connecting' | 'connected';

type WalletCtx = {
  publicKey: string | null;
  status: Status;
  connect: () => Promise<string | null>;
  disconnect: () => Promise<void>;
  sign: (xdr: string) => Promise<string>;
};

const Ctx = createContext<WalletCtx | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    api
      .get<{ publicKey: string | null }>('/api/auth/me')
      .then((d) => {
        setPublicKey(d.publicKey);
        setStatus(d.publicKey ? 'connected' : 'disconnected');
      })
      .catch(() => setStatus('disconnected'));
  }, []);

  const connect = useCallback(async () => {
    setStatus('connecting');
    try {
      const address = await connectWallet();
      const challenge = await api.post<{ xdr: string }>('/api/auth/challenge', {
        publicKey: address,
      });
      const signed = await signXdr(challenge.xdr, address);
      await api.post('/api/auth/verify', { publicKey: address, signedNonce: signed });
      setPublicKey(address);
      setStatus('connected');
      toast.success('Wallet connected');
      return address;
    } catch (err) {
      setStatus('disconnected');
      const msg = err instanceof Error ? err.message : 'Could not connect wallet';
      toast.error(
        msg.includes('not been granted') || msg.toLowerCase().includes('denied')
          ? 'Connection request was declined'
          : msg.includes('No wallet')
            ? 'No Stellar wallet found — install Freighter to connect'
            : msg,
      );
      return null;
    }
  }, []);

  const disconnect = useCallback(async () => {
    await api.post('/api/auth/logout', {}).catch(() => {});
    setPublicKey(null);
    setStatus('disconnected');
    toast.message('Wallet disconnected');
  }, []);

  const sign = useCallback(
    async (xdr: string) => {
      if (!publicKey) throw new Error('Connect a wallet first');
      return signXdr(xdr, publicKey);
    },
    [publicKey],
  );

  const value = useMemo<WalletCtx>(
    () => ({ publicKey, status, connect, disconnect, sign }),
    [publicKey, status, connect, disconnect, sign],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet(): WalletCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
