"use client";

import {
  pickBestSeats,
  seatsInZone,
  ZONE_LABELS,
  ZONE_PRICES,
} from "@/lib/booking/seatMap";
import { useAppStore, type ZoneId } from "@/store/useAppStore";

type Props = {
  minTargetSizePx?: number;
  elementGapPx?: number;
  autoSeat?: boolean;
};

const ZONES: ZoneId[] = ["vip", "floor", "balcony"];

const ZONE_BLURB: Record<ZoneId, string> = {
  vip: "Backstage pass, priority entry, and commemorative vinyl.",
  floor: "Unobstructed sightlines with immersive surround placement.",
  balcony: "Elevated acoustic seating with panoramic dome view.",
};

const ZONE_BADGE: Partial<Record<ZoneId, string>> = {
  vip: "Most Popular",
};

export function ZoneCardSelector({
  minTargetSizePx = 80,
  elementGapPx = 16,
  autoSeat = true,
}: Props) {
  const booking = useAppStore((s) => s.bookingState);
  const setTicketCount = useAppStore((s) => s.setTicketCount);

  const selectZone = (zone: ZoneId) => {
    const count = booking.ticketCount;
    const seats = autoSeat ? pickBestSeats(zone, count) : [];
    useAppStore.setState({
      bookingState: {
        ...booking,
        selectedZone: zone,
        selectedSeats: seats,
        isConfirmed: false,
      },
    });
    if (seats.length > 0 && seats.length < count) {
      setTicketCount(seats.length);
    }
  };

  return (
    <div className="flex w-full flex-col" style={{ gap: elementGapPx }}>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h3 className="font-display text-lg font-medium tracking-tight text-[#dee3ea]">
          Select Zone &amp; Seating
        </h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#a08e7a]">
          3 tiers available
        </span>
      </div>
      {ZONES.map((zone) => {
        const selected = booking.selectedZone === zone;
        const left = seatsInZone(zone).length;
        return (
          <button
            key={zone}
            type="button"
            data-hci-id={`zone_card_${zone}`}
            data-hci-type="zone"
            onClick={() => selectZone(zone)}
            className={`relative w-full rounded-xl border-2 px-5 py-4 text-left transition-all duration-200 ${
              selected
                ? "border-[#f59e0b] bg-[#1b2025] shadow-md"
                : "border-transparent bg-[#1b2025] hover:border-[#534434]"
            }`}
            style={{ minHeight: Math.max(minTargetSizePx, 88) }}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span
                  className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                    selected ? "border-[#ffc174]" : "border-[#a08e7a]"
                  }`}
                  aria-hidden
                >
                  <span
                    className={`h-3 w-3 rounded-full ${
                      selected ? "bg-[#ffc174]" : "bg-transparent"
                    }`}
                  />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-lg font-medium text-[#dee3ea]">
                      {ZONE_LABELS[zone]}
                    </span>
                    {ZONE_BADGE[zone] && (
                      <span className="rounded bg-[#4edea3]/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#4edea3]">
                        {ZONE_BADGE[zone]}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-[#d8c3ad]/90">
                    {ZONE_BLURB[zone]}
                  </p>
                  {autoSeat && selected && booking.selectedSeats.length > 0 && (
                    <p className="mt-1.5 font-mono text-[11px] text-[#4edea3]">
                      Auto-seat · {booking.selectedSeats.join(", ")}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-baseline justify-between gap-4 sm:flex-col sm:items-end">
                <span
                  className={`font-display text-3xl font-semibold tracking-tight ${
                    selected ? "text-[#ffc174]" : "text-[#dee3ea]"
                  }`}
                >
                  ${ZONE_PRICES[zone]}
                </span>
                <span className="text-xs text-[#a08e7a]">{left} seats left</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
