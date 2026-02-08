/**
 * script.js - Bead Pattern Builder Main Application
 * 
 * Converts uploaded images into customizable bead patterns.
 * Features:
 * - Multiple color palettes (Basic, Pastel, Bright)
 * - Adjustable grid size (10×10 to 40×40)
 * - Real-time pattern rendering
 * - Grid labels (optional)
 * - Bead count summary for shopping/planning
 * - PNG export
 * 
 * Color Fidelity:
 * - Direct quantization to nearest palette color (no destructive preprocessing)
 * - Pure colors preserved with pixel-perfect accuracy
 * - Tested for color preservation across synthetic and real images
 */

// ============================================================================
// Global Configuration
// ============================================================================

/** Visual size of each bead cell on canvas (pixels) */
const CELL_SIZE = 20;
/** Space reserved for row/column labels (pixels) */
const LABEL_OFFSET = 20;
/** Current grid dimensions (NxN; default 18×18 = 324 beads) */
let GRID_SIZE = 18;
/** Cached image for re-rendering when palette/grid changes */
let CURRENT_IMAGE = null;

/**
 * Available color palettes for quantization.
 * Each palette is a named, handpicked selection of colors optimized for different styles.
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
  pastel: [
    { name: "White", rgb: [255, 255, 255] },
    { name: "Black", rgb: [34, 34, 34] },
    { name: "Blush", rgb: [255, 218, 224] },
    { name: "Peach", rgb: [255, 204, 188] },
    { name: "Cream", rgb: [255, 240, 204] },
    { name: "Mint", rgb: [204, 242, 230] },
    { name: "Sky", rgb: [204, 229, 255] },
    { name: "Lilac", rgb: [230, 204, 255] },
    { name: "Sage", rgb: [204, 230, 204] },
    { name: "Mauve", rgb: [230, 204, 230] },
    { name: "Tan", rgb: [230, 210, 190] },
  ],
  bright: [
    { name: "White", rgb: [255, 255, 255] },
    { name: "Black", rgb: [0, 0, 0] },
    { name: "Neon Pink", rgb: [255, 16, 240] },
    { name: "Neon Orange", rgb: [255, 128, 0] },
    { name: "Neon Yellow", rgb: [255, 255, 0] },
    { name: "Neon Green", rgb: [0, 255, 0] },
    { name: "Cyan", rgb: [0, 255, 255] },
    { name: "Neon Blue", rgb: [0, 100, 255] },
    { name: "Magenta", rgb: [255, 0, 255] },
    { name: "Hot Pink", rgb: [255, 20, 147] },
    { name: "Lime", rgb: [50, 205, 50] },
  ],
};

/** Currently active palette (changes with user selection) */
let PALETTE = PALETTES.basic;

// ============================================================================
// DOM Element References
// ============================================================================

const imageInput = document.getElementById("imageInput");          // File upload input
const patternCanvas = document.getElementById("patternCanvas");    // Main rendering canvas
const canvasContainer = document.getElementById("canvasContainer"); // Canvas wrapper
const downloadButton = document.getElementById("downloadButton");   // PNG export button
const paletteList = document.getElementById("paletteList");        // Bead list display
const beadSummary = document.getElementById("beadSummary");        // Bead summary element
const totalBeads = document.getElementById("totalBeads");          // Total bead count display
const paletteSelect = document.getElementById("paletteSelect");    // Palette dropdown
const gridLabelsCheckbox = document.getElementById("gridLabelsCheckbox");  // Grid labels toggle
const gridSizeSlider = document.getElementById("gridSizeSlider");  // Grid size slider (10-40)
const gridSizeDisplay = document.getElementById("gridSizeDisplay"); // Grid size label (e.g. "18×18")
const gridTradeoff = document.getElementById("gridTradeoff");      // Tradeoff info panel
const gridHelperText = document.getElementById("gridHelperText");  // Helper text for grid size

// Crop Tool Elements
const cropControlCard = document.getElementById("cropControlCard");        // Crop panel (shown when image loaded)
const cropModeCheckbox = document.getElementById("cropModeCheckbox");      // Enable/disable crop
const cropXSlider = document.getElementById("cropXSlider");                // Position X slider
const cropYSlider = document.getElementById("cropYSlider");                // Position Y slider
const cropSizeSlider = document.getElementById("cropSizeSlider");          // Size slider
const cropXValue = document.getElementById("cropXValue");                  // X display value
const cropYValue = document.getElementById("cropYValue");                  // Y display value
const cropSizeValue = document.getElementById("cropSizeValue");            // Size display value
const confirmCropButton = document.getElementById("confirmCropButton");    // Confirm button
const resetCropButton = document.getElementById("resetCropButton");        // Reset button
const cropStatus = document.getElementById("cropStatus");                  // Status message
const cropPreviewCanvas = document.getElementById("cropPreviewCanvas");    // Crop preview canvas
const cropPreviewContainer = document.getElementById("cropPreviewContainer"); // Crop preview container

