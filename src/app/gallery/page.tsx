"use client";

import Link from "next/link";
import { GALLERY_VARIANTS } from "@/lib/genui/galleryVariants";
import { StudyLeftDock } from "@/components/study/StudyLeftDock";

export default function GalleryIndexPage() {
  return (
    <div className="hci-workspace relative min-h-screen bg-[var(--nl-surface)] text-[#dee3ea]">
      <header className="relative z-[100] flex min-h-[var(--nl-header-height)] items-center border-b border-[#534434]/35 bg-[var(--nl-surface)]/90 px-5 py-3 backdrop-blur-xl">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#ffc174]">
            Northlight · Stitch kit
          </p>
          <h1 className="font-display text-lg font-semibold tracking-tight text-[#dee3ea]">
            GenUI variant gallery
          </h1>
        </div>
      </header>

      <div className="nl-study-row">
        <StudyLeftDock />
        <main className="nl-study-main py-2">
          <p className="max-w-2xl text-sm text-[#d8c3ad]/90">
            Canonical constrained layouts the composer / Live LLM can emit. Open
            each card for a full-viewport render + metric band.
          </p>
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {GALLERY_VARIANTS.map((v, i) => (
              <li key={v.id}>
                <Link
                  href={`/gallery/${v.id}`}
                  className="block rounded-xl border border-[#534434]/40 bg-[var(--nl-surface-container)] p-4 transition hover:border-[#4edea3]/50"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#4edea3]">
                    {i + 1} · {v.spec.detected_profile_archetype}
                  </p>
                  <h2 className="font-display mt-1 text-base font-medium text-[#dee3ea]">
                    {v.title}
                  </h2>
                  <p className="mt-2 text-xs leading-relaxed text-[#a08e7a]">
                    {v.metricBand}
                  </p>
                  <p className="mt-2 font-mono text-[11px] text-[#ffc174]/80">
                    {v.spec.nodes.map((n) => n.component).join(" → ")}
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
    </div>
  );
}
