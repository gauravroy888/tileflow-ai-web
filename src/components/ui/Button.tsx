import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-primary text-background shadow-[0_10px_20px_rgba(13,45,77,0.16)] hover:bg-primaryHover',
        destructive: 'bg-error text-background hover:bg-error/90',
        outline: 'border border-border bg-surface hover:bg-sand text-textPrimary shadow-sm',
        secondary: 'bg-sand text-primary hover:bg-stone/50',
        ghost: 'hover:bg-sand hover:text-primary',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-12 px-4 py-2 min-h-[48px]', // Touch targets minimum 48px
        sm: 'h-10 px-3 min-h-[40px]',
        lg: 'h-14 px-8 min-h-[56px]',
        icon: 'h-12 w-12 min-h-[48px] min-w-[48px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
