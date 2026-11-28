"use client";

import {
  COLS,
  OCCUPIED_SEATS,
  ROWS,
  ZONE_LABELS,
  seatId,
  zoneForRow,
} from "@/lib/booking/seatMap";
import { useAppStore, type ZoneId } from "@/store/useAppStore";

type Props = {
  minTargetSizePx?: number;
  enlarged?: boolean;
};

const ZONE_FILL: Record<ZoneId, { free: string; selected: string }> = {
  vip: { free: "#ffc174", selected: "#f59e0b" },
  floor: { free: "#6ec8ff", selected: "#1e8fd6" },
  balcony: { free: "#4edea3", selected: "#00a572" },
};

export function InteractiveSeatMap({
  minTargetSizePx = 44,
  enlarged = true,
}: Props) {
  const booking = useAppStore((s) => s.bookingState);
  const toggleSeat = useAppStore((s) => s.toggleSeat);

  // Prefer larger seats; save space via tight padding, not tiny targets
  const diameter = enlarged
    ? Math.max(26, Math.min(36, Math.round(minTargetSizePx * 0.4)))
    : 18;
  const gap = enlarged ? 8 : 5;
  const mapWidth = COLS * diameter + (COLS - 1) * gap;
  const mapHeight = ROWS * diameter + (ROWS - 1) * gap;
  const stageW = Math.min(mapWidth * 0.72, 260);

  return (
    <div
      data-hci-id="adapted_seat_map"
      data-hci-type="seat_map"
      data-hci-dwell="false"
      className="mx-auto flex h-full max-h-full w-fit max-w-full flex-col overflow-hidden rounded-xl border border-[#534434]/40 bg-[#1b2025] p-1.5"
    >
      <div className="mb-1 flex shrink-0 items-center justify-between gap-2 px-0.5">
        <h3 className="font-display text-sm font-medium text-[#dee3ea]">
          Interactive seat map
        </h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#a08e7a]">
          {booking.selectedSeats.length}/{booking.ticketCount} selected
        </span>
      </div>

      <div className="mb-1 flex shrink-0 justify-center">
        <div
          className="flex h-5 items-center justify-center rounded-t-xl bg-gradient-to-b from-[#ffc174]/35 to-[#ffc174]/5 font-mono text-[9px] uppercase tracking-[0.2em] text-[#ffc174]"
          style={{ width: stageW }}
        >
          Stage
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <svg
          width={mapWidth}
          height={mapHeight}
          viewBox={`0 0 ${mapWidth} ${mapHeight}`}
          className="mx-auto block max-h-full max-w-full"
          role="img"
          aria-label="Adapted theater seat map"
          preserveAspectRatio="xMidYMid meet"
        >
          {Array.from({ length: ROWS }, (_, row) =>
            Array.from({ length: COLS }, (_, col) => {
              const id = seatId(row, col);
              const zone = zoneForRow(row);
              const occupied = OCCUPIED_SEATS.has(id);
              const selected = booking.selectedSeats.includes(id);
              const cx = col * (diameter + gap) + diameter / 2;
              const cy = row * (diameter + gap) + diameter / 2;
              let fill = ZONE_FILL[zone].free;
              if (occupied) fill = "#30353b";
              if (selected) fill = ZONE_FILL[zone].selected;
              return (
                <g key={id}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={diameter / 2}
                    fill={fill}
                    stroke={selected ? "#dee3ea" : "transparent"}
                    strokeWidth={selected ? 2 : 0}
                    className={occupied ? "opacity-35" : "cursor-pointer"}
                    data-hci-id={`adapted_seat_${id}`}
                    data-hci-type="seat"
                    role="button"
                    tabIndex={occupied ? -1 : 0}
                    aria-label={`${ZONE_LABELS[zone]} seat ${id}`}
                    onClick={() => {
                      if (occupied) return;
                      // Respect ticket count: don't add past the chosen quantity
                      if (
                        !selected &&
                        booking.selectedSeats.length >= booking.ticketCount
                      ) {
                        return;
                      }
                      toggleSeat(id, zone);
                    }}
                  />
                </g>
              );
            }),
          )}
        </svg>
      </div>

      <div className="mt-1 flex shrink-0 flex-wrap items-center justify-center gap-2.5 border-t border-[#534434]/30 pt-1.5">
        {(
          [
            ["vip", "VIP"],
            ["floor", "Floor"],
            ["balcony", "Balcony"],
          ] as const
        ).map(([z, label]) => (
          <span
            key={z}
            className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-[#d8c3ad]"
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: ZONE_FILL[z].free }}
            />
            {label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-[#a08e7a]">
          <span className="inline-block h-2 w-2 rounded-full bg-[#30353b]" />
          Taken
        </span>
      </div>
    </div>
  );
}
