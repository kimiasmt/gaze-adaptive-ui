"use client";

import { Minus, Plus } from "lucide-react";
import { pickBestSeats } from "@/lib/booking/seatMap";
import { useAppStore } from "@/store/useAppStore";

type Props = {
  minTargetSizePx?: number;
  elementGapPx?: number;
};

export function LargeStepperControl({
  minTargetSizePx = 80,
  elementGapPx = 0,
}: Props) {
  const booking = useAppStore((s) => s.bookingState);
  const setTicketCount = useAppStore((s) => s.setTicketCount);

  const apply = (n: number) => {
    const next = Math.min(4, Math.max(1, n));
    setTicketCount(next);
    if (booking.selectedZone) {
      const seats = pickBestSeats(booking.selectedZone, next);
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
        className="flex w-full items-stretch overflow-hidden rounded-lg bg-[#252a30] p-1"
        style={{ gap: elementGapPx, minHeight: minTargetSizePx }}
      >
        <button
          type="button"
          data-hci-id="ticket_stepper_minus"
          data-hci-type="action"
          onClick={() => apply(booking.ticketCount - 1)}
          className="flex flex-1 items-center justify-center rounded-md text-[#dee3ea] transition hover:bg-[#30353b]"
          style={{ minHeight: Math.max(minTargetSizePx - 8, 56) }}
          aria-label="Decrease ticket count"
        >
          <Minus className="h-7 w-7" strokeWidth={2.25} />
        </button>
        <div
          className="flex min-w-[5.5rem] flex-col items-center justify-center px-3"
          aria-live="polite"
        >
          <span className="font-display text-3xl font-semibold text-[#ffc174]">
            {booking.ticketCount}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#a08e7a]">
            tickets
          </span>
        </div>
        <button
          type="button"
          data-hci-id="ticket_stepper_plus"
          data-hci-type="action"
          onClick={() => apply(booking.ticketCount + 1)}
          className="flex flex-1 items-center justify-center rounded-md text-[#dee3ea] transition hover:bg-[#30353b]"
          style={{ minHeight: Math.max(minTargetSizePx - 8, 56) }}
          aria-label="Increase ticket count"
        >
          <Plus className="h-7 w-7" strokeWidth={2.25} />
        </button>
      </div>
    </div>
  );
}
