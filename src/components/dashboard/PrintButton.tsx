"use client";

import { Icon } from "@/components/ui/icons/Icon";

/** Opens the browser's print dialog for the counter sign. */
export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="glass glass-primary">
      <Icon name="print" size={22} />
      {label}
    </button>
  );
}
