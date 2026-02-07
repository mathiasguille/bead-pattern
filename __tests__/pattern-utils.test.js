const { PALETTE, getClosestPaletteIndex, computeAdjustedColor } = require('../pattern-utils');

describe('PALETTE', () => {
  test('should have 11 colors', () => {
    expect(PALETTE.length).toBe(11);
  });

  test('should have White as first color', () => {
    expect(PALETTE[0].name).toBe('White');
    expect(PALETTE[0].rgb).toEqual([255, 255, 255]);
  });

  test('should have Black as second color', () => {
    expect(PALETTE[1].name).toBe('Black');
    expect(PALETTE[1].rgb).toEqual([34, 34, 34]);
  });

  test('all colors should have name and rgb properties', () => {
    PALETTE.forEach((color) => {
      expect(color).toHaveProperty('name');
      expect(color).toHaveProperty('rgb');
      expect(Array.isArray(color.rgb)).toBe(true);
      expect(color.rgb.length).toBe(3);
    });
  });
});

describe('getClosestPaletteIndex', () => {
  test('picks white (index 0) for white input (255, 255, 255)', () => {
    expect(getClosestPaletteIndex(255, 255, 255)).toBe(0);
  });

  test('picks black (index 1) for near-black input (10, 10, 10)', () => {
    expect(getClosestPaletteIndex(10, 10, 10)).toBe(1);
  });

  test('picks black (index 1) for pure black input (0, 0, 0)', () => {
    expect(getClosestPaletteIndex(0, 0, 0)).toBe(1);
  });

  test('returns valid palette index (0-10)', () => {
    const result = getClosestPaletteIndex(127, 127, 127);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(PALETTE.length);
  });

  test('matches red color for red input', () => {
    const result = getClosestPaletteIndex(220, 68, 55);
    expect(result).toBe(3); // Red is at index 3
  });

  test('handles various color inputs consistently', () => {
    const colors = [
      { input: [255, 0, 0], expected: 3 }, // Red
      { input: [0, 255, 0], expected: 6 }, // Green
      { input: [0, 0, 255], expected: 7 }, // Blue
    ];

    colors.forEach(({ input, expected }) => {
      const [r, g, b] = input;
      expect(getClosestPaletteIndex(r, g, b)).toBe(expected);
    });
  });
});

describe('computeAdjustedColor', () => {
  test('returns white for fully transparent (alpha = 0)', () => {
    expect(computeAdjustedColor(0, 0, 0, 0)).toEqual([255, 255, 255]);
  });

  test('returns same color for fully opaque (alpha = 255)', () => {
    expect(computeAdjustedColor(34, 34, 34, 255)).toEqual([34, 34, 34]);
  });

  test('blends color with white for partial alpha', () => {
    // 50% opacity of red (220, 68, 55) should blend toward white
    const result = computeAdjustedColor(220, 68, 55, 128);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(3);
    result.forEach((channel) => {
      expect(channel).toBeGreaterThanOrEqual(0);
      expect(channel).toBeLessThanOrEqual(255);
    });
  });

  test('returns array of three numbers', () => {
    const result = computeAdjustedColor(100, 150, 200, 200);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(3);
    expect(result.every((n) => typeof n === 'number')).toBe(true);
  });

  test('handles edge cases for all channels', () => {
    const result = computeAdjustedColor(255, 0, 128, 64);
    expect(result[0]).toBeGreaterThan(200); // Red channel should be high
    expect(result[1]).toBeGreaterThan(100); // Green blended with white
    expect(result[2]).toBeGreaterThan(150); // Blue channel in middle
  });

  test('returns rounded integer values', () => {
    const result = computeAdjustedColor(100, 100, 100, 100);
    result.forEach((channel) => {
      expect(Number.isInteger(channel)).toBe(true);
    });
  });
});
