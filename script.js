const GRID_SIZE = 18;
const CELL_SIZE = 20;
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

const imageInput = document.getElementById("imageInput");
const patternCanvas = document.getElementById("patternCanvas");
const downloadButton = document.getElementById("downloadButton");
const paletteList = document.getElementById("paletteList");

const canvasContext = patternCanvas.getContext("2d");
const offscreenCanvas = document.createElement("canvas");
const offscreenContext = offscreenCanvas.getContext("2d");

offscreenCanvas.width = GRID_SIZE;
offscreenCanvas.height = GRID_SIZE;

patternCanvas.width = GRID_SIZE * CELL_SIZE;
patternCanvas.height = GRID_SIZE * CELL_SIZE;

const paletteUsage = new Map();

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
  renderPaletteUsage();
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
