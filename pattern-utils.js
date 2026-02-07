const PALETTES = {
  basic: [
    { name: "White", rgb: [255, 255, 255] },
    { name: "Black", rgb: [34, 34, 34] },
    { name: "Gray", rgb: [150, 150, 160] },
    { name: "Red", rgb: [220, 68, 55] },
    { name: "Orange", rgb: [242, 141, 39] },
    { name: "Yellow", rgb: [247, 211, 70] },
    { name: "Green", rgb: [73, 168, 83] },
    { name: "Blue", rgb: [73, 118, 211] },
    { name: "Purple", rgb: [136, 89, 212] },
    { name: "Pink", rgb: [237, 121, 166] },
    { name: "Brown", rgb: [137, 92, 63] },
  ],
  primary: [
    { name: "White", rgb: [255, 255, 255] },
    { name: "Black", rgb: [0, 0, 0] },
    { name: "Red", rgb: [255, 0, 0] },
    { name: "Green", rgb: [0, 255, 0] },
    { name: "Blue", rgb: [0, 0, 255] },
  ],
};

function getClosestPaletteIndex(red, green, blue, palette) {
  const usePalette = palette || PALETTES.basic;
  let minDistance = Number.POSITIVE_INFINITY;
  let chosenIndex = 0;

  usePalette.forEach((color, index) => {
    const [r, g, b] = color.rgb;
    const distance = (red - r) * (red - r) + (green - g) * (green - g) + (blue - b) * (blue - b);

    if (distance < minDistance) {
      minDistance = distance;
      chosenIndex = index;
    }
  });

  return chosenIndex;
}

function computeAdjustedColor(red, green, blue, alpha) {
  const a = alpha / 255;
  const adjustedRed = Math.round(red * a + 255 * (1 - a));
  const adjustedGreen = Math.round(green * a + 255 * (1 - a));
  const adjustedBlue = Math.round(blue * a + 255 * (1 - a));
  return [adjustedRed, adjustedGreen, adjustedBlue];
}

function quantizeImageData(imageData, paletteName = 'basic') {
  const palette = PALETTES[paletteName] || PALETTES.basic;
  const width = imageData.width || Math.sqrt(imageData.data.length / 4);
  const height = imageData.height || width;
  const data = imageData.data;

  const indices = new Array(height).fill(null).map(() => new Array(width));
  const quantizedRGB = new Uint8ClampedArray(data.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3] === undefined ? 255 : data[idx + 3];

      const [ar, ag, ab] = computeAdjustedColor(r, g, b, a);
      const paletteIndex = getClosestPaletteIndex(ar, ag, ab, palette);
      indices[y][x] = paletteIndex;

      const [pr, pg, pb] = palette[paletteIndex].rgb;
      quantizedRGB[idx] = pr;
      quantizedRGB[idx + 1] = pg;
      quantizedRGB[idx + 2] = pb;
      quantizedRGB[idx + 3] = 255;
    }
  }

  return { indices, quantizedRGB, width, height };
}

function computeMSE(originalData, quantizedRGB) {
  // originalData and quantizedRGB are Uint8ClampedArray of same length
  let mse = 0;
  const len = Math.min(originalData.length, quantizedRGB.length);
  let count = 0;

  for (let i = 0; i < len; i += 4) {
    const dr = originalData[i] - quantizedRGB[i];
    const dg = originalData[i + 1] - quantizedRGB[i + 1];
    const db = originalData[i + 2] - quantizedRGB[i + 2];
    mse += dr * dr + dg * dg + db * db;
    count += 3;
  }

  return mse / count;
}

// --- Perceptual color metric helpers (RGB -> Lab -> DeltaE) ---
function rgbToXyz(r, g, b) {
  // sRGB (0..255) to XYZ
  r = r / 255; g = g / 255; b = b / 255;
  // gamma correction
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  // Observer = 2°, Illuminant = D65
  const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = r * 0.0193 + g * 0.1192 + b * 0.9505;
  return [x, y, z];
}

function xyzToLab(x, y, z) {
  // D65 reference white
  const refX = 0.95047;
  const refY = 1.00000;
  const refZ = 1.08883;

  x = x / refX; y = y / refY; z = z / refZ;

  x = x > 0.008856 ? Math.cbrt(x) : (7.787 * x) + (16 / 116);
  y = y > 0.008856 ? Math.cbrt(y) : (7.787 * y) + (16 / 116);
  z = z > 0.008856 ? Math.cbrt(z) : (7.787 * z) + (16 / 116);

  const L = (116 * y) - 16;
  const a = 500 * (x - y);
  const b = 200 * (y - z);
  return [L, a, b];
}

function rgbToLab(r, g, b) {
  const [x, y, z] = rgbToXyz(r, g, b);
  return xyzToLab(x, y, z);
}

function deltaE76(labA, labB) {
  const dL = labA[0] - labB[0];
  const da = labA[1] - labB[1];
  const db = labA[2] - labB[2];
  return Math.sqrt(dL * dL + da * da + db * db);
}

function computeMeanDeltaE(originalData, quantizedRGB) {
  let total = 0;
  let count = 0;

  const len = Math.min(originalData.length, quantizedRGB.length);
  for (let i = 0; i < len; i += 4) {
    const lab1 = rgbToLab(originalData[i], originalData[i + 1], originalData[i + 2]);
    const lab2 = rgbToLab(quantizedRGB[i], quantizedRGB[i + 1], quantizedRGB[i + 2]);
    total += deltaE76(lab1, lab2);
    count += 1;
  }

  return total / Math.max(1, count);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PALETTES,
    PALETTE: PALETTES.basic,
    getClosestPaletteIndex,
    computeAdjustedColor,
    quantizeImageData,
    computeMSE,
    computeMeanDeltaE,
    rgbToLab,
    deltaE76,
  };
}