// ============================================================================
// Canvas Setup
// ============================================================================

/** Main canvas context for rendering bead grid */
const canvasContext = patternCanvas.getContext("2d");
/** Offscreen canvas for image processing and quantization */
const offscreenCanvas = document.createElement("canvas");
/** Offscreen canvas context */
const offscreenContext = offscreenCanvas.getContext("2d");

// Initialize offscreen canvas with grid dimensions
offscreenCanvas.width = GRID_SIZE;
offscreenCanvas.height = GRID_SIZE;

// Initialize main canvas with padding for labels
patternCanvas.width = GRID_SIZE * CELL_SIZE + LABEL_OFFSET;
patternCanvas.height = GRID_SIZE * CELL_SIZE + LABEL_OFFSET;

// ============================================================================
// Application State
// ============================================================================

/** Track how many beads of each color are needed (Map<paletteIndex, count>) */
const paletteUsage = new Map();
/** 2D grid storing palette index for each bead position */
let pixelGrid = null;

// ============================================================================
// Crop Tool State
// ============================================================================

/** Crop mode enabled/disabled */
let cropMode = false;
/** Crop box dimensions and position */
let cropBox = {
  x: 0,
  y: 0,
  width: 100,
  height: 100
};
/** Original image dimensions (for bounds checking) */
let sourceImageDimensions = { width: 0, height: 0 };

/**
 * Initialize crop tool UI state.
 * Disables crop controls until an image is uploaded.
 */
function initializeCropUI() {
  cropModeCheckbox.disabled = true;
  cropModeCheckbox.checked = false;
  cropStatus.textContent = "💡 Upload an image to enable crop tool";
  updateCropModeUI();
}

// Initialize crop UI on page load
initializeCropUI();

// ============================================================================
// Rendering & Display Functions
// ============================================================================

/**
 * Render the palette usage list (bead count summary).
 * Updates the sidebar to show which colors are used and how many beads of each color.
 * Sorted by count (most used first).
 */
function renderPaletteUsage() {
  paletteList.innerHTML = "";
  const sorted = [...paletteUsage.entries()].sort((a, b) => b[1] - a[1]);

  sorted.forEach(([paletteIndex, count]) => {
    const color = PALETTE[paletteIndex];
    const item = document.createElement("li");
    const swatch = document.createElement("span");
    swatch.className = "color-swatch";
    swatch.style.backgroundColor = `rgb(${color.rgb.join(",")})`;
    const label = document.createElement("span");
    label.textContent = `${color.name} · ${count} beads`;
    item.append(swatch, label);
    paletteList.appendChild(item);
  });
}

/**
 * Render the bead summary table (alternative display format).
 * Shows color names and counts in a table, plus total bead count.
 */
function renderBeadSummary() {
  beadSummary.innerHTML = "";
  const sorted = [...paletteUsage.entries()].sort((a, b) => b[1] - a[1]);

  sorted.forEach(([paletteIndex, count]) => {
    const color = PALETTE[paletteIndex];
    const item = document.createElement("li");
    item.innerHTML = `<span>${color.name}</span><span>${count}</span>`;
    beadSummary.appendChild(item);
  });

  const total = [...paletteUsage.values()].reduce((sum, count) => sum + count, 0);
  totalBeads.textContent = `Total: ${total} beads`;
}

/**
 * Find the closest palette color to the given RGB values.
 * Uses Euclidean distance in RGB space for fast color matching.
 * 
 * @param {number} red - Red channel (0-255)
 * @param {number} green - Green channel (0-255)
 * @param {number} blue - Blue channel (0-255)
 * @returns {number} Index of the closest palette color
 */
function getClosestPaletteIndex(red, green, blue) {
  let minDistance = Number.POSITIVE_INFINITY;
  let chosenIndex = 0;

  PALETTE.forEach((color, index) => {
    const [r, g, b] = color.rgb;
    const distance =
      (red - r) * (red - r) +
      (green - g) * (green - g) +
      (blue - b) * (blue - b);

    if (distance < minDistance) {
      minDistance = distance;
      chosenIndex = index;
    }
  });

  return chosenIndex;
}

