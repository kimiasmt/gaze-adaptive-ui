import type { ComponentType } from "react";
import type { ComponentName } from "@/lib/genui/schema";
import { InteractiveSeatMap } from "./InteractiveSeatMap";
import { ZoneCardSelector } from "./ZoneCardSelector";
import { CompactRadialZoneHub } from "./CompactRadialZoneHub";
import { DropdownSelect } from "./DropdownSelect";
import { LargeStepperControl } from "./LargeStepperControl";
import { RadioPillGrid } from "./RadioPillGrid";
import { CompactCenterStepper } from "./CompactCenterStepper";
import { ConfirmActionButton } from "./ConfirmActionButton";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const COMPONENT_MAP: Record<ComponentName, ComponentType<any>> = {
  InteractiveSeatMap,
  ZoneCardSelector,
  CompactRadialZoneHub,
  DropdownSelect,
  LargeStepperControl,
  RadioPillGrid,
  CompactCenterStepper,
  ConfirmActionButton,
};
