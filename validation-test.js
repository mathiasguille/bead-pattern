/**
 * Quick validation test for visual crop interface
 * Run this in browser console after page loads
 */

console.log("=== Visual Crop Interface Validation ===\n");

// Check required DOM elements
const requiredElements = {
  'imageCropCanvas': 'Canvas element for image display',
  'cropInterfaceContainer': 'Container for crop interface',
  'cropModeCheckbox': 'Enable/disable crop mode',
  'cropInfo': 'Real-time crop info display',
  'confirmCropButton': 'Confirm crop button',
  'resetCropButton': 'Reset crop button',
  'imageInput': 'Image upload input'
};

console.log("✓ Checking DOM Elements:");
let elementsMissing = 0;
for (const [id, description] of Object.entries(requiredElements)) {
  const element = document.getElementById(id);
  if (element) {
    console.log(`  ✅ ${id} - ${description}`);
  } else {
    console.log(`  ❌ ${id} - MISSING!`);
    elementsMissing++;
  }
}

if (elementsMissing === 0) {
  console.log("All required elements found!\n");
} else {
  console.log(`⚠️  ${elementsMissing} elements missing!\n`);
}

// Check required functions
const requiredFunctions = [
  'drawCropOverlay',
  'drawCropHandles',
  'updateCropInfo',
  'updateCropBox',
  'getHandleAtPoint',
  'dist'
];

console.log("✓ Checking Functions:");
let functionsMissing = 0;
for (const funcName of requiredFunctions) {
  try {
    if (typeof window[funcName] === 'function') {
      console.log(`  ✅ ${funcName}()`);
    } else {
      console.log(`  ❌ ${funcName}() - NOT A FUNCTION`);
      functionsMissing++;
    }
  } catch (e) {
    console.log(`  ❌ ${funcName}() - MISSING`);
    functionsMissing++;
  }
}

if (functionsMissing === 0) {
  console.log("All required functions found!\n");
} else {
  console.log(`⚠️  ${functionsMissing} functions missing!\n`);
}

// Check state variables
console.log("✓ Checking State Variables:");
const stateVars = {
  'cropBox': 'object with x, y, width, height',
  'sourceImageDimensions': 'object with width, height',
  'CURRENT_IMAGE': 'HTMLImageElement',
  'cropMode': 'boolean'
};

for (const [varName, description] of Object.entries(stateVars)) {
  try {
    const value = eval(varName);
    console.log(`  ✅ ${varName} = ${typeof value === 'object' ? JSON.stringify(value) : value}`);
  } catch (e) {
    console.log(`  ❌ ${varName} - UNDEFINED`);
  }
}

console.log("\n=== Initialization Tests ===\n");

// Test crop mode initialization
const checkbox = document.getElementById('cropModeCheckbox');
const shouldBeDisabled = !document.getElementById('imageInput').value;
console.log(`✓ Crop checkbox disabled on load: ${checkbox.disabled === shouldBeDisabled ? '✅' : '❌'}`);

// Test canvas setup
const canvas = document.getElementById('imageCropCanvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  console.log(`✓ Canvas 2D context available: ${ctx !== null ? '✅' : '❌'}`);
}

console.log("\n=== Ready to Test ===");
console.log("1. Upload an image");
console.log("2. Check 'Enable manual crop'");
console.log("3. Try dragging the green box on the canvas");
console.log("4. Check that drawCropOverlay() is being called");
console.log("\nIf all checks pass, the interface should be working! 🎉");
