"use client";

import { useEffect } from "react";
import Link from "next/link";
import { GALLERY_VARIANTS } from "@/lib/genui/galleryVariants";
import { useAppStore } from "@/store/useAppStore";

export default function GalleryIndexPage() {
  const setMouseFallbackMode = useAppStore((s) => s.setMouseFallbackMode);

  useEffect(() => {
    // Catalog index is browse-only with the OS mouse
    setMouseFallbackMode(true);
  }, [setMouseFallbackMode]);

  return (
    <div className="relative min-h-screen bg-[var(--nl-surface)] text-[#dee3ea]">
      <header className="relative z-[100] flex min-h-[var(--nl-header-height)] items-center border-b border-[#534434]/35 bg-[var(--nl-surface)]/90 px-5 py-3 backdrop-blur-xl">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#ffc174]">
            Northlight · Ability-based GenUI
          </p>
          <h1 className="font-display text-lg font-semibold tracking-tight text-[#dee3ea]">
            Adaptation Catalog
          </h1>
        </div>
      </header>

      <main className="px-6 py-8">
        <p className="max-w-2xl text-sm leading-relaxed text-[#d8c3ad]/90">
          These are the approved booking layouts our system can generate for
          different motor needs. Open a card to try that layout full-screen —
          including head-gaze on Continue / Back. The guided study itself still
          runs only on the main booking page.
        </p>
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {GALLERY_VARIANTS.map((v, i) => (
            <li key={v.id}>
              <Link
                href={`/gallery/${v.id}`}
                className="block rounded-xl border border-[#534434]/40 bg-[var(--nl-surface-container)] p-4 transition hover:border-[#4edea3]/50"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#4edea3]">
                  {i + 1} · {v.spec.detected_profile_archetype.replaceAll("_", " ")}
                </p>
                <h2 className="font-display mt-1 text-base font-medium text-[#dee3ea]">
                  {v.title}
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-[#a08e7a]">
                  {v.metricBand}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-[#ffc174]/90">
                  {v.rule}
                </p>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-8">
          <Link href="/" className="text-sm text-[#4edea3] underline">
            ← Back to booking
          </Link>
        </p>
      </main>
    </div>
  );
}