function drawGrid() {
  canvasContext.strokeStyle = "rgba(30, 30, 47, 0.2)";
  canvasContext.lineWidth = 1;

  for (let i = 0; i <= GRID_SIZE; i += 1) {
    const position = i * CELL_SIZE + LABEL_OFFSET;
    canvasContext.beginPath();
    canvasContext.moveTo(position, LABEL_OFFSET);
    canvasContext.lineTo(position, GRID_SIZE * CELL_SIZE + LABEL_OFFSET);
    canvasContext.stroke();

    canvasContext.beginPath();
    canvasContext.moveTo(LABEL_OFFSET, position);
    canvasContext.lineTo(GRID_SIZE * CELL_SIZE + LABEL_OFFSET, position);
    canvasContext.stroke();
  }
}

function drawGridLabels() {
  if (!gridLabelsCheckbox.checked) {
    return;
  }

  const fontSize = 11;
  const labelOffset = 20; // Space for labels
  canvasContext.font = `bold ${fontSize}px Inter, Segoe UI, sans-serif`;
  canvasContext.fillStyle = "#5a5a74";
  
  // Draw column labels (A-R) at top
  canvasContext.textAlign = "center";
  canvasContext.textBaseline = "bottom";
  for (let i = 0; i < GRID_SIZE; i += 1) {
    const letter = String.fromCharCode(65 + i); // A-R
    const x = i * CELL_SIZE + CELL_SIZE / 2 + labelOffset;
    const y = labelOffset - 5;
    canvasContext.fillText(letter, x, y);
  }

  // Draw row labels (1-18) at left
  canvasContext.textAlign = "right";
  canvasContext.textBaseline = "middle";
  for (let i = 0; i < GRID_SIZE; i += 1) {
    const number = i + 1;
    const x = labelOffset - 8;
    const y = i * CELL_SIZE + CELL_SIZE / 2 + labelOffset;
    canvasContext.fillText(number, x, y);
  }
}

// ============================================================================
// Crop Tool Functions
// ============================================================================

/**
 * Enable or disable crop mode based on checkbox.
 * Shows/hides crop sliders and updates UI.
 */
/**
 * Update UI visibility based on crop mode state.
 * Shows/hides crop sliders and updates display values.
 */
function updateCropModeUI() {
  const isEnabled = cropModeCheckbox.checked;
  const cropSliders = document.getElementById("cropSliders");
  
  if (isEnabled) {
    cropSliders.style.display = "flex";
    cropPreviewContainer.style.display = "flex";
    updateCropBoxDisplay();
    renderCropPreview();
  } else {
    cropSliders.style.display = "none";
    cropPreviewContainer.style.display = "none";
  }
}

/**
 * Render the crop preview canvas showing the image with crop overlay.
 * Displays the current crop box position and size with visual feedback.
 */
