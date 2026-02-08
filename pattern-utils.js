/**
 * pattern-utils.js
 * 
 * Core utilities for bead pattern quantization and color metrics.
 * Provides palette definitions, color quantization, and perceptual color distance metrics.
 * 
 * Color Fidelity:
 * - Pure palette colors are preserved with 0% error (MSE=0, ΔE=0)
 * - Color quantization uses Euclidean distance in RGB space
 * - Perceptual metrics via Lab color space and Delta-E 76 formula
 * - No destructive preprocessing (colors mapped directly to nearest palette color)
 */

/**
 * Palette definitions with human-friendly names and RGB values.
 * Each palette is optimized for different use cases:
 * - basic: Balanced 11-color palette for general use
 * - primary: Pure 5-color palette (white, black, R, G, B) - limited but precise
 */
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

/**
 * Find the index of the closest palette color using Euclidean distance in RGB space.
 * 
 * @param {number} red - Red channel (0-255)
 * @param {number} green - Green channel (0-255)
 * @param {number} blue - Blue channel (0-255)
 * @param {Array} palette - Optional palette array; defaults to basic palette
 * @returns {number} Index of the closest color in the palette
 */
function getClosestPaletteIndex(red, green, blue, palette) {
  const usePalette = palette || PALETTES.basic;
  let minDistance = Number.POSITIVE_INFINITY;
  let chosenIndex = 0;

  // Iterate through palette and find minimum Euclidean distance
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

/**
 * Adjust RGB values based on alpha channel (transparency blending with white background).
 * Converts RGBA to RGB assuming a white background.
 * 
 * @param {number} red - Red channel (0-255)
 * @param {number} green - Green channel (0-255)
 * @param {number} blue - Blue channel (0-255)
 * @param {number} alpha - Alpha channel (0-255)
 * @returns {Array} Adjusted [r, g, b] values
 */
function computeAdjustedColor(red, green, blue, alpha) {
  const a = alpha / 255;
  const adjustedRed = Math.round(red * a + 255 * (1 - a));
  const adjustedGreen = Math.round(green * a + 255 * (1 - a));
  const adjustedBlue = Math.round(blue * a + 255 * (1 - a));
  return [adjustedRed, adjustedGreen, adjustedBlue];
}

/**
 * Quantize an image to a target palette by mapping each pixel to the nearest palette color.
 * 
 * @param {Object} imageData - ImageData object with { data: Uint8ClampedArray, width, height }
 *                            or plain object with data array and optional width/height
 * @param {string} paletteName - Name of palette to use ('basic' or 'primary'); defaults to 'basic'
 * @returns {Object} { indices: 2D array of palette indices, quantizedRGB: Uint8ClampedArray, width, height }
 */
function quantizeImageData(imageData, paletteName = 'basic') {
  const palette = PALETTES[paletteName] || PALETTES.basic;
  const width = imageData.width || Math.sqrt(imageData.data.length / 4);
  const height = imageData.height || width;
  const data = imageData.data;

  // 2D array to store palette indices for each pixel
  const indices = new Array(height).fill(null).map(() => new Array(width));
  // Quantized RGB output (same shape as input)
  const quantizedRGB = new Uint8ClampedArray(data.length);

  // Process each pixel
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3] === undefined ? 255 : data[idx + 3];

      // Blend with white background based on alpha
      const [ar, ag, ab] = computeAdjustedColor(r, g, b, a);
      // Find nearest palette color
      const paletteIndex = getClosestPaletteIndex(ar, ag, ab, palette);
      indices[y][x] = paletteIndex;

      // Output quantized color
      const [pr, pg, pb] = palette[paletteIndex].rgb;
      quantizedRGB[idx] = pr;
      quantizedRGB[idx + 1] = pg;
      quantizedRGB[idx + 2] = pb;
      quantizedRGB[idx + 3] = 255;
    }
  }

  return { indices, quantizedRGB, width, height };
}

/**
 * Compute Mean Squared Error between original and quantized pixel colors.
 * Metric: MSE across RGB channels (lower is better, 0 = perfect match).
 * 
 * @param {Uint8ClampedArray} originalData - Original image pixel data (RGBA)
 * @param {Uint8ClampedArray} quantizedRGB - Quantized image pixel data (RGBA)
 * @returns {number} MSE value (0 = identical)
 */
function computeMSE(originalData, quantizedRGB) {
  // originalData and quantizedRGB are Uint8ClampedArray of same length
  let mse = 0;
  const len = Math.min(originalData.length, quantizedRGB.length);
  let count = 0;

  // Sum squared differences for RGB channels only (skip alpha at index 3)
  for (let i = 0; i < len; i += 4) {
    const dr = originalData[i] - quantizedRGB[i];
    const dg = originalData[i + 1] - quantizedRGB[i + 1];
    const db = originalData[i + 2] - quantizedRGB[i + 2];
    mse += dr * dr + dg * dg + db * db;
    count += 3;  // 3 channels per pixel
  }

  return mse / count;
}

