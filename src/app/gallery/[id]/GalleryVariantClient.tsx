"use client";

import Link from "next/link";
import { GenUIRenderer } from "@/components/booking/GenUIRenderer";
import { VirtualCursor } from "@/components/cursor/VirtualCursor";
import { WebcamPreview } from "@/components/cursor/WebcamPreview";
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
      <div className="relative min-h-screen bg-[var(--nl-surface)] p-8 text-[#dee3ea]">
        <p>Unknown layout.</p>
        <Link href="/gallery" className="text-[#4edea3] underline">
          ← Adaptation Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="hci-workspace relative flex h-screen flex-col overflow-hidden bg-[var(--nl-surface)]">
      <header className="relative z-[100] flex shrink-0 flex-col justify-center border-b border-[#534434]/35 bg-[var(--nl-surface)]/90 px-5 py-2">
        <Link
          href="/gallery"
          className="font-mono text-[11px] text-[#a08e7a] hover:text-[#d8c3ad]"
        >
          ← Adaptation Catalog
        </Link>
        <h1 className="font-display text-base font-semibold text-[#dee3ea]">
          {variant.title}
        </h1>
        <p className="mt-0.5 line-clamp-1 max-w-3xl text-xs text-[#a08e7a]">
          {variant.rule}
        </p>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">
        <GenUIRenderer spec={variant.spec} />
      </div>
      <aside
        className="researcher-hud fixed bottom-3 left-3 z-[95] w-[min(240px,calc(100vw-1.5rem))] scale-90 origin-bottom-left"
        aria-label="Head tracking for catalog try-out"
      >
        <WebcamPreview />
      </aside>
      <VirtualCursor />
    </div>
  );
}