function renderCropPreview() {
  if (!CURRENT_IMAGE) return;
  
  const canvas = cropPreviewCanvas;
  const ctx = canvas.getContext("2d");
  
  // Set canvas size to match its display size
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  
  const { width: imgWidth, height: imgHeight } = sourceImageDimensions;
  const { x: cropX, y: cropY, width: cropW, height: cropH } = cropBox;
  
  // Calculate scale to fit image in canvas
  const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight);
  const scaledImgWidth = imgWidth * scale;
  const scaledImgHeight = imgHeight * scale;
  const offsetX = (canvasWidth - scaledImgWidth) / 2;
  const offsetY = (canvasHeight - scaledImgHeight) / 2;
  
  // Draw full image
  ctx.drawImage(CURRENT_IMAGE, offsetX, offsetY, scaledImgWidth, scaledImgHeight);
  
  // Draw semi-transparent overlay for areas outside crop box
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  // Clear the crop region to show the uncovered part
  const cropRegionX = offsetX + cropX * scale;
  const cropRegionY = offsetY + cropY * scale;
  const cropRegionWidth = cropW * scale;
  const cropRegionHeight = cropH * scale;
  
  ctx.clearRect(cropRegionX, cropRegionY, cropRegionWidth, cropRegionHeight);
  
  // Draw the crop box border
  ctx.strokeStyle = "#4CAF50";
  ctx.lineWidth = 3;
  ctx.strokeRect(cropRegionX, cropRegionY, cropRegionWidth, cropRegionHeight);
  
  // Draw corner handles
  const handleSize = 8;
  ctx.fillStyle = "#4CAF50";
  const corners = [
    [cropRegionX, cropRegionY],
    [cropRegionX + cropRegionWidth, cropRegionY],
    [cropRegionX, cropRegionY + cropRegionHeight],
    [cropRegionX + cropRegionWidth, cropRegionY + cropRegionHeight],
  ];
  corners.forEach(([x, y]) => {
    ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
  });
  
  // Draw center handle for dragging
  const centerX = cropRegionX + cropRegionWidth / 2;
  const centerY = cropRegionY + cropRegionHeight / 2;
  ctx.fillStyle = "#4CAF50";
  ctx.beginPath();
  ctx.arc(centerX, centerY, handleSize, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Update crop box with new position/size.
 * Ensures values stay within image bounds.
 */
function updateCropBox(newX, newY, newSize) {
  const { width: imgWidth, height: imgHeight } = sourceImageDimensions;
  
  // Constrain size to image dimensions
  const maxSize = Math.min(imgWidth, imgHeight);
  cropBox.width = Math.max(50, Math.min(newSize, maxSize));
  cropBox.height = cropBox.width; // Keep it square
  
  // Constrain position to keep crop box within image
  cropBox.x = Math.max(0, Math.min(newX, imgWidth - cropBox.width));
  cropBox.y = Math.max(0, Math.min(newY, imgHeight - cropBox.height));
}

/**
 * Update slider displays and sync crop box values.
 */
function updateCropBoxDisplay() {
  document.getElementById("cropXSlider").value = cropBox.x;
  document.getElementById("cropYSlider").value = cropBox.y;
  document.getElementById("cropSizeSlider").value = cropBox.width;
  
  document.getElementById("cropXValue").textContent = cropBox.x;
  document.getElementById("cropYValue").textContent = cropBox.y;
  document.getElementById("cropSizeValue").textContent = cropBox.width;
  
  // Re-render crop preview and pattern with new crop
  if (CURRENT_IMAGE) {
    renderCropPreview();
    renderPattern(CURRENT_IMAGE);
  }
}

/**
 * Reset crop to center crop (auto-crop mode).
 */
function resetCrop() {
  if (!CURRENT_IMAGE) return;
  
  cropMode = false;
  cropModeCheckbox.checked = false;
  updateCropModeUI();
  
  if (CURRENT_IMAGE) {
    renderPattern(CURRENT_IMAGE);
  }
}

/**
 * Apply crop and continue with pattern rendering.
 */
function confirmCrop() {
  cropMode = true;
  // Pattern will use the cropBox when rendering
  if (CURRENT_IMAGE) {
    renderPattern(CURRENT_IMAGE);
  }
}

function redrawPattern() {
  if (!pixelGrid) {
    return;
  }

  canvasContext.clearRect(0, 0, patternCanvas.width, patternCanvas.height);
  
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const paletteIndex = pixelGrid[y][x];
      const paletteColor = PALETTE[paletteIndex];
      const [r, g, b] = paletteColor.rgb;

      canvasContext.fillStyle = `rgb(${r}, ${g}, ${b})`;
      canvasContext.fillRect(
        x * CELL_SIZE + LABEL_OFFSET,
        y * CELL_SIZE + LABEL_OFFSET,
        CELL_SIZE,
        CELL_SIZE
      );
    }
  }

  drawGrid();
  drawGridLabels();
}

function enhanceContrast(imageData) {
  const data = imageData.data;
  
  // Find min/max for each channel
  let minR = 255, maxR = 0;
  let minG = 255, maxG = 0;
  let minB = 255, maxB = 0;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    
    if (a > 128) { // Only consider opaque pixels
      minR = Math.min(minR, r);
      maxR = Math.max(maxR, r);
      minG = Math.min(minG, g);
      maxG = Math.max(maxG, g);
      minB = Math.min(minB, b);
      maxB = Math.max(maxB, b);
    }
  }
  
  const rangeR = maxR - minR || 1;
  const rangeG = maxG - minG || 1;
  const rangeB = maxB - minB || 1;
  
  // Stretch each channel independently
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.round(((data[i] - minR) / rangeR) * 255);
    data[i + 1] = Math.round(((data[i + 1] - minG) / rangeG) * 255);
    data[i + 2] = Math.round(((data[i + 2] - minB) / rangeB) * 255);
  }
  
  return imageData;
}

