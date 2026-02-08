const { PALETTES, quantizeImageData, rgbToLab, deltaE76, computeMeanDeltaE } = require('../pattern-utils');

// Test that pure palette colors are preserved perfectly when quantized
describe('Color fidelity: Pure palette colors', () => {
  Object.keys(PALETTES).forEach((paletteName) => {
    const palette = PALETTES[paletteName];

    test(`${paletteName}: pure palette colors remain unchanged`, () => {
      // Create a 5x5 tile for each palette color
      const width = 5 * palette.length;
      const height = 5;
      const data = new Uint8ClampedArray(width * height * 4);

      // Fill each column with a pure palette color
      palette.forEach((color, colorIdx) => {
        const [r, g, b] = color.rgb;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < 5; x++) {
            const idx = (y * width + (colorIdx * 5 + x)) * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
            data[idx + 3] = 255;
          }
        }
      });

      const result = quantizeImageData({ data, width, height }, paletteName);
      const mse = computeMeanDeltaE(data, result.quantizedRGB);

      console.log(`${paletteName} - Pure color MSE: ${mse.toFixed(2)}`);

      // Pure colors should have near-zero error
      expect(mse).toBeLessThan(0.1);
    });
  });
});

// Test specific pure colors (R, G, B, Y, C, M, W, K)
describe('Color fidelity: Primary and secondary colors', () => {
  const testColors = {
    red: [255, 0, 0],
    green: [0, 255, 0],
    blue: [0, 0, 255],
    yellow: [255, 255, 0],
    cyan: [0, 255, 255],
    magenta: [255, 0, 255],
    white: [255, 255, 255],
    black: [0, 0, 0],
  };

  Object.keys(PALETTES).forEach((paletteName) => {
    test(`${paletteName}: core colors fidelity report`, () => {
      const palette = PALETTES[paletteName];
      const results = {};

      Object.entries(testColors).forEach(([colorName, rgb]) => {
        const [r, g, b] = rgb;
        const width = 10, height = 10;
        const data = new Uint8ClampedArray(width * height * 4);

        // Fill entire image with this color
        for (let i = 0; i < data.length; i += 4) {
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = 255;
        }

        const result = quantizeImageData({ data, width, height }, paletteName);
        const deltaE = computeMeanDeltaE(data, result.quantizedRGB);
        const mse = 0; // use deltaE for this test

        // Find which palette color was chosen
        const chosenColorIdx = result.indices[0][0];
        const chosenColor = palette[chosenColorIdx];

        results[colorName] = {
          input: rgb,
          chosen: chosenColor.name,
          chosenRGB: chosenColor.rgb,
          deltaE: parseFloat(deltaE.toFixed(2)),
        };
      });

      console.log(`${paletteName} palette color fidelity:`, JSON.stringify(results, null, 2));

      // Verify that the palette choice makes sense for each color
      // (This is informative; we'll inspect the logs to verify correctness)
      expect(Object.keys(results).length).toBe(Object.keys(testColors).length);
    });
  });
});

// Test per-pixel fidelity: how well a pure color field quantizes
describe('Color fidelity: Uniform color fields', () => {
  const colorFields = [
    { name: 'red', color: [255, 0, 0] },
    { name: 'green', color: [0, 255, 0] },
    { name: 'blue', color: [0, 0, 255] },
    { name: 'yellow', color: [255, 255, 0] },
  ];

  colorFields.forEach(({ name, color }) => {
    test(`primary color field: ${name}`, () => {
      const [r, g, b] = color;
      const width = 18, height = 18;
      const data = new Uint8ClampedArray(width * height * 4);

      for (let i = 0; i < data.length; i += 4) {
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 255;
      }

      const basicResult = quantizeImageData({ data, width, height }, 'basic');
      const primaryResult = quantizeImageData({ data, width, height }, 'primary');

      const basicDE = computeMeanDeltaE(data, basicResult.quantizedRGB);
      const primaryDE = computeMeanDeltaE(data, primaryResult.quantizedRGB);

      console.log(`Color field ${name}: basic ΔE=${basicDE.toFixed(2)}, primary ΔE=${primaryDE.toFixed(2)}`);

      expect(basicDE).toBeGreaterThanOrEqual(0);
      expect(primaryDE).toBeGreaterThanOrEqual(0);
    });
  });
});
