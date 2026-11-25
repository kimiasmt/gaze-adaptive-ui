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

  const diameter = enlarged
    ? Math.max(24, Math.min(40, Math.round(minTargetSizePx * 0.42)))
    : 18;
  const gap = enlarged ? 10 : 5;
  const mapWidth = COLS * diameter + (COLS - 1) * gap;
  const mapHeight = ROWS * diameter + (ROWS - 1) * gap;
  const stageW = Math.min(mapWidth * 0.72, 280);
  const stageH = 14;

  return (
    <div
      data-hci-id="adapted_seat_map"
      data-hci-type="seat_map"
      data-hci-dwell="false"
      className="mx-auto overflow-hidden rounded-xl border border-[#534434]/40 bg-[#1b2025] p-5"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="font-display text-base font-medium text-[#dee3ea]">
          Interactive seat map
        </h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#a08e7a]">
          {booking.selectedSeats.length} selected
        </span>
      </div>

      <div className="mb-4 flex justify-center">
        <div
          className="flex items-center justify-center rounded-t-2xl bg-gradient-to-b from-[#ffc174]/35 to-[#ffc174]/5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#ffc174]"
          style={{ width: stageW, height: stageH + 18 }}
        >
          Stage
        </div>
      </div>

      <svg
        width={mapWidth}
        height={mapHeight}
        viewBox={`0 0 ${mapWidth} ${mapHeight}`}
        className="mx-auto block"
        role="img"
        aria-label="Adapted theater seat map"
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
                  strokeWidth={selected ? 2.5 : 0}
                  className={occupied ? "opacity-35" : "cursor-pointer"}
                  data-hci-id={`adapted_seat_${id}`}
                  data-hci-type="seat"
                  role="button"
                  tabIndex={occupied ? -1 : 0}
                  aria-label={`${ZONE_LABELS[zone]} seat ${id}`}
                  onClick={() => {
                    if (!occupied) toggleSeat(id, zone);
                  }}
                />
              </g>
            );
          }),
        )}
      </svg>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-4 border-t border-[#534434]/30 pt-4">
        {(
          [
            ["vip", "VIP"],
            ["floor", "Floor"],
            ["balcony", "Balcony"],
          ] as const
        ).map(([z, label]) => (
          <span
            key={z}
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[#d8c3ad]"
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: ZONE_FILL[z].free }}
            />
            {label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[#a08e7a]">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#30353b]" />
          Taken
        </span>
      </div>
    </div>
  );
}
