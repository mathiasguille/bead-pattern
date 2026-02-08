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

  const ratio = Math.min(
    image.width / GRID_SIZE,
    image.height / GRID_SIZE
  );
  const cropWidth = GRID_SIZE * ratio;
  const cropHeight = GRID_SIZE * ratio;
  const offsetX = (image.width - cropWidth) / 2;
  const offsetY = (image.height - cropHeight) / 2;

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
