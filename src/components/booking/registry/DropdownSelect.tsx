"use client";

import { TicketCountDropdown } from "@/components/booking/TicketCountDropdown";
import { pickBestSeats } from "@/lib/booking/seatMap";
import { useAppStore } from "@/store/useAppStore";

type Props = {
  minTargetSizePx?: number;
};

export function DropdownSelect({ minTargetSizePx = 52 }: Props) {
  const booking = useAppStore((s) => s.bookingState);
  const setTicketCount = useAppStore((s) => s.setTicketCount);

  return (
    <div className="w-full rounded-xl bg-[#1b2025] p-5">
      <h3 className="font-display mb-3 text-base font-medium text-[#dee3ea]">
        Ticket quantity
      </h3>
      <TicketCountDropdown
        value={booking.ticketCount}
        minTargetSizePx={minTargetSizePx}
        onChange={(n) => {
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
        }}
      />
    </div>
  );
}
