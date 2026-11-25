"use client";

import { pickBestSeats } from "@/lib/booking/seatMap";
import { useAppStore } from "@/store/useAppStore";

type Props = {
  minTargetSizePx?: number;
  elementGapPx?: number;
};

export function CompactCenterStepper({
  minTargetSizePx = 48,
  elementGapPx = 8,
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
    <div className="mx-auto w-full max-w-md rounded-xl border border-[#534434]/30 bg-[#1b2025] p-4">
      <p className="mb-3 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-[#a08e7a]">
        Compact tickets · center
      </p>
      <div
        className="flex items-center justify-center"
        style={{ gap: elementGapPx }}
        role="group"
        aria-label="Ticket count"
      >
        {[1, 2, 3, 4].map((n) => {
          const selected = booking.ticketCount === n;
          return (
            <button
              key={n}
              type="button"
              data-hci-id={`ticket_center_${n}`}
              data-hci-type="select_option"
              onClick={() => onSelect(n)}
              className={`flex flex-1 items-center justify-center rounded-lg font-display text-lg font-semibold transition-all ${
                selected
                  ? "bg-[#f59e0b] text-[#613b00]"
                  : "bg-[#252a30] text-[#dee3ea] hover:bg-[#30353b]"
              }`}
              style={{ minHeight: minTargetSizePx }}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
