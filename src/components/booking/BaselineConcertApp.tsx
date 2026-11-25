"use client";

import { Ticket, RotateCcw, Lock } from "lucide-react";
import {
  COLS,
  OCCUPIED_SEATS,
  ROWS,
  SEAT_DIAMETER_PX,
  SEAT_GAP_PX,
  ZONE_LABELS,
  ZONE_PRICES,
  computeTotal,
  seatId,
  zoneForRow,
} from "@/lib/booking/seatMap";
import { useAppStore, type ZoneId } from "@/store/useAppStore";
import { TicketCountDropdown } from "@/components/booking/TicketCountDropdown";

/** Stitch Northlight palette — sizes stay hostile (16px seats). */
const ZONE_FILL: Record<ZoneId, { free: string; selected: string }> = {
  vip: { free: "#ffc174", selected: "#f59e0b" },
  floor: { free: "#6ec8ff", selected: "#1e8fd6" },
  balcony: { free: "#4edea3", selected: "#00a572" },
};

type Props = {
  /** When true, parent workspace owns the header chrome. */
  embedInWorkspace?: boolean;
};

export function BaselineConcertApp({ embedInWorkspace = false }: Props) {
  const bookingState = useAppStore((s) => s.bookingState);
  const toggleSeat = useAppStore((s) => s.toggleSeat);
  const setTicketCount = useAppStore((s) => s.setTicketCount);
  const confirmBooking = useAppStore((s) => s.confirmBooking);
  const resetBooking = useAppStore((s) => s.resetBooking);

  const {
    selectedSeats,
    selectedZone,
    ticketCount,
    isConfirmed,
  } = bookingState;

  const total = computeTotal(selectedZone, ticketCount);
  const canConfirm =
    !isConfirmed &&
    selectedSeats.length === ticketCount &&
    selectedSeats.length > 0;

  const mapWidth = COLS * SEAT_DIAMETER_PX + (COLS - 1) * SEAT_GAP_PX;
  const mapHeight = ROWS * SEAT_DIAMETER_PX + (ROWS - 1) * SEAT_GAP_PX;
  const stageW = Math.min(mapWidth * 0.78, 260);

  return (
    <div
      className={`relative bg-[var(--nl-surface)] text-[#dee3ea] ${
        embedInWorkspace ? "" : "min-h-screen"
      }`}
    >
      {!embedInWorkspace && (
        <header className="flex items-center justify-between border-b border-[#534434]/35 bg-[var(--nl-surface)]/90 px-5 py-3 backdrop-blur-xl">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#ffc174]">
              HCI Research Prototype · Phase 5
            </p>
            <h1 className="font-display text-lg font-semibold tracking-tight text-[#dee3ea]">
              Northlight Concert Hall
            </h1>
          </div>
          <button
            type="button"
            data-hci-id="reset_booking_btn"
            data-hci-type="action"
            onClick={resetBooking}
            className="mr-28 inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#534434]/50 bg-[var(--nl-surface-container)] px-2.5 text-xs text-[#d8c3ad] hover:border-[#a08e7a]"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Reset
          </button>
        </header>
      )}

      <div className="flex min-h-[calc(100vh-57px)]">
        {/* Main seat map — Northlight chrome, intentionally dense targets */}
        <main className="relative flex flex-1 flex-col items-center overflow-hidden px-6 py-8">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "radial-gradient(ellipse 80% 50% at 50% -10%, #ffc174 0%, transparent 55%)",
            }}
            aria-hidden
          />

          <div className="relative z-[1] mb-5 w-full max-w-xl text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#a08e7a]">
              Symphony of the Cosmos · NL-SYM-2024
            </p>
            <h2 className="font-display mt-1 text-xl font-medium text-[#dee3ea]">
              Select seating
            </h2>
          </div>

          <div
            data-hci-id="seat_map_svg"
            data-hci-type="seat_map"
            data-hci-dwell="false"
            className="relative z-[1] rounded-xl border border-[#534434]/40 bg-[var(--nl-surface-container)] p-5 shadow-inner"
          >
            <div className="mb-4 flex justify-center">
              <div
                className="flex items-center justify-center rounded-t-2xl bg-gradient-to-b from-[#ffc174]/35 to-[#ffc174]/5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#ffc174]"
                style={{ width: stageW, height: 28 }}
              >
                Stage
              </div>
            </div>

            <svg
              width={mapWidth}
              height={mapHeight}
              viewBox={`0 0 ${mapWidth} ${mapHeight}`}
              role="img"
              aria-label="Theater seat map, 8 rows by 12 columns"
              className="mx-auto block"
            >
              {Array.from({ length: ROWS }, (_, row) =>
                Array.from({ length: COLS }, (_, col) => {
                  const id = seatId(row, col);
                  const zone = zoneForRow(row);
                  const occupied = OCCUPIED_SEATS.has(id);
                  const selected = selectedSeats.includes(id);
                  const cx =
                    col * (SEAT_DIAMETER_PX + SEAT_GAP_PX) +
                    SEAT_DIAMETER_PX / 2;
                  const cy =
                    row * (SEAT_DIAMETER_PX + SEAT_GAP_PX) +
                    SEAT_DIAMETER_PX / 2;
                  const r = SEAT_DIAMETER_PX / 2;

                  let fill = ZONE_FILL[zone].free;
                  if (occupied) fill = "#30353b";
                  if (selected) fill = ZONE_FILL[zone].selected;

                  return (
                    <circle
                      key={id}
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill={fill}
                      stroke={selected ? "#dee3ea" : "transparent"}
                      strokeWidth={selected ? 1.5 : 0}
                      className={
                        occupied
                          ? "cursor-not-allowed opacity-40"
                          : "cursor-pointer transition-opacity hover:opacity-90"
                      }
                      data-hci-id={`seat_${id}`}
                      data-hci-type="seat"
                      data-hci-zone={zone}
                      role="button"
                      tabIndex={occupied ? -1 : 0}
                      aria-label={`${ZONE_LABELS[zone]} seat ${id}${
                        occupied ? ", occupied" : selected ? ", selected" : ""
                      }`}
                      aria-disabled={occupied}
                      aria-pressed={selected}
                      onClick={() => {
                        if (!occupied) toggleSeat(id, zone);
                      }}
                      onKeyDown={(e) => {
                        if (occupied) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleSeat(id, zone);
                        }
                      }}
                    />
                  );
                }),
              )}
            </svg>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 border-t border-[#534434]/30 pt-4 font-mono text-[10px] uppercase tracking-wider text-[#d8c3ad]">
              {(Object.keys(ZONE_LABELS) as ZoneId[]).map((zone) => (
                <span key={zone} className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: ZONE_FILL[zone].free }}
                  />
                  {ZONE_LABELS[zone]} · ${ZONE_PRICES[zone]}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5 text-[#a08e7a]">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#30353b]" />
                Taken
              </span>
            </div>
          </div>

          {isConfirmed && (
            <div
              className="relative z-[1] mt-8 rounded-xl border border-[#00a572]/40 bg-[#00a572]/10 px-4 py-3 text-sm text-[#4edea3]"
              role="status"
            >
              Booking confirmed for seats{" "}
              <strong className="text-[#dee3ea]">
                {selectedSeats.join(", ")}
              </strong>{" "}
              · ${total}
            </div>
          )}
        </main>

        {/* Right sidebar — Stitch order panel, compact hostile controls */}
        <aside className="flex w-60 shrink-0 flex-col border-l border-[#534434]/35 bg-[var(--nl-surface-low)] px-4 pb-20 pt-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-[#ffc174]" aria-hidden />
              <span className="font-display text-sm font-medium text-[#dee3ea]">
                Order
              </span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#a08e7a]">
              Baseline
            </span>
          </div>

          <label
            htmlFor="ticket_count_dropdown"
            className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#a08e7a]"
          >
            Ticket count
          </label>
          <TicketCountDropdown
            value={ticketCount}
            onChange={setTicketCount}
            minTargetSizePx={32}
            compact
          />

          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#a08e7a]">
            Selected seats
          </div>
          <p className="min-h-[3rem] text-sm text-[#d8c3ad]">
            {selectedSeats.length === 0
              ? "None — pick seats on the map"
              : selectedSeats.join(", ")}
          </p>

          <div className="mt-4 space-y-2 border-y border-[#534434]/25 py-4 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-[#a08e7a]">Zone</span>
              <span className="text-right text-[#dee3ea]">
                {selectedZone ? ZONE_LABELS[selectedZone] : "—"}
              </span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-[#a08e7a]">Total</span>
              <span className="font-display text-lg text-[#ffc174]">
                ${total.toFixed(2)}
              </span>
            </div>
          </div>

          <p className="mt-6 flex items-start gap-1.5 text-[10px] leading-relaxed text-[#a08e7a]/90">
            <Lock className="mt-0.5 h-3 w-3 shrink-0 text-[#4edea3]" aria-hidden />
            Dense 16px seats, 32px dropdown, corner Confirm — hostile for
            head-gaze; chrome follows Stitch Northlight.
          </p>
        </aside>
      </div>

      {/* Corner CTA — forces neck rotation / precise aiming; Stitch amber */}
      <button
        type="button"
        data-hci-id="confirm_booking_btn"
        data-hci-type="confirm"
        disabled={!canConfirm}
        onClick={confirmBooking}
        className="fixed bottom-4 right-4 z-20 flex items-center justify-center rounded-lg bg-[#f59e0b] font-display text-xs font-semibold text-[#613b00] shadow-[0_8px_24px_rgba(245,158,11,0.25)] transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:bg-[#30353b] disabled:text-[#a08e7a] disabled:shadow-none"
        style={{ width: 120, height: 36 }}
        aria-label="Confirm booking"
      >
        {isConfirmed ? "Confirmed" : "Confirm"}
      </button>
    </div>
  );
}
