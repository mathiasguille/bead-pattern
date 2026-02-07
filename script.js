const CELL_SIZE = 20;
const LABEL_OFFSET = 20; // Space reserved for labels
let GRID_SIZE = 18;
let CURRENT_IMAGE = null; // Store current image for re-rendering

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

let PALETTE = PALETTES.basic;

const imageInput = document.getElementById("imageInput");
const patternCanvas = document.getElementById("patternCanvas");
const canvasContainer = document.getElementById("canvasContainer");
const downloadButton = document.getElementById("downloadButton");
const paletteList = document.getElementById("paletteList");
const beadSummary = document.getElementById("beadSummary");
const totalBeads = document.getElementById("totalBeads");
const paletteSelect = document.getElementById("paletteSelect");
const gridLabelsCheckbox = document.getElementById("gridLabelsCheckbox");
const gridSizeSlider = document.getElementById("gridSizeSlider");
const gridSizeDisplay = document.getElementById("gridSizeDisplay");
const gridTradeoff = document.getElementById("gridTradeoff");
const gridHelperText = document.getElementById("gridHelperText");

const canvasContext = patternCanvas.getContext("2d");
const offscreenCanvas = document.createElement("canvas");
const offscreenContext = offscreenCanvas.getContext("2d");

offscreenCanvas.width = GRID_SIZE;
offscreenCanvas.height = GRID_SIZE;

patternCanvas.width = GRID_SIZE * CELL_SIZE + LABEL_OFFSET;
patternCanvas.height = GRID_SIZE * CELL_SIZE + LABEL_OFFSET;

const paletteUsage = new Map();
let pixelGrid = null; // Store the palette indices for each pixel

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

  // Multi-stage image processing pipeline for better quality
  // 1. Enhance contrast using per-channel stretching
  imageData = enhanceContrast(imageData);
  
  // 2. Adaptive histogram equalization for detail preservation
  imageData = applyAdaptiveHistogramEqualization(imageData);
  
  // 3. Median filter to reduce noise while preserving edges
  imageData = applyMedianFilter(imageData);
  
  // 4. Sharpen edges for better definition
  imageData = applySharpen(imageData);
  
  // 5. Gaussian blur for smooth color transitions
  imageData = applyGaussianBlur(imageData);
  
  // Put processed image back
  offscreenContext.putImageData(imageData, 0, 0);

  canvasContext.clearRect(0, 0, patternCanvas.width, patternCanvas.height);
  paletteUsage.clear();
  pixelGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE));

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const index = (y * GRID_SIZE + x) * 4;
      const red = imageData.data[index];
      const green = imageData.data[index + 1];
      const blue = imageData.data[index + 2];
      const alpha = imageData.data[index + 3];

      const adjustedRed = red * (alpha / 255) + 255 * (1 - alpha / 255);
      const adjustedGreen = green * (alpha / 255) + 255 * (1 - alpha / 255);
      const adjustedBlue = blue * (alpha / 255) + 255 * (1 - alpha / 255);

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

      paletteUsage.set(
        paletteIndex,
        (paletteUsage.get(paletteIndex) || 0) + 1
      );
    }
  }

  drawGrid();
  drawGridLabels();
  renderPaletteUsage();
  renderBeadSummary();
  downloadButton.disabled = false;
}

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

downloadButton.addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = `bead-pattern-${GRID_SIZE}x${GRID_SIZE}.png`;
  link.href = patternCanvas.toDataURL("image/png");
  link.click();
});

function drawPlaceholder() {
  canvasContext.fillStyle = "#f0f0f7";
  canvasContext.fillRect(0, 0, patternCanvas.width, patternCanvas.height);
  drawGrid();
  drawGridLabels();
}

function updateGridSize(newSize) {
  GRID_SIZE = newSize;
  
  // Update canvas size
  patternCanvas.width = GRID_SIZE * CELL_SIZE + LABEL_OFFSET;
  patternCanvas.height = GRID_SIZE * CELL_SIZE + LABEL_OFFSET;
  
  offscreenCanvas.width = GRID_SIZE;
  offscreenCanvas.height = GRID_SIZE;
  
  // Update display and tradeoff message
  gridSizeDisplay.textContent = `${GRID_SIZE}×${GRID_SIZE}`;
  const totalBeadsCount = GRID_SIZE * GRID_SIZE;
  
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
  
  // Re-render current pattern if one exists
  if (CURRENT_IMAGE) {
    renderPattern(CURRENT_IMAGE);
  } else {
    drawPlaceholder();
  }
}

drawPlaceholder();
renderPaletteUsage();
renderBeadSummary();

// Event listener for palette selection
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

// Event listener for grid labels
gridLabelsCheckbox.addEventListener("change", () => {
  if (pixelGrid) {
    redrawPattern();
  } else {
    drawPlaceholder();
  }
});

// Event listener for grid size
gridSizeSlider.addEventListener("input", (event) => {
  updateGridSize(parseInt(event.target.value));
});