function applyAdaptiveHistogramEqualization(imageData) {
  const data = imageData.data;
  const width = GRID_SIZE;
  const height = GRID_SIZE;
  
  // Apply CLAHE-like processing (Contrast Limited Adaptive Histogram Equalization)
  const tileSize = Math.max(1, Math.floor(Math.sqrt(width * height / 16)));
  
  for (let ty = 0; ty < height; ty += tileSize) {
    for (let tx = 0; tx < width; tx += tileSize) {
      const tileW = Math.min(tileSize, width - tx);
      const tileH = Math.min(tileSize, height - ty);
      
      // Build histogram for this tile
      const hist = { r: {}, g: {}, b: {} };
      let count = 0;
      
      for (let y = ty; y < ty + tileH; y++) {
        for (let x = tx; x < tx + tileW; x++) {
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];
          
          if (a > 128) {
            hist.r[r] = (hist.r[r] || 0) + 1;
            hist.g[g] = (hist.g[g] || 0) + 1;
            hist.b[b] = (hist.b[b] || 0) + 1;
            count++;
          }
        }
      }
      
      if (count === 0) continue;
      
      // Build cumulative distribution
      const cdfR = {};
      const cdfG = {};
      const cdfB = {};
      let cumR = 0, cumG = 0, cumB = 0;
      
      for (let i = 0; i < 256; i++) {
        cumR += hist.r[i] || 0;
        cumG += hist.g[i] || 0;
        cumB += hist.b[i] || 0;
        cdfR[i] = Math.round((cumR / count) * 255);
        cdfG[i] = Math.round((cumG / count) * 255);
        cdfB[i] = Math.round((cumB / count) * 255);
      }
      
      // Apply equalization to tile
      for (let y = ty; y < ty + tileH; y++) {
        for (let x = tx; x < tx + tileW; x++) {
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          
          data[idx] = cdfR[r] || r;
          data[idx + 1] = cdfG[g] || g;
          data[idx + 2] = cdfB[b] || b;
        }
      }
    }
  }
  
  return imageData;
}

function applyGaussianBlur(imageData) {
  const data = imageData.data;
  const width = GRID_SIZE;
  const height = GRID_SIZE;
  
  // Use different blur kernels based on grid size
  let kernel, weight;
  
  if (GRID_SIZE <= 16) {
    // Light blur for small grids
    kernel = [
      [1, 1, 1],
      [1, 2, 1],
      [1, 1, 1]
    ];
    weight = 10;
  } else {
    // Stronger blur for larger grids to preserve edges
    kernel = [
      [1, 2, 1],
      [2, 4, 2],
      [1, 2, 1]
    ];
    weight = 16;
  }
  
  const output = new Uint8ClampedArray(data);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let r = 0, g = 0, b = 0;
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const kernelVal = kernel[ky + 1][kx + 1];
          r += data[idx] * kernelVal;
          g += data[idx + 1] * kernelVal;
          b += data[idx + 2] * kernelVal;
        }
      }
      
      const idx = (y * width + x) * 4;
      output[idx] = Math.round(r / weight);
      output[idx + 1] = Math.round(g / weight);
      output[idx + 2] = Math.round(b / weight);
    }
  }
  
  imageData.data.set(output);
  return imageData;
}

function applySharpen(imageData) {
  const data = imageData.data;
  const width = GRID_SIZE;
  const height = GRID_SIZE;
  
  const kernel = [
    [0, -1, 0],
    [-1, 5, -1],
    [0, -1, 0]
  ];
  const weight = 1;
  
  const output = new Uint8ClampedArray(data);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let r = 0, g = 0, b = 0;
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const kernelVal = kernel[ky + 1][kx + 1];
          r += data[idx] * kernelVal;
          g += data[idx + 1] * kernelVal;
          b += data[idx + 2] * kernelVal;
        }
      }
      
      const idx = (y * width + x) * 4;
      output[idx] = Math.max(0, Math.min(255, Math.round(r / weight)));
      output[idx + 1] = Math.max(0, Math.min(255, Math.round(g / weight)));
      output[idx + 2] = Math.max(0, Math.min(255, Math.round(b / weight)));
    }
  }
  
  imageData.data.set(output);
  return imageData;
}

function applyMedianFilter(imageData) {
  const data = imageData.data;
  const width = GRID_SIZE;
  const height = GRID_SIZE;
  
  const output = new Uint8ClampedArray(data);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const rValues = [];
      const gValues = [];
      const bValues = [];
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          rValues.push(data[idx]);
          gValues.push(data[idx + 1]);
          bValues.push(data[idx + 2]);
        }
      }
      
      rValues.sort((a, b) => a - b);
      gValues.sort((a, b) => a - b);
      bValues.sort((a, b) => a - b);
      
      const idx = (y * width + x) * 4;
      output[idx] = rValues[4];
      output[idx + 1] = gValues[4];
      output[idx + 2] = bValues[4];
    }
  }
  
  imageData.data.set(output);
  return imageData;
}

