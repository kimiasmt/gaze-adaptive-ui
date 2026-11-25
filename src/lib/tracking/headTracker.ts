"use client";

import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";
import {
  quietTfLiteConsole,
  withQuietTfLiteLogsAsync,
} from "@/lib/tracking/tfliteConsole";

export type LandmarkPoint = { x: number; y: number; z?: number };

export type HeadPoseSample = {
  /** Normalized viewport coords in [0, 1] after calibration + gain */
  x: number;
  y: number;
  yaw: number;
  pitch: number;
  faceDetected: boolean;
  timestampMs: number;
  /** Normalized face mesh (MediaPipe) for overlay — empty when no face. */
  landmarks: LandmarkPoint[];
};

export type HeadTrackerOptions = {
  sensitivityX?: number;
  sensitivityY?: number;
  video: HTMLVideoElement;
};

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm";

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** Extract yaw/pitch (radians) from a column-major 4×4 facial transform. */
export function yawPitchFromMatrix(data: ArrayLike<number>): {
  yaw: number;
  pitch: number;
} {
  // Column-major: R = [[0,4,8],[1,5,9],[2,6,10]]
  const r02 = data[8];
  const r12 = data[9];
  const r22 = data[10];
  const yaw = Math.atan2(r02, r22);
  const pitch = Math.atan2(-r12, Math.hypot(r02, r22));
  return { yaw, pitch };
}

/** Fallback from nose tip (#1) vs approximate face center. */
export function yawPitchFromLandmarks(
  landmarks: Array<{ x: number; y: number; z?: number }>,
): { yaw: number; pitch: number } {
  const nose = landmarks[1];
  const left = landmarks[234] ?? landmarks[127];
  const right = landmarks[454] ?? landmarks[356];
  if (!nose || !left || !right) {
    return { yaw: 0, pitch: 0 };
  }
  const cx = (left.x + right.x) / 2;
  const cy = (left.y + right.y) / 2;
  // Scale proxies into roughly radian-like range for gain mapping
  return {
    yaw: (nose.x - cx) * 4.5,
    pitch: (nose.y - cy) * 4.5,
  };
}

export class HeadTracker {
  private landmarker: FaceLandmarker | null = null;
  private video: HTMLVideoElement;
  private sensitivityX: number;
  private sensitivityY: number;
  private originYaw = 0;
  private originPitch = 0;
  private lastVideoTime = -1;
  /** Monotonic timestamp required by FaceLandmarker VIDEO mode */
  private lastDetectTs = -1;
  private running = false;
  private rafId: number | null = null;
  private releaseConsole: (() => void) | null = null;
  private onSample: ((sample: HeadPoseSample) => void) | null = null;
  private lastSample: HeadPoseSample = {
    x: 0.5,
    y: 0.5,
    yaw: 0,
    pitch: 0,
    faceDetected: false,
    timestampMs: 0,
    landmarks: [],
  };

  constructor(options: HeadTrackerOptions) {
    this.video = options.video;
    this.sensitivityX = options.sensitivityX ?? 2.4;
    this.sensitivityY = options.sensitivityY ?? 2.4;
  }

  get sample(): HeadPoseSample {
    return this.lastSample;
  }

  setSensitivity(x: number, y: number): void {
    this.sensitivityX = x;
    this.sensitivityY = y;
  }

  async initialize(): Promise<void> {
    // Keep console patch for the whole tracker lifetime — TFLite often logs
    // the XNNPACK INFO line via console.error (Next.js red overlay).
    this.releaseConsole ??= quietTfLiteConsole();
    // CPU/XNNPACK is stable on macOS Chrome; GPU frequently falls back anyway.
    await withQuietTfLiteLogsAsync(async () => {
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);
      this.landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFacialTransformationMatrixes: true,
        outputFaceBlendshapes: false,
      });
    });
  }

  start(onSample: (sample: HeadPoseSample) => void): void {
    this.onSample = onSample;
    if (this.running) return;
    this.running = true;
    this.releaseConsole ??= quietTfLiteConsole();
    const loop = () => {
      if (!this.running) return;
      this.tick();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  dispose(): void {
    this.stop();
    this.releaseConsole?.();
    this.releaseConsole = null;
    this.landmarker?.close();
    this.landmarker = null;
  }

  /** Set current head pose as viewport center (0.5, 0.5). */
  recenter(): void {
    this.originYaw = this.lastSample.yaw;
    this.originPitch = this.lastSample.pitch;
  }

  private tick(): void {
    if (!this.landmarker || this.video.readyState < 2) return;
    if (this.video.videoWidth <= 0 || this.video.videoHeight <= 0) return;

    const now = performance.now();
    if (this.video.currentTime === this.lastVideoTime) return;
    this.lastVideoTime = this.video.currentTime;

    // detectForVideo requires strictly increasing timestamps
    const detectTs = now <= this.lastDetectTs ? this.lastDetectTs + 1 : now;
    this.lastDetectTs = detectTs;

    let result: FaceLandmarkerResult;
    try {
      result = this.landmarker.detectForVideo(this.video, detectTs);
    } catch {
      return;
    }

    const face = result.faceLandmarks?.[0];
    if (!face) {
      this.lastSample = {
        ...this.lastSample,
        faceDetected: false,
        timestampMs: now,
        landmarks: [],
      };
      this.onSample?.(this.lastSample);
      return;
    }

    let yaw: number;
    let pitch: number;
    const matrix = result.facialTransformationMatrixes?.[0]?.data;
    if (matrix && matrix.length >= 16) {
      ({ yaw, pitch } = yawPitchFromMatrix(matrix));
    } else {
      ({ yaw, pitch } = yawPitchFromLandmarks(face));
    }

    const dYaw = yaw - this.originYaw;
    const dPitch = pitch - this.originPitch;

    // Mirror X so head-left moves pointer left on a mirrored selfie video.
    const x = clamp01(0.5 - dYaw * this.sensitivityX);
    const y = clamp01(0.5 + dPitch * this.sensitivityY);

    this.lastSample = {
      x,
      y,
      yaw,
      pitch,
      faceDetected: true,
      timestampMs: now,
      landmarks: face.map((p) => ({ x: p.x, y: p.y, z: p.z })),
    };
    this.onSample?.(this.lastSample);
  }
}

export async function openWebcamStream(
  constraints: MediaStreamConstraints = {
    audio: false,
    video: {
      facingMode: "user",
      width: { ideal: 640 },
      height: { ideal: 480 },
    },
  },
): Promise<MediaStream> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error(
      "Camera API unavailable in this browser. Use Chrome on a laptop, or mouse fallback.",
    );
  }
  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    const name =
      err && typeof err === "object" && "name" in err
        ? String((err as { name: string }).name)
        : "Error";
    if (name === "NotAllowedError") {
      throw new Error(
        "Camera permission denied. Allow webcam for head-gaze, or use mouse fallback.",
      );
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      throw new Error(
        "No webcam found. Open this site on a laptop with a camera, or use mouse fallback.",
      );
    }
    if (name === "NotReadableError") {
      throw new Error(
        "Webcam is busy in another app. Close it and retry, or use mouse fallback.",
      );
    }
    throw err instanceof Error ? err : new Error(String(err));
  }
}
