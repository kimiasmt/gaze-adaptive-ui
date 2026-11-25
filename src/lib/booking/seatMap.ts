import type { ZoneId } from "@/store/useAppStore";

export const ROWS = 8;
export const COLS = 12;
export const SEAT_DIAMETER_PX = 16;
export const SEAT_GAP_PX = 4;

export const ZONE_PRICES: Record<ZoneId, number> = {
  vip: 120,
  floor: 80,
  balcony: 50,
};

export const ZONE_LABELS: Record<ZoneId, string> = {
  vip: "VIP Experience",
  floor: "Mid Floor",
  balcony: "Balcony Tier",
};

/** Rows 0–1 VIP, 2–4 Floor, 5–7 Balcony */
export function zoneForRow(row: number): ZoneId {
  if (row <= 1) return "vip";
  if (row <= 4) return "floor";
  return "balcony";
}

export function seatId(row: number, col: number): string {
  const rowLabel = String.fromCharCode(65 + row); // A–H
  return `${rowLabel}${col + 1}`;
}

/** Deterministic occupied seats for a reproducible hostile baseline. */
export const OCCUPIED_SEATS = new Set<string>([
  "A3",
  "A4",
  "A9",
  "B2",
  "B11",
  "C5",
  "C6",
  "C7",
  "D1",
  "D12",
  "E8",
  "F3",
  "F4",
  "G10",
  "H1",
  "H2",
  "H11",
  "H12",
]);

export function computeTotal(
  zone: ZoneId | null,
  ticketCount: number,
): number {
  if (!zone) return 0;
  return ZONE_PRICES[zone] * ticketCount;
}

/** Best available adjacent seats in a zone (left-to-right, front-first). */
export function pickBestSeats(zone: ZoneId, count: number): string[] {
  const seats: string[] = [];
  for (let row = 0; row < ROWS; row++) {
    if (zoneForRow(row) !== zone) continue;
    for (let col = 0; col < COLS; col++) {
      const id = seatId(row, col);
      if (OCCUPIED_SEATS.has(id)) continue;
      seats.push(id);
      if (seats.length >= count) return seats;
    }
  }
  return seats;
}

export function seatsInZone(zone: ZoneId): string[] {
  const seats: string[] = [];
  for (let row = 0; row < ROWS; row++) {
    if (zoneForRow(row) !== zone) continue;
    for (let col = 0; col < COLS; col++) {
      const id = seatId(row, col);
      if (!OCCUPIED_SEATS.has(id)) seats.push(id);
    }
  }
  return seats;
}