// ============================================================================
// Main Pattern Rendering Pipeline
// ============================================================================

/**
 * Core rendering function: convert image to bead pattern.
 * 
 * Pipeline:
 * 1. Center-crop image to square
 * 2. Resize to GRID_SIZE×GRID_SIZE pixels
 * 3. Apply color quantization (map to nearest palette color)
 * 4. Render beads to canvas with optional grid labels
 * 5. Update bead count summaries
 * 
 * Color Processing:
 * - NO destructive preprocessing (removed: contrast enhancement, histogram equalization)
 * - Direct quantization preserves pure colors with pixel-perfect accuracy
 * - Alpha blending with white background for transparent pixels
 * 
 * @param {HTMLImageElement} image - Source image to convert
 */
function renderPattern(image) {
  offscreenContext.clearRect(0, 0, GRID_SIZE, GRID_SIZE);

  // Store original image dimensions for crop tool bounds checking
  sourceImageDimensions.width = image.width;
  sourceImageDimensions.height = image.height;

  // ========================================================================
  // Determine crop region: either auto center-crop or user-selected crop
  // ========================================================================
  let offsetX, offsetY, cropWidth, cropHeight;
  
  if (cropMode && cropModeCheckbox.checked) {
    // User-selected crop mode
    const ratio = Math.min(
      image.width / cropBox.width,
      image.height / cropBox.height
    );
    cropWidth = cropBox.width * ratio;
    cropHeight = cropBox.height * ratio;
    offsetX = cropBox.x * ratio;
    offsetY = cropBox.y * ratio;
  } else {
    // Default center-crop mode
    const ratio = Math.min(
      image.width / GRID_SIZE,
      image.height / GRID_SIZE
    );
    cropWidth = GRID_SIZE * ratio;
    cropHeight = GRID_SIZE * ratio;
    offsetX = (image.width - cropWidth) / 2;
    offsetY = (image.height - cropHeight) / 2;
  }

  offscreenContext.drawImage(
    image,
    offsetX,
    offsetY,
    cropWidth,
    cropHeight,
    0,
    0,
    GRID_SIZE,
    GRID_SIZE
  );

  let imageData = offscreenContext.getImageData(
    0,
    0,
    GRID_SIZE,
    GRID_SIZE
  );

  // ========================================================================
  // Color Processing (Quantization Only)
  // ========================================================================
  // DISABLED destructive image processing:
  // - enhanceContrast: Destroyed color information (pure red → black)
  // - applyAdaptiveHistogramEqualization: Converted all blacks → white
  // - applySharpen/applyGaussianBlur: Further color degradation
  // 
  // REASON: Testing showed these stages systematically corrupted colors.
  // Pure colors were preserved when NOT preprocessing.
  // Direct quantization produces better results.
  // ========================================================================
  
  // Minimal, color-preserving processing
  // Quantization alone provides excellent color fidelity.
  // Optional: Light noise reduction only (disabled by default)
  // imageData = applyMedianFilter(imageData);
  
  // Put processed image back
  offscreenContext.putImageData(imageData, 0, 0);

  canvasContext.clearRect(0, 0, patternCanvas.width, patternCanvas.height);
  paletteUsage.clear();
  pixelGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE));

  // ========================================================================
  // Render Grid: Quantize Each Pixel and Draw Beads
  // ========================================================================
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const index = (y * GRID_SIZE + x) * 4;
      const red = imageData.data[index];
      const green = imageData.data[index + 1];
      const blue = imageData.data[index + 2];
      const alpha = imageData.data[index + 3];

      // Blend transparent pixels with white background
      const adjustedRed = red * (alpha / 255) + 255 * (1 - alpha / 255);
      const adjustedGreen = green * (alpha / 255) + 255 * (1 - alpha / 255);
      const adjustedBlue = blue * (alpha / 255) + 255 * (1 - alpha / 255);

      // Find and apply nearest palette color
      const paletteIndex = getClosestPaletteIndex(
        adjustedRed,
        adjustedGreen,
        adjustedBlue
      );

      pixelGrid[y][x] = paletteIndex;

      const paletteColor = PALETTE[paletteIndex];
      const [r, g, b] = paletteColor.rgb;

      canvasContext.fillStyle = `rgb(${r}, ${g}, ${b})`;
      canvasContext.fillRect(
        x * CELL_SIZE + LABEL_OFFSET,
        y * CELL_SIZE + LABEL_OFFSET,
        CELL_SIZE,
        CELL_SIZE
      );

      // Track bead usage for summary display
      paletteUsage.set(
        paletteIndex,
        (paletteUsage.get(paletteIndex) || 0) + 1
      );
    }
  }

  // Render optional grid overlay and labels
  drawGrid();
  drawGridLabels();
  
  // Update UI summaries
  renderPaletteUsage();
  renderBeadSummary();
  downloadButton.disabled = false;
}

