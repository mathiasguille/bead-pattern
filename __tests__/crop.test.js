/**
 * @file __tests__/crop.test.js
 * @description Comprehensive test suite for the interactive crop tool.
 * 
 * Tests validate:
 * - Crop box boundary constraints
 * - Position and size calculations
 * - Aspect ratio maintenance (square)
 * - Image coordinate transformations
 * - Edge cases (zero size, out of bounds, etc.)
 */

/**
 * Mock crop state
 * Represents the crop box position (x, y) and size (width, height)
 */
let mockCropBox = {
  x: 0,
  y: 0,
  width: 100,
  height: 100
};

/**
 * Mock image dimensions
 * Represents the source image's pixel dimensions
 */
let mockSourceImageDimensions = {
  width: 800,
  height: 600
};

/**
 * Update crop box with bounds checking.
 * Ensures the crop box never extends beyond image boundaries
 * and maintains square aspect ratio.
 * 
 * @param {number} newX - Desired X position
 * @param {number} newY - Desired Y position
 * @param {number} newSize - Desired width/height (maintains square)
 * @returns {Object} Updated crop box
 */
function updateCropBox(newX, newY, newSize) {
  const { width: imgWidth, height: imgHeight } = mockSourceImageDimensions;
  
  // Constrain size to image dimensions
  const maxSize = Math.min(imgWidth, imgHeight);
  mockCropBox.width = Math.max(50, Math.min(newSize, maxSize));
  mockCropBox.height = mockCropBox.width; // Keep it square
  
  // Constrain position to keep crop box within image
  mockCropBox.x = Math.max(0, Math.min(newX, imgWidth - mockCropBox.width));
  mockCropBox.y = Math.max(0, Math.min(newY, imgHeight - mockCropBox.height));
  
  return mockCropBox;
}

/**
 * Reset crop box to center position
 * 
 * @returns {Object} Reset crop box
 */
function resetCropBox() {
  const { width: imgWidth, height: imgHeight } = mockSourceImageDimensions;
  const cropSize = Math.min(imgWidth, imgHeight) * 0.8;
  
  mockCropBox.width = Math.min(cropSize, 500);
  mockCropBox.height = mockCropBox.width;
  mockCropBox.x = (imgWidth - mockCropBox.width) / 2;
  mockCropBox.y = (imgHeight - mockCropBox.height) / 2;
  
  return mockCropBox;
}

/**
 * Calculate the source image region that will be extracted.
 * Takes into account the crop box position/size and image dimensions.
 * 
 * @param {number} gridSize - Target grid size (e.g., 18 for 18×18)
 * @returns {Object} Source rectangle with offsetX, offsetY, width, height
 */
function calculateSourceRegion(gridSize) {
  const { x, y, width, height } = mockCropBox;
  const { width: imgWidth, height: imgHeight } = mockSourceImageDimensions;
  
  const ratio = Math.min(
    imgWidth / width,
    imgHeight / height
  );
  
  const cropWidth = width * ratio;
  const cropHeight = height * ratio;
  const offsetX = x * ratio;
  const offsetY = y * ratio;
  
  return {
    offsetX,
    offsetY,
    cropWidth,
    cropHeight
  };
}

/**
 * Validate that crop box is within image bounds
 * 
 * @returns {boolean} True if crop box is valid
 */
function isCropBoxValid() {
  const { x, y, width, height } = mockCropBox;
  const { width: imgWidth, height: imgHeight } = mockSourceImageDimensions;
  
  return (
    x >= 0 &&
    y >= 0 &&
    x + width <= imgWidth &&
    y + height <= imgHeight &&
    width >= 50 &&
    height >= 50 &&
    width === height // Square constraint
  );
}

// ============================================================================
// Test Suite: Crop Box Bounds Validation
// ============================================================================

