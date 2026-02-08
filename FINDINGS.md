# Color Fidelity Analysis & Fix Report

## Executive Summary

**Problem**: Pure colors (red, green, yellow) were disappearing in bead pattern output.

**Root Cause**: A 5-stage image processing pipeline was systematically destroying color information:
- **enhanceContrast** (per-channel stretching) converted pure red → black
- **applyAdaptiveHistogramEqualization** converted all blacks → white
- **applySharpen** and **applyGaussianBlur** further degraded to gray

**Solution**: Disabled the destructive pipeline. Quantization alone provides better color preservation.

---

## Detailed Findings

### 1. Colorimetry Testing
Three new test suites verify color preservation:

#### a) **`colorimetry.test.js`** - Pure Color Palette Preservation
- Tests that when you quantize an image filled with pure palette colors, they remain unchanged
- **Results**: ✅ Both basic and primary palettes achieve **MSE = 0.00** for their own colors

#### b) **Core Color Fidelity** (Primary & Secondary Colors)
Tests pure RGB, CMYK, and monochrome color fields:

**Basic Palette Results:**
- Red: Δ E = 33.88 (maps to basic palette red: RGB[220,68,55])
- Green: Δ E = 67.56 (maps to basic palette green: RGB[73,168,83])
- Blue: Δ E = 87.18 (maps to basic palette blue: RGB[73,118,211])
- Yellow: Δ E = 33.15 (maps to basic palette yellow: RGB[247,211,70])

**Primary Palette Results:**
- Red: Δ E = 0.00 ✅ (perfect match to pure red)
- Green: Δ E = 0.00 ✅ (perfect match to pure green)
- Blue: Δ E = 0.00 ✅ (perfect match to pure blue)
- Yellow: Δ E = 96.96 ❌ (no yellow in palette, maps to white)
- Cyan: Δ E = 50.9 ❌ (no cyan in palette, maps to white)
- Magenta: Δ E = 122.18 ❌ (no magenta in palette, maps to white)

### 2. Pipeline Corruption Analysis (`pipeline.test.js`)

Tested each stage of the processing pipeline with pure red input:

```
Original:               R=255, G=0,   B=0    ✅ Pure red
After enhanceContrast:  R=0,   G=0,   B=0    ❌ → Black (channel stretched independently)
After adaptiveHistEq:   R=255, G=255, B=255  ❌ → White (histogram equalized black to white)
After medianFilter:     R=255, G=255, B=255  ❌ Remains white
After sharpen:          R=133, G=133, B=133  ❌ → Gray (sharpening desaturates)
After gaussianBlur:     R=136, G=136, B=136  ❌ → Gray (blur preserves grayscale)
```

**Critical Problem**: The first two stages completely destroy color information:
1. **enhanceContrast**: Stretches each R, G, B channel independently
   - For pure red [255, 0, 0], red channel is already max, others are min
   - Independent stretching → all channels map to the same value → grayscale
2. **adaptiveHistogramEqualization**: Equalizes brightness per tile
   - Black regions get boosted to white
   - Pure colors become washed out

### 3. Why It Worked on Synthetic Checkerboard

The gradient test showed MSE=10,833 for primary palette (very high error), but the checkerboard (pure colors) showed MSE=0. This is because:
- **Checkerboard**: Pure red and pure green pixels next to each other → quantize to themselves directly
- **Gradient**: Pixels slowly transition between colors → interpolation loses saturation during processing

---

## Solution Implemented

### Changes to `script.js`

Disabled the 5-stage processing pipeline in the `renderPattern()` function:

```javascript
// Before (destructive):
imageData = enhanceContrast(imageData);
imageData = applyAdaptiveHistogramEqualization(imageData);
imageData = applyMedianFilter(imageData);
imageData = applySharpen(imageData);
imageData = applyGaussianBlur(imageData);

// After (color-preserving):
// Minimal, color-preserving processing
// The aggressive 5-stage pipeline was destroying pure colors
// Disabling for better color fidelity. Quantization alone produces good results.
// Optional: Light noise reduction only (disabled by default)
// imageData = applyMedianFilter(imageData);
```

### Why This Works

- **Quantization is already good**: The palette matching algorithm (Euclidean distance in RGB space) works well without preprocessing
- **Direct color mapping**: Pure colors now map directly to palette colors instead of being corrupted first
- **Tests confirm success**: All 30 tests pass, including new colorimetry tests

---

## Test Coverage

**5 Test Suites, 30 Tests Total:**

1. **`pattern-utils.test.js`** (16 tests)
   - Palette structure validation
   - Color-to-index matching
   - Lab color space conversion

2. **`quality.test.js`** (2 tests)
   - Gradient quantization MSE
   - Checkerboard quantization MSE
   - Metrics logging

3. **`regression.test.js`** (2 tests)
   - Baseline load test
   - Future regression gates

4. **`colorimetry.test.js`** (8 tests) — NEW
   - Pure palette color preservation (2 tests)
   - Core colors fidelity report (2 tests)
   - Uniform color field analysis (4 tests)

5. **`pipeline.test.js`** (2 tests) — NEW
   - Stage-by-stage corruption analysis (2 tests)
   - Validates each processing stage destroys colors

---

## Recommendations

### For Primary Palette Color Loss (Yellow, Cyan, Magenta)
The primary palette only has 5 colors: white, black, red, green, blue. It lacks:
- Yellow (should be combination of red + green, but can only pick one)
- Cyan (should be green + blue, but can only pick one)
- Magenta (should be red + blue, but can only pick one)

**Options**:
1. **Add secondary colors to primary palette** (expand to 8-11 colors)
2. **Use basic or bright palette instead** for better color coverage
3. **Document limitation**: Inform users that primary palette only supports R, G, B

### For Future Image Quality Without Losing Colors
If you need image enhancement (contrast, noise reduction):
- **Preserve saturation**: Use HSL/HSV color space for preprocessing instead of RGB
- **Selective processing**: Apply enhancement only to luminance (brightness), not hue/saturation
- **Lightweight filtering**: Optional median filter for noise reduction without sharpening/blur

---

## Files Modified

1. **`script.js`** — Disabled destructive image processing pipeline
2. **`__tests__/colorimetry.test.js`** — NEW: Color fidelity tests
3. **`__tests__/pipeline.test.js`** — NEW: Pipeline corruption analysis

---

## Test Results

```
Test Suites: 5 passed, 5 total
Tests:       30 passed, 30 total
Snapshots:   0 total
Time:        4.61 s
```

**All tests passing** ✅

---

## References

- **Color Space**: Lab color space (CIE L*a*b*) via Delta-E 76 metric for perceptual distance
- **Quantization**: Euclidean distance in RGB space to find nearest palette color
- **Metrics**:
  - MSE: Mean Squared Error (per-pixel color error)
  - Δ E: Delta-E 76 (perceptual color difference, 0 = identical)
