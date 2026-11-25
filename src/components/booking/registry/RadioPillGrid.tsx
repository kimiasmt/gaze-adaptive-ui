"use client";

import { useAppStore } from "@/store/useAppStore";
import { pickBestSeats } from "@/lib/booking/seatMap";

type Props = {
  minTargetSizePx?: number;
  elementGapPx?: number;
};

export function RadioPillGrid({
  minTargetSizePx = 80,
  elementGapPx = 12,
}: Props) {
  const booking = useAppStore((s) => s.bookingState);
  const setTicketCount = useAppStore((s) => s.setTicketCount);

  const onSelect = (n: number) => {
    setTicketCount(n);
    if (booking.selectedZone) {
      const seats = pickBestSeats(booking.selectedZone, n);
      useAppStore.setState({
        bookingState: {
          ...useAppStore.getState().bookingState,
          selectedSeats: seats,
          isConfirmed: false,
        },
      });
    }
  };

  return (
    <div className="w-full rounded-xl bg-[#1b2025] p-5">
      <h3 className="font-display mb-4 text-base font-medium text-[#dee3ea]">
        Ticket quantity
      </h3>
      <div
        className="grid w-full grid-cols-2 sm:grid-cols-4"
        style={{ gap: elementGapPx }}
        role="radiogroup"
        aria-label="Ticket count"
      >
        {[1, 2, 3, 4].map((n) => {
          const selected = booking.ticketCount === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={selected}
              data-hci-id={`ticket_pill_${n}`}
              data-hci-type="select_option"
              onClick={() => onSelect(n)}
              className={`flex flex-col items-center justify-center rounded-lg font-display text-2xl font-semibold transition-all ${
                selected
                  ? "bg-[#f59e0b] text-[#613b00] shadow-[0_8px_24px_rgba(245,158,11,0.22)]"
                  : "bg-[#252a30] text-[#dee3ea] hover:bg-[#30353b]"
              }`}
              style={{ minHeight: minTargetSizePx }}
            >
              <span>{n}</span>
              <span
                className={`mt-0.5 font-mono text-[10px] font-normal uppercase tracking-wider ${
                  selected ? "text-[#613b00]/80" : "text-[#a08e7a]"
                }`}
              >
                {n === 1 ? "ticket" : "tickets"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