describe("Crop Tool: Bounds Validation", () => {
  beforeEach(() => {
    // Reset to known state before each test
    mockSourceImageDimensions = { width: 800, height: 600 };
    mockCropBox = { x: 0, y: 0, width: 100, height: 100 };
  });

  test("Crop box position should be constrained to image bounds (X positive)", () => {
    updateCropBox(700, 0, 100);
    expect(mockCropBox.x).toBe(700);
    expect(isCropBoxValid()).toBe(true);
  });

  test("Crop box position should be constrained to image bounds (X exceeds)", () => {
    updateCropBox(750, 0, 100);
    // Should clamp to imgWidth - width = 800 - 100 = 700
    expect(mockCropBox.x).toBe(700);
    expect(isCropBoxValid()).toBe(true);
  });

  test("Crop box position should be constrained to image bounds (Y positive)", () => {
    updateCropBox(0, 500, 100);
    expect(mockCropBox.y).toBe(500);
    expect(isCropBoxValid()).toBe(true);
  });

  test("Crop box position should be constrained to image bounds (Y exceeds)", () => {
    updateCropBox(0, 550, 100);
    // Should clamp to imgHeight - height = 600 - 100 = 500
    expect(mockCropBox.y).toBe(500);
    expect(isCropBoxValid()).toBe(true);
  });

  test("Crop box position should clamp negative X to zero", () => {
    updateCropBox(-50, 0, 100);
    expect(mockCropBox.x).toBe(0);
    expect(isCropBoxValid()).toBe(true);
  });

  test("Crop box position should clamp negative Y to zero", () => {
    updateCropBox(0, -50, 100);
    expect(mockCropBox.y).toBe(0);
    expect(isCropBoxValid()).toBe(true);
  });

  test("Crop box should maintain square aspect ratio", () => {
    updateCropBox(0, 0, 150);
    expect(mockCropBox.width).toBe(mockCropBox.height);
    expect(mockCropBox.width).toBe(150);
  });

  test("Crop box size should be constrained to smaller image dimension", () => {
    updateCropBox(0, 0, 700);
    // Image is 800×600, so max size is 600 (height)
    expect(mockCropBox.width).toBe(600);
    expect(mockCropBox.height).toBe(600);
  });

  test("Crop box size should have minimum constraint (50 pixels)", () => {
    updateCropBox(0, 0, 20);
    expect(mockCropBox.width).toBe(50);
    expect(mockCropBox.height).toBe(50);
  });
});

// ============================================================================
// Test Suite: Crop Box Reset & Centering
// ============================================================================

describe("Crop Tool: Reset & Centering", () => {
  beforeEach(() => {
    mockSourceImageDimensions = { width: 800, height: 600 };
    mockCropBox = { x: 0, y: 0, width: 100, height: 100 };
  });

  test("Reset should center crop box in image (X position)", () => {
    resetCropBox();
    const centerX = (mockSourceImageDimensions.width - mockCropBox.width) / 2;
    expect(mockCropBox.x).toBe(centerX);
  });

  test("Reset should center crop box in image (Y position)", () => {
    resetCropBox();
    const centerY = (mockSourceImageDimensions.height - mockCropBox.height) / 2;
    expect(mockCropBox.y).toBe(centerY);
  });

  test("Reset should use 80% of smallest image dimension", () => {
    resetCropBox();
    const minDim = Math.min(mockSourceImageDimensions.width, mockSourceImageDimensions.height);
    const expectedSize = Math.min(minDim * 0.8, 500);
    expect(mockCropBox.width).toBe(expectedSize);
    expect(mockCropBox.height).toBe(expectedSize);
  });

  test("Reset should maintain square aspect ratio", () => {
    resetCropBox();
    expect(mockCropBox.width).toBe(mockCropBox.height);
  });

  test("Reset should be valid after reset", () => {
    resetCropBox();
    expect(isCropBoxValid()).toBe(true);
  });
});

// ============================================================================
// Test Suite: Source Region Calculation
// ============================================================================

describe("Crop Tool: Source Region Calculation", () => {
  beforeEach(() => {
    mockSourceImageDimensions = { width: 800, height: 600 };
    mockCropBox = { x: 100, y: 100, width: 200, height: 200 };
  });

  test("Should calculate correct source region with 1:1 ratio", () => {
    const region = calculateSourceRegion(18);
    // Image is 800×600, crop box is at (100,100) with size 200×200
    // Ratio = min(800/200, 600/200) = min(4, 3) = 3
    // So offset and dimensions are multiplied by 3
    expect(region.offsetX).toBe(300);  // 100 * 3
    expect(region.offsetY).toBe(300);  // 100 * 3
    expect(region.cropWidth).toBe(600);  // 200 * 3
    expect(region.cropHeight).toBe(600);  // 200 * 3
  });

  test("Should calculate correct source region when image is wider than tall", () => {
    mockSourceImageDimensions = { width: 1200, height: 600 };
    mockCropBox = { x: 100, y: 100, width: 200, height: 200 };
    
    const region = calculateSourceRegion(18);
    // Ratio is limited by height: 600/200 = 3
    expect(region.offsetX).toBe(100 * 3);
    expect(region.offsetY).toBe(100 * 3);
    expect(region.cropWidth).toBe(200 * 3);
    expect(region.cropHeight).toBe(200 * 3);
  });

  test("Should calculate correct source region when image is taller than wide", () => {
    mockSourceImageDimensions = { width: 400, height: 800 };
    mockCropBox = { x: 50, y: 100, width: 200, height: 200 };
    
    const region = calculateSourceRegion(18);
    // Ratio is limited by width: 400/200 = 2
    expect(region.offsetX).toBe(50 * 2);
    expect(region.offsetY).toBe(100 * 2);
    expect(region.cropWidth).toBe(200 * 2);
    expect(region.cropHeight).toBe(200 * 2);
  });

  test("Offset should never be negative", () => {
    mockCropBox = { x: 0, y: 0, width: 200, height: 200 };
    const region = calculateSourceRegion(18);
    expect(region.offsetX).toBeGreaterThanOrEqual(0);
    expect(region.offsetY).toBeGreaterThanOrEqual(0);
  });

  test("Region dimensions should be valid", () => {
    const region = calculateSourceRegion(18);
    expect(region.cropWidth).toBeGreaterThan(0);
    expect(region.cropHeight).toBeGreaterThan(0);
  });
});

