# Bead Pattern Builder

A lightweight, static website that converts any uploaded image into a customizable bead pattern (10×10 to 40×40 grid) using a simplified color palette.

## Live preview
[https://mathiasguille.github.io/bead-pattern](https://mathiasguille.github.io/bead-pattern)

## How it works
- Upload an image (JPEG, PNG, etc.).
- The image is center-cropped and reduced to your chosen grid size (default 18×18).
- Choose a color palette: **Basic**, **Pastel**, or **Bright**.
- Each pixel is mapped to the nearest color in your selected palette.
- The resulting grid is rendered as a bead design and can be downloaded as a PNG.
- Optional: Enable grid labels (A–R, 1–18) for easier hand assembly or printing.

## Features
- **Multiple Palettes**: Switch between Basic (11 colors), Pastel (soft tones), or Bright (neon colors).
- **Bead Count Summary**: See exactly how many beads of each color you need for shopping and planning.
- **Grid Labels**: Optionally display row and column labels for precise bead placement.
- **Adjustable Grid Size**: Choose from 10×10 (100 beads) to 40×40 (1,600 beads) for your desired detail level.
- **Download Ready**: Export your pattern as a PNG for printing or sharing.

## Grid Size Tradeoffs

The grid size dramatically affects both the quality of your pattern and the number of beads required:

| Size | Beads | Best For | Time to Build | Detail Level |
|------|-------|----------|----------------|--------------|
| 10×10 | 100 | Quick projects, kids' crafts | 30 min | ⭐ Low |
| 14×14 | 196 | Simple designs, fast builds | 1-2 hrs | ⭐⭐ Low-Medium |
| 18×18 | 324 | **Recommended default** - balanced | 2-3 hrs | ⭐⭐⭐ Medium |
| 24×24 | 576 | Detailed designs, larger display | 4-6 hrs | ⭐⭐⭐⭐ High |
| 32×32 | 1,024 | Very detailed patterns | 8-12 hrs | ⭐⭐⭐⭐⭐ Very High |
| 40×40 | 1,600 | Maximum detail, museum-quality | 12+ hrs | ⭐⭐⭐⭐⭐ Maximum |

**Key Points:**
- **Smaller grids (10×14)**: Faster to build, fewer beads needed, but less detail
- **Medium grids (18×24)**: Sweet spot for most makers - good balance of detail and time
- **Larger grids (32×40)**: Photorealistic quality possible, but requires significant time and material investment
- **Detail scales with grid size**: A 40×40 grid captures approximately 16× more detail than a 10×10 grid
- **File size**: Larger grids = larger PNG downloads (but still only ~50-100 KB)

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

## Automated Quality Baselines
This project supports automated baseline collection and regression checks for quantization quality.

- To generate baseline metrics (synthetic samples), run:

```bash
npm run save-baseline
```

This writes `test-results/baseline.json` containing MSE and Delta-E metrics for sample images. Commit this baseline to your repo to use it as a reference for CI.

- A regression test skeleton is included at `__tests__/regression.test.js`. It will ensure a baseline exists and can be extended to fail when metrics degrade beyond a threshold.

Recommended workflow:
- Run `npm run save-baseline` locally to produce a baseline and inspect numeric metrics.
- Commit `test-results/baseline.json` to your branch (or store as CI artifact).
- Expand the regression test to assert acceptable thresholds for MSE/Delta-E for your chosen samples.

## Tips for Best Results
- **Use simple, high-contrast images** – logos, silhouettes, and drawings work best
- **Avoid photorealistic images at small sizes** – use 24×24 or larger for photos
- **Bold outlines** create sharper patterns; fine details may disappear
- **Try converting to grayscale first** if your image is cluttered
- **Pastel palette** works best for softer, more blended designs
- **Bright palette** creates bold, high-contrast patterns
- **Download and print** for easy reference while assembling beads
- **Match grid size to image complexity**: Simple logos → 10×14, detailed drawings → 24×32, photos → 32×40+
