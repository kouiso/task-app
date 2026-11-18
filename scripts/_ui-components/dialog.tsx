'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

const DialogContext = React.createContext<{ modal: boolean; openerElement: HTMLElement | null }>({
  modal: true,
  openerElement: null,
});

const Dialog = ({ modal = true, ...props }: DialogPrimitive.DialogProps) => {
  // 制御型で Content 内の autoFocus が onOpenAutoFocus を潰しても開き元を
  // 拾えるよう、open が false→true へ変わったレンダー時点で記録する。
  // この時点ではまだ Content の DOM 効果が走っていないので安全に取れる。
  // open=false では消さない。閉じるレンダーは Content の onCloseAutoFocus より
  // 先に走り、そこで参照する復帰先を消してしまうため。次の open で上書きされる。
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
    <DialogContext.Provider value={{ modal, openerElement: openerElementRef.current }}>
      <DialogPrimitive.Root modal={modal} {...props} />
    </DialogContext.Provider>
  );
};
Dialog.displayName = DialogPrimitive.Root.displayName;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(
  (
    { className, children, onOpenAutoFocus, onCloseAutoFocus, onInteractOutside, ...props },
    ref,
  ) => {
    // DialogTrigger を使わない制御型の Dialog でも、開く直前にフォーカスしていた
    // 要素へ閉じる時に戻す。Radix の既定は triggerRef へ戻すだけで、trigger 無し
    // では復帰先がなく FocusScope 側の復帰も抑止されて body に落ちてしまう。
    // 非モーダル（modal={false}）で外部要素を操作して閉じた時は Radix 本家と
    // 同じく復帰を抑止し、移動先の外部要素にフォーカスを残す。
    const { modal: isModal, openerElement } = React.useContext(DialogContext);
    const lastFocusedElementRef = React.useRef<HTMLElement | null>(null);
    const hasInteractedOutsideRef = React.useRef(false);
    return (
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg',
            className,
          )}
          {...props}
          onOpenAutoFocus={(event) => {
            hasInteractedOutsideRef.current = false;
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
          onInteractOutside={(event) => {
            onInteractOutside?.(event);
            if (!isModal && !event.defaultPrevented) {
              hasInteractedOutsideRef.current = true;
            }
          }}
          onCloseAutoFocus={(event) => {
            onCloseAutoFocus?.(event);
            const interactedOutside = hasInteractedOutsideRef.current;
            const previousElement = lastFocusedElementRef.current ?? openerElement;
            hasInteractedOutsideRef.current = false;
            lastFocusedElementRef.current = null;
            if (event.defaultPrevented) return;
            if (!isModal && interactedOutside) {
              event.preventDefault();
              return;
            }
            if (!previousElement || previousElement === document.body) return;
            event.preventDefault();
            previousElement.focus();
          }}
        >
          {children}
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPortal>
    );
  },
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
