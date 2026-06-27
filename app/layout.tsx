import type { Metadata } from 'next';
import { Inter, Sora } from 'next/font/google';
import { Toaster } from 'sonner';
import { WalletProvider } from '@/ui/wallet/wallet-provider';
import './globals.css';

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  weight: ['400', '500', '600', '700', '800'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Lakbay — one pooled travel fund, spent in the open',
  description:
    'Lakbay turns a group trip into one shared, on-chain travel fund. Friends pool real XLM into a Soroban pool contract, the organiser spends straight from it, and every contribution and payout is a signed Stellar transaction anyone can verify.',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sora.variable} ${inter.variable} antialiased`}>
        <WalletProvider>{children}</WalletProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