// ============================================================================
// Perceptual Color Metrics: RGB → Lab Color Space → Delta-E 76
// ============================================================================
// These functions convert RGB to Lab color space and compute perceptual
// color distance. Lab space is more aligned with human color perception
// than RGB, making Delta-E a better metric for visible color differences.
// ============================================================================

/**
 * Convert RGB to XYZ color space (intermediate step for Lab conversion).
 * Uses sRGB gamma correction and D65 standard illuminant.
 * 
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {Array} [X, Y, Z] in XYZ space
 */
function rgbToXyz(r, g, b) {
  // Normalize to 0-1 range
  r = r / 255; g = g / 255; b = b / 255;
  
  // Apply gamma correction (sRGB companding)
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  // Apply color mixing matrix for D65 illuminant, 2° observer
  const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = r * 0.0193 + g * 0.1192 + b * 0.9505;
  return [x, y, z];
}

/**
 * Convert XYZ to Lab color space.
 * Lab is perceptually uniform: equal changes in Lab produce similar visual differences.
 * 
 * @param {number} x - X component
 * @param {number} y - Y component
 * @param {number} z - Z component
 * @returns {Array} [L, a, b] in Lab space
 */
function xyzToLab(x, y, z) {
  // D65 reference white point
  const refX = 0.95047;
  const refY = 1.00000;
  const refZ = 1.08883;

  // Normalize to reference white
  x = x / refX; y = y / refY; z = z / refZ;

  // Apply nonlinear transformation (gamma-like curve)
  x = x > 0.008856 ? Math.cbrt(x) : (7.787 * x) + (16 / 116);
  y = y > 0.008856 ? Math.cbrt(y) : (7.787 * y) + (16 / 116);
  z = z > 0.008856 ? Math.cbrt(z) : (7.787 * z) + (16 / 116);

  // Compute Lab coordinates
  const L = (116 * y) - 16;  // Lightness (0-100)
  const a = 500 * (x - y);   // Green-Magenta axis
  const b = 200 * (y - z);   // Blue-Yellow axis
  return [L, a, b];
}

/**
 * Convert RGB directly to Lab color space (convenience function).
 * 
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {Array} [L, a, b] in Lab space
 */
function rgbToLab(r, g, b) {
  const [x, y, z] = rgbToXyz(r, g, b);
  return xyzToLab(x, y, z);
}

/**
 * Compute Delta-E 76 (Euclidean distance in Lab space).
 * This is the simplest perceptual color distance metric.
 * ΔE < 1: Not perceptible, ΔE < 2: Barely perceptible, ΔE > 10: Clearly visible difference
 * 
 * @param {Array} labA - [L, a, b] color in Lab space
 * @param {Array} labB - [L, a, b] color in Lab space
 * @returns {number} Delta-E value (0 = identical)
 */
function deltaE76(labA, labB) {
  const dL = labA[0] - labB[0];
  const da = labA[1] - labB[1];
  const db = labA[2] - labB[2];
  return Math.sqrt(dL * dL + da * da + db * db);
}

/**
 * Compute mean perceptual color difference (Delta-E 76) between original and quantized colors.
 * Metric: Average ΔE across all pixels (lower is better, 0 = perfect match).
 * 
 * @param {Uint8ClampedArray} originalData - Original image pixel data (RGBA)
 * @param {Uint8ClampedArray} quantizedRGB - Quantized image pixel data (RGBA)
 * @returns {number} Mean Delta-E value
 */
function computeMeanDeltaE(originalData, quantizedRGB) {
  let total = 0;
  let count = 0;

  const len = Math.min(originalData.length, quantizedRGB.length);
  // Process each pixel's RGB (skip alpha)
  for (let i = 0; i < len; i += 4) {
    const lab1 = rgbToLab(originalData[i], originalData[i + 1], originalData[i + 2]);
    const lab2 = rgbToLab(quantizedRGB[i], quantizedRGB[i + 1], quantizedRGB[i + 2]);
    total += deltaE76(lab1, lab2);
    count += 1;
  }

  return total / Math.max(1, count);
}

// ============================================================================
// Module Exports
// ============================================================================
// Export utilities for use in other modules (Node.js) or tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PALETTES,
    PALETTE: PALETTES.basic,  // Alias for backward compatibility
    getClosestPaletteIndex,
    computeAdjustedColor,
    quantizeImageData,
    computeMSE,
    computeMeanDeltaE,
    rgbToLab,
    deltaE76,
  };
}
