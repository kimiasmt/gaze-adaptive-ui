/**
 * One-Euro Filter (Casiez et al., CHI 2012)
 * Pure TypeScript implementation for pointer smoothing.
 */

function smoothingFactor(te: number, cutoff: number): number {
  const r = 2 * Math.PI * cutoff * te;
  return r / (r + 1);
}

class LowPassFilter {
  private yPrev: number | null = null;
  private sPrev: number | null = null;

  filter(value: number, alpha: number): number {
    if (this.yPrev === null || this.sPrev === null) {
      this.yPrev = value;
      this.sPrev = value;
      return value;
    }
    const s = alpha * value + (1 - alpha) * this.sPrev;
    this.yPrev = value;
    this.sPrev = s;
    return s;
  }

  lastValue(): number | null {
    return this.sPrev;
  }

  reset(): void {
    this.yPrev = null;
    this.sPrev = null;
  }
}

export type OneEuroParams = {
  minCutoff: number;
  beta: number;
  dCutoff?: number;
};

export class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xFilter = new LowPassFilter();
  private dxFilter = new LowPassFilter();
  private lastTime: number | null = null;

  constructor({ minCutoff = 1.0, beta = 0.0, dCutoff = 1.0 }: OneEuroParams) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  setParams(params: Partial<OneEuroParams>): void {
    if (params.minCutoff !== undefined) this.minCutoff = params.minCutoff;
    if (params.beta !== undefined) this.beta = params.beta;
    if (params.dCutoff !== undefined) this.dCutoff = params.dCutoff;
  }

  filter(value: number, timestampSec: number): number {
    if (this.lastTime === null) {
      this.lastTime = timestampSec;
      this.xFilter.filter(value, 1);
      this.dxFilter.filter(0, 1);
      return value;
    }

    const te = Math.max(1e-6, timestampSec - this.lastTime);
    this.lastTime = timestampSec;

    const prev = this.xFilter.lastValue() ?? value;
    const dx = (value - prev) / te;
    const edx = this.dxFilter.filter(dx, smoothingFactor(te, this.dCutoff));
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.xFilter.filter(value, smoothingFactor(te, cutoff));
  }

  reset(): void {
    this.xFilter.reset();
    this.dxFilter.reset();
    this.lastTime = null;
  }
}

export class OneEuroFilter2D {
  private fx: OneEuroFilter;
  private fy: OneEuroFilter;

  constructor(params: OneEuroParams) {
    this.fx = new OneEuroFilter(params);
    this.fy = new OneEuroFilter(params);
  }

  setParams(params: Partial<OneEuroParams>): void {
    this.fx.setParams(params);
    this.fy.setParams(params);
  }

  filter(x: number, y: number, timestampSec: number): { x: number; y: number } {
    return {
      x: this.fx.filter(x, timestampSec),
      y: this.fy.filter(y, timestampSec),
    };
  }

  reset(): void {
    this.fx.reset();
    this.fy.reset();
  }
}
