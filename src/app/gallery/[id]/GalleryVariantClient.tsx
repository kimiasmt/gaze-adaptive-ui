"use client";

import Link from "next/link";
import { GenUIRenderer } from "@/components/booking/GenUIRenderer";
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
      <main className="min-h-screen bg-[var(--nl-surface)] p-8 text-[#dee3ea]">
        <p>Unknown variant.</p>
        <Link href="/gallery" className="text-[#4edea3] underline">
          Back
        </Link>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--nl-surface)]">
      <header className="border-b border-[#534434]/35 px-5 py-3">
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
      <GenUIRenderer spec={variant.spec} />
    </div>
  );
}
