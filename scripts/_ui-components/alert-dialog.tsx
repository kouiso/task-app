'use client';

import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import * as React from 'react';
import { buttonVariants } from '@/component/ui/button';
import { cn } from '@/lib/utils';

const AlertDialogContext = React.createContext<{ openerElement: HTMLElement | null }>({
  openerElement: null,
});

const AlertDialog = (props: AlertDialogPrimitive.AlertDialogProps) => {
  // dialog.tsx と同じ理由。制御型で open が立ち上がったレンダー時点の
  // activeElement を開き元として保持する。open=false では消さない（閉じる
  // レンダーが onCloseAutoFocus より先に走り復帰先を消すため）
  const open = props.open;
  const openerElementRef = React.useRef<HTMLElement | null>(null);
  const previousOpenRef = React.useRef<boolean | undefined>(undefined);
  if (open === true && previousOpenRef.current !== true) {
    openerElementRef.current =
      typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  }
  previousOpenRef.current = open;
  return (
    <AlertDialogContext.Provider value={{ openerElement: openerElementRef.current }}>
      <AlertDialogPrimitive.Root {...props} />
    </AlertDialogContext.Provider>
  );
};
AlertDialog.displayName = AlertDialogPrimitive.Root.displayName;

const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

const AlertDialogPortal = AlertDialogPrimitive.Portal;

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={cn(
      'fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
    ref={ref}
  />
));
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, onOpenAutoFocus, onCloseAutoFocus, ...props }, ref) => {
  // dialog.tsx と同じ理由。trigger 無しの制御型でも開いた要素へフォーカスを戻す
  const { openerElement } = React.useContext(AlertDialogContext);
  const lastFocusedElementRef = React.useRef<HTMLElement | null>(null);
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg',
          className,
        )}
        {...props}
        onOpenAutoFocus={(event) => {
          const activeElement =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
          const isActiveInsideContent =
            activeElement !== null &&
            event.currentTarget instanceof HTMLElement &&
            event.currentTarget.contains(activeElement);
          lastFocusedElementRef.current = isActiveInsideContent
            ? openerElement
            : (activeElement ?? openerElement);
          onOpenAutoFocus?.(event);
        }}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event);
          const previousElement = lastFocusedElementRef.current ?? openerElement;
          lastFocusedElementRef.current = null;
          if (event.defaultPrevented) return;
          if (!previousElement || previousElement === document.body) return;
          event.preventDefault();
          previousElement.focus();
        }}
      />
    </AlertDialogPortal>
  );
});
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;

const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-2 text-center sm:text-left', className)} {...props} />
);
AlertDialogHeader.displayName = 'AlertDialogHeader';

const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
    {...props}
  />
);
AlertDialogFooter.displayName = 'AlertDialogFooter';

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold', className)}
    {...props}
  />
));
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName;

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action ref={ref} className={cn(buttonVariants(), className)} {...props} />
));
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(buttonVariants({ variant: 'outline' }), className)}
    {...props}
  />
));
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
};
