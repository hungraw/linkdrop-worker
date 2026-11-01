import jsQR from 'jsqr';
import { cleanHttpUrl } from './url.js';

export function decodeQrUrl(rgba: Uint8ClampedArray, width: number, height: number): string | null {
  if (width <= 0 || height <= 0 || rgba.length !== width * height * 4) return null;
  const result = jsQR(rgba, width, height);
  return result ? cleanHttpUrl(result.data) : null;
}
