# Bead Pattern Builder

A lightweight, static website that converts any uploaded image into an 18×18 bead pattern using a simplified color palette.

## Live preview
[https://mathiasguille.github.io/bead-pattern](https://mathiasguille.github.io/bead-pattern)

## How it works
- Upload an image (JPEG, PNG, etc.).
- The image is center-cropped and reduced to an 18×18 pixel grid.
- Each pixel is mapped to the nearest color in the basic palette.
- The resulting grid is rendered as a bead design and can be downloaded as a PNG.

## Run locally
Open `index.html` directly in your browser, or serve the folder with a static server.

```bash
cd bead-pattern
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.
