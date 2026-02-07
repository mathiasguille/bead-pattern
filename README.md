# Bead Pattern Builder

A lightweight, static website that converts any uploaded image into an 18×18 bead pattern using a simplified color palette.

## Live preview
[https://mathiasguille.github.io/bead-pattern](https://mathiasguille.github.io/bead-pattern)

## How it works
- Upload an image (JPEG, PNG, etc.).
- The image is center-cropped and reduced to an 18×18 pixel grid.
- Choose a color palette: **Basic**, **Pastel**, or **Bright**.
- Each pixel is mapped to the nearest color in your selected palette.
- The resulting grid is rendered as a bead design and can be downloaded as a PNG.
- Optional: Enable grid labels (A–R, 1–18) for easier hand assembly or printing.

## Features
- **Multiple Palettes**: Switch between Basic (11 colors), Pastel (soft tones), or Bright (neon colors).
- **Bead Count Summary**: See exactly how many beads of each color you need for shopping and planning.
- **Grid Labels**: Optionally display row (1–18) and column (A–R) labels for precise bead placement.
- **Download Ready**: Export your pattern as a PNG for printing or sharing.

## Run locally
Open `index.html` directly in your browser, or serve the folder with a static server.

```bash
cd bead-pattern
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Testing
This project includes comprehensive unit tests for color matching and palette utilities.

### Run tests
```bash
npm install
npm test
```

All tests verify:
- Palette structure and color data
- Color-to-palette matching accuracy
- Alpha blending calculations

Test coverage includes 16 test cases across edge cases, validation, and real-world scenarios.
