/**
 * Test the image processing pipeline to see if it corrupts pure colors
 * This helps identify which stage is causing the color loss issue
 */

// Simulate the image processing functions from script.js
function enhanceContrast(data, width, height) {
  const result = new Uint8ClampedArray(data);
  const channels = [[], [], []];
  
  for (let i = 0; i < data.length; i += 4) {
    channels[0].push(data[i]);
    channels[1].push(data[i + 1]);
    channels[2].push(data[i + 2]);
  }

  channels.forEach((channel) => {
    const min = Math.min(...channel);
    const max = Math.max(...channel);
    const range = max - min || 1;
    for (let i = 0; i < channel.length; i++) {
      channel[i] = Math.round(((channel[i] - min) / range) * 255);
    }
  });

  let pixelIdx = 0;
  for (let i = 0; i < data.length; i += 4) {
    result[i] = channels[0][pixelIdx];
    result[i + 1] = channels[1][pixelIdx];
    result[i + 2] = channels[2][pixelIdx];
    pixelIdx++;
  }

  return result;
}

function applyAdaptiveHistogramEqualization(data, width, height) {
  const result = new Uint8ClampedArray(data);
  const tileSize = 32;
  
  for (let ty = 0; ty < Math.ceil(height / tileSize); ty++) {
    for (let tx = 0; tx < Math.ceil(width / tileSize); tx++) {
      const x1 = tx * tileSize;
      const y1 = ty * tileSize;
      const x2 = Math.min(x1 + tileSize, width);
      const y2 = Math.min(y1 + tileSize, height);
      
      for (let c = 0; c < 3; c++) {
        const histogram = new Array(256).fill(0);
        for (let y = y1; y < y2; y++) {
          for (let x = x1; x < x2; x++) {
            const idx = (y * width + x) * 4 + c;
            histogram[data[idx]]++;
          }
        }
        
        const cdf = [];
        let sum = 0;
        for (let i = 0; i < 256; i++) {
          sum += histogram[i];
          cdf[i] = Math.round((sum / ((x2 - x1) * (y2 - y1))) * 255);
        }
        
        for (let y = y1; y < y2; y++) {
          for (let x = x1; x < x2; x++) {
            const idx = (y * width + x) * 4 + c;
            result[idx] = cdf[result[idx]];
          }
        }
      }
    }
  }
  return result;
}

function applyMedianFilter(data, width, height) {
  const result = new Uint8ClampedArray(data);
  const kernel = 3;
  const pad = Math.floor(kernel / 2);
  
  for (let y = pad; y < height - pad; y++) {
    for (let x = pad; x < width - pad; x++) {
      for (let c = 0; c < 3; c++) {
        const values = [];
        for (let ky = -pad; ky <= pad; ky++) {
          for (let kx = -pad; kx <= pad; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            values.push(result[idx]);
          }
        }
        values.sort((a, b) => a - b);
        const idx = (y * width + x) * 4 + c;
        result[idx] = values[Math.floor(values.length / 2)];
      }
    }
  }
  return result;
}

function applySharpen(data, width, height) {
  const result = new Uint8ClampedArray(data);
  const kernel = [
    [0, -1, 0],
    [-1, 5, -1],
    [0, -1, 0],
  ];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += data[idx] * kernel[ky + 1][kx + 1];
          }
        }
        const idx = (y * width + x) * 4 + c;
        result[idx] = Math.max(0, Math.min(255, sum / 4));
      }
    }
  }
  return result;
}

function applyGaussianBlur(data, width, height) {
  const result = new Uint8ClampedArray(data);
  const kernel = [
    [1, 4, 6, 4, 1],
    [4, 16, 24, 16, 4],
    [6, 24, 36, 24, 6],
    [4, 16, 24, 16, 4],
    [1, 4, 6, 4, 1],
  ];
  const scale = 256;
  
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let ky = -2; ky <= 2; ky++) {
          for (let kx = -2; kx <= 2; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += data[idx] * kernel[ky + 2][kx + 2];
          }
        }
        const idx = (y * width + x) * 4 + c;
        result[idx] = Math.max(0, Math.min(255, sum / scale));
      }
    }
  }
  return result;
}