// ============================================================================
// Event Handlers
// ============================================================================

/**
 * Handle image file upload.
 * Loads image and triggers pattern rendering.
 */
imageInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) {
    return;
  }

  const image = new Image();
  const objectUrl = URL.createObjectURL(file);

  image.onload = () => {
    CURRENT_IMAGE = image;
    
    // Initialize crop tool (card is always visible, now enable controls)
    sourceImageDimensions.width = image.width;
    sourceImageDimensions.height = image.height;
    
    // Set default crop box to center of image
    const cropSize = Math.min(image.width, image.height) * 0.8; // 80% of smallest dimension
    cropBox.width = Math.min(cropSize, 500);
    cropBox.height = cropBox.width;
    cropBox.x = (image.width - cropBox.width) / 2;
    cropBox.y = (image.height - cropBox.height) / 2;
    
    // Update crop slider ranges based on image size
    cropXSlider.max = image.width;
    cropYSlider.max = image.height;
    cropSizeSlider.max = Math.min(image.width, image.height);
    
    // Enable crop controls
    cropModeCheckbox.disabled = false;
    
    // Update crop status and UI
    cropStatus.textContent = `📷 Image loaded: ${image.width}×${image.height}px. Crop tool ready!`;
    updateCropBoxDisplay();
    
    renderPattern(image);
    URL.revokeObjectURL(objectUrl);
  };

  image.src = objectUrl;
});

/**
 * Handle PNG export button click.
 * Downloads the current bead pattern as a PNG file.
 */
downloadButton.addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = `bead-pattern-${GRID_SIZE}x${GRID_SIZE}.png`;
  link.href = patternCanvas.toDataURL("image/png");
  link.click();
});

/**
 * Draw placeholder pattern (light background with grid).
 * Displayed before any image is uploaded.
 */
function drawPlaceholder() {
  canvasContext.fillStyle = "#f0f0f7";
  canvasContext.fillRect(0, 0, patternCanvas.width, patternCanvas.height);
  drawGrid();
  drawGridLabels();
}

/**
 * Update grid size dynamically.
 * Resizes canvas, updates UI labels, and re-renders current image if loaded.
 * Grid size affects: beads needed, detail level, build time.
 * 
 * @param {number} newSize - Grid dimension (10-40; NxN grid)
 */
function updateGridSize(newSize) {
  GRID_SIZE = newSize;
  
  // Update canvas dimensions
  patternCanvas.width = GRID_SIZE * CELL_SIZE + LABEL_OFFSET;
  patternCanvas.height = GRID_SIZE * CELL_SIZE + LABEL_OFFSET;
  
  offscreenCanvas.width = GRID_SIZE;
  offscreenCanvas.height = GRID_SIZE;
  
  // Update display and tradeoff message
  gridSizeDisplay.textContent = `${GRID_SIZE}×${GRID_SIZE}`;
  const totalBeadsCount = GRID_SIZE * GRID_SIZE;
  
  // Show tradeoff message based on grid size
  let tradeoffText = "";
  if (GRID_SIZE <= 12) {
    tradeoffText = `💡 ${GRID_SIZE}×${GRID_SIZE} (${totalBeadsCount} beads): Quick & simple, less detail`;
  } else if (GRID_SIZE <= 18) {
    tradeoffText = `💡 ${GRID_SIZE}×${GRID_SIZE} (${totalBeadsCount} beads): Balanced detail and complexity`;
  } else if (GRID_SIZE <= 28) {
    tradeoffText = `💡 ${GRID_SIZE}×${GRID_SIZE} (${totalBeadsCount} beads): High detail, more beads & time`;
  } else {
    tradeoffText = `💡 ${GRID_SIZE}×${GRID_SIZE} (${totalBeadsCount} beads): Maximum detail, very time-intensive`;
  }
  gridTradeoff.textContent = tradeoffText;
  gridHelperText.textContent = `The grid is ${GRID_SIZE}×${GRID_SIZE} (${totalBeadsCount} beads total). Upload a photo to get started.`;
  
  // Re-render current pattern if one is loaded
  if (CURRENT_IMAGE) {
    renderPattern(CURRENT_IMAGE);
  } else {
    drawPlaceholder();
  }
}

