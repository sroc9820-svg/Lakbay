import { Slot } from '@radix-ui/react-slot';
import { Loader2 } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/ui/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary:
    'bg-teal text-white shadow-sm hover:bg-teal-deep focus-visible:ring-teal/40 disabled:bg-teal/50',
  secondary: 'bg-amber text-ink hover:bg-amber-deep hover:text-white focus-visible:ring-amber/40',
  outline:
    'border border-line-strong bg-white text-ink hover:border-teal hover:text-teal focus-visible:ring-teal/30',
  ghost: 'text-ink-soft hover:bg-sand-deep hover:text-ink',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading, asChild, children, disabled, ...props },
  ref,
) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-semibold transition-colors outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-70',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {children}
        </>
      )}
    </Comp>
  );
});
