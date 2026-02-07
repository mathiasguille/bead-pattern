const fs = require('fs');
const path = require('path');
const { quantizeImageData, computeMSE, computeMeanDeltaE, PALETTES } = require('../pattern-utils');

function makeSamples() {
  const samples = [];
  // small gradient
  const width = 32, height = 16;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = x / (width - 1);
      const idx = (y * width + x) * 4;
      data[idx] = Math.round(0 * (1 - t) + 255 * t);
      data[idx + 1] = Math.round(0 * (1 - t) + 255 * (1 - t));
      data[idx + 2] = Math.round(255 * (1 - t) + 0 * t);
      data[idx + 3] = 255;
    }
  }
  samples.push({ name: 'gradient-32x16', data, width, height });

  // checker
  const cw = 20, ch = 20;
  const cdata = new Uint8ClampedArray(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const idx = (y * cw + x) * 4;
      const isA = ((x + y) % 2) === 0;
      const color = isA ? [255, 0, 0] : [0, 255, 0];
      cdata[idx] = color[0]; cdata[idx + 1] = color[1]; cdata[idx + 2] = color[2]; cdata[idx + 3] = 255;
    }
  }
  samples.push({ name: 'checker-20x20', data: cdata, width: cw, height: ch });

  return samples;
}

function run() {
  const samples = makeSamples();
  const results = {};

  samples.forEach((s) => {
    results[s.name] = {};
    Object.keys(PALETTES).forEach((pname) => {
      const { quantizedRGB } = quantizeImageData({ data: s.data, width: s.width, height: s.height }, pname);
      const mse = computeMSE(s.data, quantizedRGB);
      const de = computeMeanDeltaE(s.data, quantizedRGB);
      results[s.name][pname] = { mse, deltaE: de };
    });
  });

  const outDir = path.join(__dirname, '..', 'test-results');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  const outPath = path.join(outDir, 'baseline.json');
  fs.writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
  console.log('Saved baseline to', outPath);
}

run();