// Test: pure red through each pipeline stage
describe('Image processing pipeline color corruption', () => {
  test('stage-by-stage color analysis: pure red', () => {
    const width = 10, height = 10;
    let data = new Uint8ClampedArray(width * height * 4);
    
    // Fill with pure red
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 255;
    }

    const originalAvg = [255, 0, 0];
    console.log('Original: R=255, G=0, B=0');

    // Stage 1: Contrast enhancement
    data = enhanceContrast(data, width, height);
    const avg1 = [0, 0, 0];
    for (let i = 0; i < data.length; i += 4) {
      avg1[0] += data[i];
      avg1[1] += data[i + 1];
      avg1[2] += data[i + 2];
    }
    const count = width * height;
    avg1.forEach((v, i) => avg1[i] = Math.round(v / count));
    console.log(`After enhanceContrast: R=${avg1[0]}, G=${avg1[1]}, B=${avg1[2]}`);

    // Stage 2: Adaptive histogram equalization
    data = applyAdaptiveHistogramEqualization(data, width, height);
    const avg2 = [0, 0, 0];
    for (let i = 0; i < data.length; i += 4) {
      avg2[0] += data[i];
      avg2[1] += data[i + 1];
      avg2[2] += data[i + 2];
    }
    avg2.forEach((v, i) => avg2[i] = Math.round(v / count));
    console.log(`After adaptiveHistEq: R=${avg2[0]}, G=${avg2[1]}, B=${avg2[2]}`);

    // Stage 3: Median filter
    data = applyMedianFilter(data, width, height);
    const avg3 = [0, 0, 0];
    for (let i = 0; i < data.length; i += 4) {
      avg3[0] += data[i];
      avg3[1] += data[i + 1];
      avg3[2] += data[i + 2];
    }
    avg3.forEach((v, i) => avg3[i] = Math.round(v / count));
    console.log(`After medianFilter: R=${avg3[0]}, G=${avg3[1]}, B=${avg3[2]}`);

    // Stage 4: Sharpen
    data = applySharpen(data, width, height);
    const avg4 = [0, 0, 0];
    for (let i = 0; i < data.length; i += 4) {
      avg4[0] += data[i];
      avg4[1] += data[i + 1];
      avg4[2] += data[i + 2];
    }
    avg4.forEach((v, i) => avg4[i] = Math.round(v / count));
    console.log(`After sharpen: R=${avg4[0]}, G=${avg4[1]}, B=${avg4[2]}`);

    // Stage 5: Gaussian blur
    data = applyGaussianBlur(data, width, height);
    const avg5 = [0, 0, 0];
    for (let i = 0; i < data.length; i += 4) {
      avg5[0] += data[i];
      avg5[1] += data[i + 1];
      avg5[2] += data[i + 2];
    }
    avg5.forEach((v, i) => avg5[i] = Math.round(v / count));
    console.log(`After gaussianBlur: R=${avg5[0]}, G=${avg5[1]}, B=${avg5[2]}`);

    expect(true).toBe(true);
  });

  test('stage-by-stage color analysis: pure green', () => {
    const width = 10, height = 10;
    let data = new Uint8ClampedArray(width * height * 4);
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 0;
      data[i + 1] = 255;
      data[i + 2] = 0;
      data[i + 3] = 255;
    }

    console.log('\n=== Pure Green ===');
    console.log('Original: R=0, G=255, B=0');

    data = enhanceContrast(data, width, height);
    let avg = [0, 0, 0];
    for (let i = 0; i < data.length; i += 4) {
      avg[0] += data[i]; avg[1] += data[i + 1]; avg[2] += data[i + 2];
    }
    avg = avg.map(v => Math.round(v / (width * height)));
    console.log(`After enhanceContrast: R=${avg[0]}, G=${avg[1]}, B=${avg[2]}`);

    data = applyAdaptiveHistogramEqualization(data, width, height);
    avg = [0, 0, 0];
    for (let i = 0; i < data.length; i += 4) {
      avg[0] += data[i]; avg[1] += data[i + 1]; avg[2] += data[i + 2];
    }
    avg = avg.map(v => Math.round(v / (width * height)));
    console.log(`After adaptiveHistEq: R=${avg[0]}, G=${avg[1]}, B=${avg[2]}`);

    data = applyMedianFilter(data, width, height);
    avg = [0, 0, 0];
    for (let i = 0; i < data.length; i += 4) {
      avg[0] += data[i]; avg[1] += data[i + 1]; avg[2] += data[i + 2];
    }
    avg = avg.map(v => Math.round(v / (width * height)));
    console.log(`After medianFilter: R=${avg[0]}, G=${avg[1]}, B=${avg[2]}`);

    data = applySharpen(data, width, height);
    avg = [0, 0, 0];
    for (let i = 0; i < data.length; i += 4) {
      avg[0] += data[i]; avg[1] += data[i + 1]; avg[2] += data[i + 2];
    }
    avg = avg.map(v => Math.round(v / (width * height)));
    console.log(`After sharpen: R=${avg[0]}, G=${avg[1]}, B=${avg[2]}`);

    data = applyGaussianBlur(data, width, height);
    avg = [0, 0, 0];
    for (let i = 0; i < data.length; i += 4) {
      avg[0] += data[i]; avg[1] += data[i + 1]; avg[2] += data[i + 2];
    }
    avg = avg.map(v => Math.round(v / (width * height)));
    console.log(`After gaussianBlur: R=${avg[0]}, G=${avg[1]}, B=${avg[2]}`);

    expect(true).toBe(true);
  });
});