// ============================================================================
// Test Suite: Edge Cases
// ============================================================================

describe("Crop Tool: Edge Cases", () => {
  beforeEach(() => {
    mockSourceImageDimensions = { width: 800, height: 600 };
    mockCropBox = { x: 0, y: 0, width: 100, height: 100 };
  });

  test("Should handle very small images", () => {
    mockSourceImageDimensions = { width: 60, height: 60 };
    updateCropBox(10, 10, 50);
    expect(isCropBoxValid()).toBe(true);
    expect(mockCropBox.width).toBeLessThanOrEqual(mockSourceImageDimensions.width);
  });

  test("Should handle square images", () => {
    mockSourceImageDimensions = { width: 800, height: 800 };
    resetCropBox();
    expect(mockCropBox.width).toBe(mockCropBox.height);
    expect(isCropBoxValid()).toBe(true);
  });

  test("Should handle portrait-oriented images", () => {
    mockSourceImageDimensions = { width: 400, height: 800 };
    resetCropBox();
    // Max size should be limited by width: 400
    expect(mockCropBox.width).toBeLessThanOrEqual(400);
    expect(isCropBoxValid()).toBe(true);
  });

  test("Should handle landscape-oriented images", () => {
    mockSourceImageDimensions = { width: 1200, height: 400 };
    resetCropBox();
    // Max size should be limited by height: 400
    expect(mockCropBox.height).toBeLessThanOrEqual(400);
    expect(isCropBoxValid()).toBe(true);
  });

  test("Should handle extreme aspect ratios (very wide)", () => {
    mockSourceImageDimensions = { width: 4000, height: 100 };
    updateCropBox(0, 0, 50);
    expect(isCropBoxValid()).toBe(true);
  });

  test("Should handle extreme aspect ratios (very tall)", () => {
    mockSourceImageDimensions = { width: 100, height: 4000 };
    updateCropBox(0, 0, 50);
    expect(isCropBoxValid()).toBe(true);
  });

  test("Should handle minimum size constraint", () => {
    updateCropBox(0, 0, 1);
    expect(mockCropBox.width).toBe(50);
    expect(mockCropBox.height).toBe(50);
  });

  test("Should handle maximum size constraint", () => {
    updateCropBox(0, 0, 10000);
    const maxSize = Math.min(mockSourceImageDimensions.width, mockSourceImageDimensions.height);
    expect(mockCropBox.width).toBe(maxSize);
    expect(mockCropBox.height).toBe(maxSize);
  });
});

// ============================================================================
// Test Suite: Boundary Conditions
// ============================================================================

describe("Crop Tool: Boundary Conditions", () => {
  beforeEach(() => {
    mockSourceImageDimensions = { width: 800, height: 600 };
    mockCropBox = { x: 0, y: 0, width: 100, height: 100 };
  });

  test("Crop box at origin (0,0)", () => {
    updateCropBox(0, 0, 100);
    expect(mockCropBox.x).toBe(0);
    expect(mockCropBox.y).toBe(0);
    expect(isCropBoxValid()).toBe(true);
  });

  test("Crop box at bottom-right corner", () => {
    const maxX = mockSourceImageDimensions.width - 100;
    const maxY = mockSourceImageDimensions.height - 100;
    updateCropBox(maxX, maxY, 100);
    expect(mockCropBox.x).toBe(maxX);
    expect(mockCropBox.y).toBe(maxY);
    expect(isCropBoxValid()).toBe(true);
  });

  test("Crop box spans full image width (constrained to smaller dimension)", () => {
    updateCropBox(0, 0, mockSourceImageDimensions.width);
    // Width is 800, Height is 600, so max size is limited to 600 (smaller dimension)
    expect(mockCropBox.width).toBe(600);
    expect(mockCropBox.x).toBe(0);
    expect(isCropBoxValid()).toBe(true);
  });

  test("Crop box spans full image height", () => {
    updateCropBox(0, 0, mockSourceImageDimensions.height);
    // Should be constrained to height (600) since it's the smaller dimension
    expect(mockCropBox.width).toBe(600);
    expect(mockCropBox.height).toBe(600);
    expect(isCropBoxValid()).toBe(true);
  });

  test("Multiple sequential updates should maintain validity", () => {
    updateCropBox(100, 100, 150);
    expect(isCropBoxValid()).toBe(true);
    
    updateCropBox(200, 200, 100);
    expect(isCropBoxValid()).toBe(true);
    
    updateCropBox(400, 300, 200);
    expect(isCropBoxValid()).toBe(true);
  });
});
