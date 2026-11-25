import { GALLERY_VARIANTS } from "@/lib/genui/galleryVariants";
import { GalleryVariantClient } from "./GalleryVariantClient";

export function generateStaticParams() {
  return GALLERY_VARIANTS.map((v) => ({ id: v.id }));
}

export default async function GalleryVariantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GalleryVariantClient id={id} />;
}
