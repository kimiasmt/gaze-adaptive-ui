"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

type Props = {
  value: number;
  onChange: (count: number) => void;
  minTargetSizePx?: number;
  /** Hostile baseline: single-line 32px control without hero label. */
  compact?: boolean;
};

/**
 * Custom compact dropdown — native <select> menus do not open from
 * programmatic / dwell clicks in Chrome, so head-tracking cannot use them.
 */
export function TicketCountDropdown({
  value,
  onChange,
  minTargetSizePx = 48,
  compact = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const height = compact ? Math.min(minTargetSizePx, 32) : minTargetSizePx;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className={`relative w-full ${compact ? "mb-5" : ""}`}>
      <button
        type="button"
        id="ticket_count_dropdown"
        data-hci-id="ticket_count_dropdown"
        data-hci-type="select"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between border text-left text-[#dee3ea] outline-none transition hover:border-[#a08e7a] focus-visible:border-[#f59e0b] ${
          compact
            ? "rounded border-[#534434]/60 bg-[#171c21] px-2 text-sm"
            : "rounded-xl border-[#534434]/50 bg-[#1b2025] px-4"
        }`}
        style={{ minHeight: height, height: compact ? height : undefined }}
      >
        {compact ? (
          <span>
            {value} ticket{value > 1 ? "s" : ""}
          </span>
        ) : (
          <span className="flex flex-col">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#a08e7a]">
              Ticket count
            </span>
            <span className="font-display text-base font-medium">
              {value} ticket{value > 1 ? "s" : ""}
            </span>
          </span>
        )}
        <ChevronDown
          className={`text-[#ffc174] transition ${open ? "rotate-180" : ""} ${
            compact ? "h-3.5 w-3.5" : "h-4 w-4"
          }`}
          aria-hidden
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Ticket count"
          className={`absolute left-0 right-0 top-full z-30 overflow-hidden border border-[#534434]/50 bg-[#171c21] shadow-xl ${
            compact ? "mt-1 rounded" : "mt-2 rounded-xl"
          }`}
        >
          {[1, 2, 3, 4].map((n) => {
            const selected = n === value;
            return (
              <li key={n} role="option" aria-selected={selected}>
                <button
                  type="button"
                  data-hci-id={`ticket_count_option_${n}`}
                  data-hci-type="select_option"
                  onClick={() => {
                    onChange(n);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center px-2 text-left transition ${
                    compact ? "text-sm" : "px-4 font-display text-sm"
                  } ${
                    selected
                      ? "bg-[#f59e0b]/15 text-[#ffc174]"
                      : "text-[#dee3ea] hover:bg-[#252a30]"
                  }`}
                  style={{
                    minHeight: compact ? 36 : Math.max(minTargetSizePx - 4, 44),
                  }}
                >
                  {n} ticket{n > 1 ? "s" : ""}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
