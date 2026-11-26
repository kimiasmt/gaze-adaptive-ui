"use client";

import Link from "next/link";
import { GenUIRenderer } from "@/components/booking/GenUIRenderer";
import { StudyLeftDock } from "@/components/study/StudyLeftDock";
import { getGalleryVariant } from "@/lib/genui/galleryVariants";
import { useAppStore } from "@/store/useAppStore";
import { useEffect } from "react";

export function GalleryVariantClient({ id }: { id: string }) {
  const variant = getGalleryVariant(id);
  const setInteractionPolicy = useAppStore((s) => s.setInteractionPolicy);

  useEffect(() => {
    if (!variant) return;
    setInteractionPolicy(variant.spec.interaction_policy);
  }, [variant, setInteractionPolicy]);

  if (!variant) {
    return (
      <div className="hci-workspace relative min-h-screen bg-[var(--nl-surface)] text-[#dee3ea]">
        <header className="relative z-[100] flex min-h-[var(--nl-header-height)] items-center border-b border-[#534434]/35 px-5 py-3">
          <Link href="/gallery" className="text-[#4edea3] underline">
            ← Gallery
          </Link>
        </header>
        <div className="nl-study-row">
          <StudyLeftDock />
          <main className="nl-study-main p-4">
            <p>Unknown variant.</p>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="hci-workspace relative min-h-screen bg-[var(--nl-surface)]">
      <header className="relative z-[100] flex min-h-[var(--nl-header-height)] flex-col justify-center border-b border-[#534434]/35 bg-[var(--nl-surface)]/90 px-5 py-3 backdrop-blur-xl">
        <Link
          href="/gallery"
          className="font-mono text-[11px] text-[#a08e7a] hover:text-[#d8c3ad]"
        >
          ← Gallery
        </Link>
        <h1 className="font-display text-lg font-semibold text-[#dee3ea]">
          {variant.title}
        </h1>
        <p className="mt-1 max-w-3xl text-xs text-[#a08e7a]">
          <span className="text-[#ffc174]/90">Metrics: </span>
          {variant.metricBand}
        </p>
        <p className="mt-1 font-mono text-[11px] text-[#4edea3]/80">
          {variant.rule}
        </p>
      </header>
      <div className="nl-study-row">
        <StudyLeftDock />
        <div className="nl-study-main">
          <GenUIRenderer spec={variant.spec} />
        </div>
      </div>
    </div>
  );
}
