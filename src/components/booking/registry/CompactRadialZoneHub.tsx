"use client";

import {
  pickBestSeats,
  ZONE_LABELS,
  ZONE_PRICES,
} from "@/lib/booking/seatMap";
import { useAppStore, type ZoneId } from "@/store/useAppStore";

type Props = {
  minTargetSizePx?: number;
  elementGapPx?: number;
};

const ZONES: ZoneId[] = ["vip", "floor", "balcony"];

const ZONE_ACCENT: Record<ZoneId, string> = {
  vip: "#ffc174",
  floor: "#6ec8ff",
  balcony: "#4edea3",
};

export function CompactRadialZoneHub({
  minTargetSizePx = 56,
  elementGapPx = 12,
}: Props) {
  const booking = useAppStore((s) => s.bookingState);
  const setTicketCount = useAppStore((s) => s.setTicketCount);

  const selectZone = (zone: ZoneId) => {
    const seats = pickBestSeats(zone, booking.ticketCount);
    useAppStore.setState({
      bookingState: {
        ...booking,
        selectedZone: zone,
        selectedSeats: seats,
        isConfirmed: false,
      },
    });
    if (seats.length > 0 && seats.length < booking.ticketCount) {
      setTicketCount(seats.length);
    }
  };

  return (
    <div
      className="mx-auto w-full max-w-[440px] rounded-xl border border-[#534434]/35 bg-[#1b2025] p-5"
      style={{ gap: elementGapPx }}
    >
      <div className="mb-4 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#4edea3]">
          Compact center hub
        </p>
        <h3 className="font-display mt-1 text-base font-medium text-[#dee3ea]">
          Zones · minimal neck travel
        </h3>
      </div>
      <div className="grid grid-cols-3" style={{ gap: elementGapPx }}>
        {ZONES.map((zone) => {
          const selected = booking.selectedZone === zone;
          const accent = ZONE_ACCENT[zone];
          return (
            <button
              key={zone}
              type="button"
              data-hci-id={`hub_zone_${zone}`}
              data-hci-type="zone"
              onClick={() => selectZone(zone)}
              className={`flex flex-col items-center justify-center rounded-xl border-2 px-2 text-center transition-all ${
                selected
                  ? "bg-[#252a30] text-[#dee3ea]"
                  : "border-transparent bg-[#171c21] text-[#d8c3ad] hover:border-[#534434]"
              }`}
              style={{
                minHeight: minTargetSizePx + 20,
                borderColor: selected ? accent : undefined,
                boxShadow: selected ? `0 0 0 1px ${accent}33` : undefined,
              }}
            >
              <span
                className="mb-1.5 h-2 w-2 rounded-full"
                style={{ background: accent }}
                aria-hidden
              />
              <span className="font-display text-xs font-medium leading-tight">
                {ZONE_LABELS[zone].split(" ")[0]}
              </span>
              <span className="mt-0.5 font-mono text-[11px] text-[#ffc174]">
                ${ZONE_PRICES[zone]}
              </span>
            </button>
          );
        })}
      </div>
      {booking.selectedSeats.length > 0 && (
        <p className="mt-4 text-center font-mono text-[11px] text-[#4edea3]">
          {booking.selectedSeats.join(", ")}
        </p>
      )}
    </div>
  );
}
