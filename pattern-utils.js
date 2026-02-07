const PALETTE = [
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
];

function getClosestPaletteIndex(red, green, blue) {
  let minDistance = Number.POSITIVE_INFINITY;
  let chosenIndex = 0;

  PALETTE.forEach((color, index) => {
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PALETTE, getClosestPaletteIndex, computeAdjustedColor };
}
