"use client";

import { ArrowRight, Lock, Receipt } from "lucide-react";
import { computeTotal, ZONE_LABELS, ZONE_PRICES } from "@/lib/booking/seatMap";
import { useAppStore } from "@/store/useAppStore";

type Props = {
  minTargetSizePx?: number;
  require_long_dwell_ms?: number;
};

export function ConfirmActionButton({
  minTargetSizePx = 56,
  require_long_dwell_ms = 900,
}: Props) {
  const booking = useAppStore((s) => s.bookingState);
  const confirmBooking = useAppStore((s) => s.confirmBooking);

  // Parity with BaselineConcertApp — no invented service fee.
  const total = computeTotal(booking.selectedZone, booking.ticketCount);
  const ready =
    !booking.isConfirmed &&
    booking.selectedSeats.length === booking.ticketCount &&
    booking.selectedSeats.length > 0;

  return (
    <div className="w-full space-y-3">
      <div className="rounded-xl border border-[#534434]/35 bg-[#1b2025] p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-base font-medium text-[#dee3ea]">
            Order summary
          </h3>
          <Receipt className="h-4 w-4 text-[#a08e7a]" aria-hidden />
        </div>

        <div className="space-y-3 border-y border-[#534434]/25 py-4 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-[#d8c3ad]">Selected zone</span>
            <span className="font-medium text-[#dee3ea]">
              {booking.selectedZone
                ? ZONE_LABELS[booking.selectedZone]
                : "—"}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-[#d8c3ad]">Price per ticket</span>
            <span className="font-mono text-[#dee3ea]">
              {booking.selectedZone
                ? `$${ZONE_PRICES[booking.selectedZone].toFixed(2)}`
                : "—"}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-[#d8c3ad]">Quantity</span>
            <span className="font-mono text-[#dee3ea]">
              {booking.ticketCount}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-[#d8c3ad]">Seats</span>
            <span className="max-w-[55%] text-right font-mono text-[12px] text-[#dee3ea]">
              {booking.selectedSeats.length
                ? booking.selectedSeats.join(", ")
                : "—"}
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <span className="font-display text-base text-[#dee3ea]">Total</span>
          <span className="font-display text-3xl font-semibold text-[#ffc174]">
            ${total.toFixed(2)}
          </span>
        </div>
      </div>

      <button
        type="button"
        data-hci-id="adapted_confirm_booking_btn"
        data-hci-type="confirm"
        data-hci-dwell-ms={String(require_long_dwell_ms)}
        disabled={!ready}
        onClick={confirmBooking}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#f59e0b] font-display text-base font-semibold text-[#613b00] shadow-[0_10px_28px_rgba(245,158,11,0.22)] transition enabled:hover:brightness-110 enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#30353b] disabled:text-[#a08e7a] disabled:shadow-none"
        style={{ minHeight: Math.max(minTargetSizePx, 56) }}
      >
        {booking.isConfirmed ? (
          "Tickets secured"
        ) : (
          <>
            Confirm booking
            <ArrowRight className="h-5 w-5" />
          </>
        )}
      </button>

      <p className="flex items-center justify-center gap-1.5 text-xs text-[#a08e7a]">
        <Lock className="h-3.5 w-3.5 text-[#4edea3]" aria-hidden />
        {booking.isConfirmed
          ? "Booking locked for this session"
          : `Secure checkout · ${require_long_dwell_ms}ms dwell`}
      </p>
    </div>
  );
}
