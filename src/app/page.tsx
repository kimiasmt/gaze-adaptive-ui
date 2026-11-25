"use client";

import { BookingWorkspace } from "@/components/booking/BookingWorkspace";
import { VirtualCursor } from "@/components/cursor/VirtualCursor";
import { WebcamPreview } from "@/components/cursor/WebcamPreview";
import { CameraAccessGate } from "@/components/cursor/CameraAccessGate";
import { ResearcherDrawer } from "@/components/researcher/ResearcherDrawer";
import { PilotStudyModal } from "@/components/researcher/PilotStudyModal";
import { GuidedTaskCoach } from "@/components/study/GuidedTaskCoach";
import { SessionResultsView } from "@/components/study/SessionResultsView";
import { AppliedMetricsChip } from "@/components/study/AppliedMetricsChip";

export default function Home() {
  return (
    <div className="hci-workspace relative min-h-screen">
      <CameraAccessGate />
      <BookingWorkspace />
      <VirtualCursor />
      <WebcamPreview />
      <ResearcherDrawer />
      <PilotStudyModal />
      <GuidedTaskCoach />
      <SessionResultsView />
      <AppliedMetricsChip />
    </div>
  );
}
