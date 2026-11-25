import {
  DrawingUtils,
  FaceLandmarker,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import type { LandmarkPoint } from "@/lib/tracking/headTracker";

/** Draw MediaPipe face mesh + head-pose anchors onto a canvas sized to the video. */
export function drawFaceMeshOverlay(
  ctx: CanvasRenderingContext2D,
  landmarks: LandmarkPoint[],
  width: number,
  height: number,
): void {
  ctx.clearRect(0, 0, width, height);
  if (!landmarks.length) return;

  const pts = landmarks as NormalizedLandmark[];
  const drawer = new DrawingUtils(ctx);

  drawer.drawConnectors(pts, FaceLandmarker.FACE_LANDMARKS_TESSELATION, {
    color: "rgba(192, 192, 192, 0.35)",
    lineWidth: 0.6,
  });
  drawer.drawConnectors(pts, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, {
    color: "#ffc174",
    lineWidth: 1.4,
  });
  drawer.drawConnectors(pts, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, {
    color: "#4edea3",
    lineWidth: 1.2,
  });
  drawer.drawConnectors(pts, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, {
    color: "#4edea3",
    lineWidth: 1.2,
  });
  drawer.drawConnectors(pts, FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW, {
    color: "#6ec8ff",
    lineWidth: 1.1,
  });
  drawer.drawConnectors(pts, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW, {
    color: "#6ec8ff",
    lineWidth: 1.1,
  });
  drawer.drawConnectors(pts, FaceLandmarker.FACE_LANDMARKS_LIPS, {
    color: "#f59e0b",
    lineWidth: 1.2,
  });

  // Nose tip — primary yaw/pitch reference for our pointer mapping
  const nose = landmarks[1];
  if (nose) {
    const nx = nose.x * width;
    const ny = nose.y * height;
    ctx.beginPath();
    ctx.arc(nx, ny, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffc174";
    ctx.fill();
    ctx.strokeStyle = "#dee3ea";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
