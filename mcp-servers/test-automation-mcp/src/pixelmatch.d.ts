declare module 'pixelmatch' {
  interface PixelmatchOptions {
    threshold?: number;
    includeAA?: boolean;
    alpha?: number;
    aaColor?: [number, number, number];
    diffColor?: [number, number, number];
    diffColorAlt?: [number, number, number];
    darkDiffColor?: [number, number, number];
    diffMask?: boolean;
  }

  function pixelmatch(
    img1: Uint8Array | Uint8ClampedArray | Buffer,
    img2: Uint8Array | Uint8ClampedArray | Buffer,
    output: Uint8ClampedArray | number[],
    width: number,
    height: number,
    options?: PixelmatchOptions,
  ): number;

  export default pixelmatch;
}
