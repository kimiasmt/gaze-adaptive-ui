"use client";

import { BookingWorkspace } from "@/components/booking/BookingWorkspace";
import { VirtualCursor } from "@/components/cursor/VirtualCursor";
import { CameraAccessGate } from "@/components/cursor/CameraAccessGate";
import { ResearcherDrawer } from "@/components/researcher/ResearcherDrawer";
import { PilotStudyModal } from "@/components/researcher/PilotStudyModal";
import { SessionResultsView } from "@/components/study/SessionResultsView";
import { AppliedMetricsChip } from "@/components/study/AppliedMetricsChip";

export default function Home() {
  return (
    <div className="hci-workspace relative h-screen overflow-hidden">
      <CameraAccessGate />
      <BookingWorkspace />
      <VirtualCursor />
      <ResearcherDrawer />
      <PilotStudyModal />
      <SessionResultsView />
      <AppliedMetricsChip />
    </div>
  );
}
