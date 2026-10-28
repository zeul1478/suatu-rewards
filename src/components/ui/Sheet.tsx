"use client";

import { Dialog } from "radix-ui";
import type { ReactNode } from "react";
import { Icon } from "./icons/Icon";

type SheetProps = {
  trigger: ReactNode;
  title: string;
  closeLabel: string;
  children: ReactNode;
};

/**
 * Bottom sheet on phones, centred panel on wider screens (Radix Dialog: focus trap, Esc, screen
 * reader semantics). Used to show legal documents without leaving the form (§4.1).
 */
export function Sheet({ trigger, title, closeLabel, children }: SheetProps) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay" />
        <Dialog.Content className="sheet-content" aria-describedby={undefined}>
          <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3">
            <Dialog.Title className="font-display text-xl font-semibold text-ink">
              {title}
            </Dialog.Title>
            <Dialog.Close className="glass h-11 w-11 shrink-0 px-0" aria-label={closeLabel}>
              <Icon name="close" size={20} />
            </Dialog.Close>
          </div>
          <div className="sheet-body">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
