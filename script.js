const GRID_SIZE = 18;
const CELL_SIZE = 20;

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

const canvasContext = patternCanvas.getContext("2d");
const offscreenCanvas = document.createElement("canvas");
const offscreenContext = offscreenCanvas.getContext("2d");

offscreenCanvas.width = GRID_SIZE;
offscreenCanvas.height = GRID_SIZE;

patternCanvas.width = GRID_SIZE * CELL_SIZE;
patternCanvas.height = GRID_SIZE * CELL_SIZE;

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
    const position = i * CELL_SIZE;
    canvasContext.beginPath();
    canvasContext.moveTo(position, 0);
    canvasContext.lineTo(position, GRID_SIZE * CELL_SIZE);
    canvasContext.stroke();

    canvasContext.beginPath();
    canvasContext.moveTo(0, position);
    canvasContext.lineTo(GRID_SIZE * CELL_SIZE, position);
    canvasContext.stroke();
  }
}

function drawGridLabels() {
  if (!gridLabelsCheckbox.checked) {
    return;
  }

  const fontSize = 12;
  canvasContext.font = `${fontSize}px Inter, Segoe UI, sans-serif`;
  canvasContext.fillStyle = "#3f3f54";
  canvasContext.textAlign = "center";
  canvasContext.textBaseline = "middle";

  // Column labels (A-R)
  for (let i = 0; i < GRID_SIZE; i += 1) {
    const letter = String.fromCharCode(65 + i); // A-Z
    const x = i * CELL_SIZE + CELL_SIZE / 2;
    const y = -6;
    canvasContext.fillText(letter, x, y);
  }

  // Row labels (1-18)
  canvasContext.textAlign = "right";
  canvasContext.textBaseline = "middle";
  for (let i = 0; i < GRID_SIZE; i += 1) {
    const number = i + 1;
    const x = -6;
    const y = i * CELL_SIZE + CELL_SIZE / 2;
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
        x * CELL_SIZE,
        y * CELL_SIZE,
        CELL_SIZE,
        CELL_SIZE
      );
    }
  }

  drawGrid();
  drawGridLabels();
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

  const imageData = offscreenContext.getImageData(
    0,
    0,
    GRID_SIZE,
    GRID_SIZE
  );

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
        x * CELL_SIZE,
        y * CELL_SIZE,
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
    renderPattern(image);
    URL.revokeObjectURL(objectUrl);
  };

  image.src = objectUrl;
});

downloadButton.addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "bead-pattern-18x18.png";
  link.href = patternCanvas.toDataURL("image/png");
  link.click();
});

function drawPlaceholder() {
  canvasContext.fillStyle = "#f0f0f7";
  canvasContext.fillRect(0, 0, patternCanvas.width, patternCanvas.height);
  drawGrid();
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
