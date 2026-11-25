import type { NextConfig } from "next";

/**
 * GitHub Pages static hosting.
 * Project site: https://<user>.github.io/gaze-adaptive-ui/
 * Override with NEXT_PUBLIC_BASE_PATH="" for a custom apex / user site root.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/gaze-adaptive-ui";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  // Hide Next.js "N" badge — overlaps the fixed Head tracking panel (bottom-left).
  devIndicators: false,
};

export default nextConfig;
