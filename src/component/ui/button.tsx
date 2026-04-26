import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent text-sm font-medium tracking-[-0.01em] shadow-xs transition-[background-color,border-color,color,box-shadow,transform] [transition-duration:var(--duration-fast)] [transition-timing-function:var(--ease-linear-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-sm hover:bg-primary/92 hover:shadow-md active:shadow-sm',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/92 hover:shadow-md active:shadow-sm',
        outline:
          'border-input bg-background text-foreground shadow-xs hover:border-primary/20 hover:bg-accent hover:text-accent-foreground hover:shadow-sm',
        secondary:
          'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/88 hover:shadow-sm',
        ghost:
          'bg-transparent text-foreground shadow-none hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 text-sm',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-10 px-5 text-sm',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
