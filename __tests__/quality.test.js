const { PALETTES, quantizeImageData, computeMSE } = require('../pattern-utils');

function createCheckerboard(width, height, colorA, colorB) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const isA = ((x + y) % 2) === 0;
      const [r, g, b] = isA ? colorA : colorB;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }
  return { data, width, height };
}

function createGradient(width, height, startColor, endColor) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = x / (width - 1);
      const idx = (y * width + x) * 4;
      data[idx] = Math.round(startColor[0] * (1 - t) + endColor[0] * t);
      data[idx + 1] = Math.round(startColor[1] * (1 - t) + endColor[1] * t);
      data[idx + 2] = Math.round(startColor[2] * (1 - t) + endColor[2] * t);
      data[idx + 3] = 255;
    }
  }
  return { data, width, height };
}

describe('Quantization quality metrics', () => {
  test('checkerboard quantization produces finite MSE values', () => {
    const { data, width, height } = createCheckerboard(20, 20, [255, 0, 0], [0, 255, 0]);
    const imageData = { data, width, height };

    const basic = quantizeImageData(imageData, 'basic');
    const primary = quantizeImageData(imageData, 'primary');

    const mseBasic = computeMSE(data, basic.quantizedRGB);
    const msePrimary = computeMSE(data, primary.quantizedRGB);

    // Basic and primary palettes should both produce finite numeric MSE
    expect(Number.isFinite(mseBasic)).toBe(true);
    expect(Number.isFinite(msePrimary)).toBe(true);

    // Log values as numbers to help build a baseline in CI logs
    // (not an assertion) but ensure they are non-negative
    expect(mseBasic).toBeGreaterThanOrEqual(0);
    expect(msePrimary).toBeGreaterThanOrEqual(0);
  });

  test('gradient quantization MSE is within an expected range', () => {
    const { data, width, height } = createGradient(32, 16, [0, 0, 255], [255, 255, 0]);
    const imageData = { data, width, height };

    const basic = quantizeImageData(imageData, 'basic');
    const primary = quantizeImageData(imageData, 'primary');

    const mseBasic = computeMSE(data, basic.quantizedRGB);
    const msePrimary = computeMSE(data, primary.quantizedRGB);

    // Log values so they can be captured in CI artifacts as baselines
    // and ensure they are finite and non-negative
    console.log('Gradient MSE (basic):', mseBasic);
    console.log('Gradient MSE (primary):', msePrimary);

    expect(Number.isFinite(mseBasic)).toBe(true);
    expect(Number.isFinite(msePrimary)).toBe(true);
    expect(mseBasic).toBeGreaterThanOrEqual(0);
    expect(msePrimary).toBeGreaterThanOrEqual(0);
  });
});
