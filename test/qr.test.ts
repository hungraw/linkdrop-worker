import test from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import { decodeQrUrl } from '../src/qr.js';

function pixelsForMatrix(matrix: boolean[][], scale = 5): { data: Uint8ClampedArray; width: number; height: number } {
  const quiet = 4;
  const width = (matrix.length + quiet * 2) * scale;
  const data = new Uint8ClampedArray(width * width * 4);
  data.fill(255);
  for (let y = 0; y < width; y++) {
    for (let x = 0; x < width; x++) data[(y * width + x) * 4 + 3] = 255;
  }
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix.length; x++) {
      if (!matrix[y]?.[x]) continue;
      for (let py = 0; py < scale; py++) {
        for (let px = 0; px < scale; px++) {
          const index = (((y + quiet) * scale + py) * width + (x + quiet) * scale + px) * 4;
          data[index] = 0;
          data[index + 1] = 0;
          data[index + 2] = 0;
        }
      }
    }
  }
  return { data, width, height: width };
}

function qrPixelsFor(value: string) {
  const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
  const matrix = Array.from({ length: qr.modules.size }, (_, y) =>
    Array.from({ length: qr.modules.size }, (_, x) => qr.modules.get(x, y) === 1),
  );
  return pixelsForMatrix(matrix);
}

test('decodes a generated QR URL and cleans it', () => {
  const pixelImage = qrPixelsFor('https://example.com/item?utm_source=qr#top');
  assert.equal(decodeQrUrl(pixelImage.data, pixelImage.width, pixelImage.height), 'https://example.com/item');
});

test('rejects non-http QR payloads and invalid pixel buffers', () => {
  const pixelImage = qrPixelsFor('javascript:alert(1)');
  assert.equal(decodeQrUrl(pixelImage.data, pixelImage.width, pixelImage.height), null);
  assert.equal(decodeQrUrl(new Uint8ClampedArray(8), 2, 2), null);
});