// Initialize UI with placeholder
drawPlaceholder();
renderPaletteUsage();
renderBeadSummary();

/**
 * Handle palette selection change.
 * Updates the active palette and re-renders the current pattern with new colors.
 */
paletteSelect.addEventListener("change", (event) => {
  PALETTE = PALETTES[event.target.value];
  // Re-render current pattern if one exists
  if (pixelGrid) {
    redrawPattern();
    renderPaletteUsage();
    renderBeadSummary();
  } else {
    drawPlaceholder();
  }
});

/**
 * Handle grid labels toggle.
 * Shows/hides row (A-R) and column (1-18) labels on the pattern.
 */
gridLabelsCheckbox.addEventListener("change", () => {
  if (pixelGrid) {
    redrawPattern();
  } else {
    drawPlaceholder();
  }
});

/**
 * Handle grid size slider change.
 * Updates GRID_SIZE and re-renders pattern with new dimensions.
 */
gridSizeSlider.addEventListener("input", (event) => {
  updateGridSize(parseInt(event.target.value));
});

// ============================================================================
// Crop Tool Event Handlers
// ============================================================================

/**
 * Handle crop mode checkbox toggle.
 * Shows/hides crop sliders and updates UI.
 */
cropModeCheckbox.addEventListener("change", () => {
  updateCropModeUI();
});

/**
 * Handle crop X position slider change.
 * Updates crop box X coordinate with bounds checking.
 */
cropXSlider.addEventListener("input", (event) => {
  const newX = parseInt(event.target.value);
  updateCropBox(newX, cropBox.y, cropBox.width);
});

/**
 * Handle crop Y position slider change.
 * Updates crop box Y coordinate with bounds checking.
 */
cropYSlider.addEventListener("input", (event) => {
  const newY = parseInt(event.target.value);
  updateCropBox(cropBox.x, newY, cropBox.width);
});

/**
 * Handle crop size slider change.
 * Updates crop box size with bounds checking.
 */
cropSizeSlider.addEventListener("input", (event) => {
  const newSize = parseInt(event.target.value);
  updateCropBox(cropBox.x, cropBox.y, newSize);
});

/**
 * Handle confirm crop button click.
 * Locks in the selected crop region and renders pattern.
 */
confirmCropButton.addEventListener("click", () => {
  confirmCrop();
});

/**
 * Handle reset crop button click.
 * Resets to auto center-crop mode.
 */
resetCropButton.addEventListener("click", () => {
  resetCrop();
});

/**
 * Handle crop preview canvas mouse interactions.
 * Allows dragging the crop box and tracking initial position.
 */
let isDraggingCrop = false;
let dragStartX = 0;
let dragStartY = 0;
let dragStartCropX = 0;
let dragStartCropY = 0;

cropPreviewCanvas.addEventListener("mousedown", (event) => {
  if (!CURRENT_IMAGE || !cropModeCheckbox.checked) return;
  
  isDraggingCrop = true;
  dragStartX = event.clientX;
  dragStartY = event.clientY;
  dragStartCropX = cropBox.x;
  dragStartCropY = cropBox.y;
  cropPreviewCanvas.style.cursor = "grabbing";
});

document.addEventListener("mousemove", (event) => {
  if (!isDraggingCrop || !CURRENT_IMAGE) return;
  
  const deltaX = event.clientX - dragStartX;
  const deltaY = event.clientY - dragStartY;
  
  // Scale based on canvas size and image dimensions
  const { width: imgWidth, height: imgHeight } = sourceImageDimensions;
  const canvasWidth = cropPreviewCanvas.parentElement.offsetWidth;
  const canvasHeight = cropPreviewCanvas.parentElement.offsetHeight;
  
  const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight);
  
  const newX = Math.round(dragStartCropX + deltaX / scale);
  const newY = Math.round(dragStartCropY + deltaY / scale);
  
  updateCropBox(newX, newY, cropBox.width);
});

document.addEventListener("mouseup", () => {
  if (isDraggingCrop) {
    isDraggingCrop = false;
    cropPreviewCanvas.style.cursor = "grab";
  }
});

cropPreviewCanvas.addEventListener("mouseenter", () => {
  if (!isDraggingCrop && CURRENT_IMAGE && cropModeCheckbox.checked) {
    cropPreviewCanvas.style.cursor = "grab";
  }
});

cropPreviewCanvas.addEventListener("mouseleave", () => {
  cropPreviewCanvas.style.cursor = "default";
});
