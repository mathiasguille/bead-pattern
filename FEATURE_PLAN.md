# Feature Plan: Image Cropping & Background Removal

## Overview
Add two optional image processing features to give users more control over their source images:
1. **Interactive Square Crop Tool** - Let users define what part of the image to use
2. **Background Removal** - Optional automatic removal of background to isolate the main subject

---

## Feature 1: Interactive Square Crop Tool

### Purpose
Currently the app auto center-crops images. Users should be able to manually select a custom square region.

### UI/UX Design
**New workflow:**
1. User uploads image
2. Preview appears with **interactive crop overlay** (semi-transparent frame showing crop region)
3. User can **drag the crop box** OR use **slider controls** to adjust:
   - Position (X, Y offset)
   - Size (scale factor)
4. **Live preview** updates as they adjust
5. **"Confirm Crop"** button to apply selection

### Technical Implementation

**New Components:**
- `CropController` class in `script.js`
  - Track crop box position (x, y) and size (width, height)
  - Constrain to image bounds
  - Calculate which pixels to extract

**Canvas Changes:**
- Add crop overlay layer (semi-transparent rect with handles)
- Draw corner handles for resizing
- Draw center handle for dragging
- Show grid overlay when active (helps with composition)

**Event Handlers:**
- Mouse down on handles → start drag
- Mouse move → update crop box
- Mouse up → finish drag
- Preview updates in real-time

**State Changes:**
```javascript
{
  sourceImage: HTMLImageElement,
  cropBox: {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    isActive: true
  }
}
```

**HTML Changes:**
- Add "Crop Tool" control panel
- Add buttons: "Enable Crop Mode", "Confirm", "Reset to Center"
- Add position/size sliders (optional, advanced users)
- Show coordinates: "Position: (x, y) | Size: 100×100"

**Estimated Complexity:** Medium (3-4 hours)

**Testing Strategy:**
- Unit tests for crop box bounds checking
- Integration tests for drag operations
- Snapshot tests for crop preview rendering

---

## Feature 2: Background Removal (Optional)

### Purpose
Remove uniform or messy backgrounds to isolate the main subject for cleaner bead patterns.

### UI/UX Design
**New workflow:**
1. After uploading, show checkbox: **"Remove background (optional)"**
2. If enabled, show **sensitivity slider**: "Keep more detail" ←→ "Cleaner removal"
3. Real-time preview with background removed
4. User can toggle before/after to see difference

### Technical Implementation Options

**Option A: Smart Color Masking (Fast, Good for Simple BGs)**
- Detect background color (most common color in image corners)
- Use color distance threshold to identify background pixels
- Convert to transparency or solid white
- **Pros**: Fast, no external libs, works well for logos/simple graphics
- **Cons**: Struggles with complex/gradient backgrounds

**Option B: Edge Detection + Morphological Operations (Better)**
- Use Canny edge detection to find object boundaries
- Dilate/erode to clean up edges
- Use flood-fill to remove regions
- **Pros**: Better edge detection, works for varied backgrounds
- **Cons**: Slower, more complex implementation

**Option C: External Library (Best Quality, but Heavy)**
- Use `remove.bg` API or similar
- **Pros**: Professional results
- **Cons**: External dependency, API costs, slower, requires internet

### Recommended: Hybrid Approach
**Smart Color Masking for v1**, with option to expand to edge detection later

**Implementation:**

```javascript
function removeBackground(imageData, sensitivity = 0.5) {
  // 1. Sample background color from corners
  const bgColor = sampleCornerColors(imageData);
  
  // 2. Build threshold from sensitivity slider
  const threshold = sensitivity * 50 + 20; // 20-70 range
  
  // 3. For each pixel, if distance to bgColor > threshold, keep it
  // Otherwise make it transparent
  
  // 4. Optional: smooth edges with dilation/erosion
  return processedImageData;
}
```

**State Changes:**
```javascript
{
  backgroundRemovalEnabled: false,
  backgroundRemovalSensitivity: 0.5, // 0-1
  backgroundColor: [r, g, b]
}
```

**HTML Changes:**
- Add checkbox: "Remove background"
- Add slider: "Sensitivity: [----●----]"
- Show info: "Detected background color: [swatch]"
- Option to "Pick background color manually" (click eyedropper on image)

**Estimated Complexity:** Medium-High (4-5 hours)

**Testing Strategy:**
- Unit tests for color distance calculation
- Integration tests for mask generation
- Visual regression tests for edge quality

---

## Implementation Roadmap

### Phase 1: Interactive Crop Tool (Priority: HIGH)
**Week 1**
- Add crop UI controls to HTML
- Implement CropController class
- Add drag/resize event handlers
- Live preview rendering
- Save crop state

**Tests:**
- Crop box bounds validation
- Drag position calculations
- Preview rendering accuracy

### Phase 2: Background Removal (Priority: MEDIUM)
**Week 2**
- Implement `removeBackground()` function
- Add UI controls (checkbox, sensitivity slider)
- Add eyedropper color picker
- Real-time preview toggle
- Integration with crop tool

**Tests:**
- Color distance calculations
- Transparency mask generation
- Edge smoothing quality

### Phase 3: Integration & Polish (Priority: HIGH)
**Week 3**
- Combine both features into unified workflow
- Update README with new workflow
- Add user tips/hints
- Performance optimization (crop/remove on worker thread?)
- Mobile responsiveness for touch-based cropping

---

## User Workflow (After Implementation)

```
1. Upload Image
   ↓
2. [NEW] Adjust Crop (interactive square selection)
   ├─ Drag to move crop box
   ├─ Resize corners to change size
   ├─ Click "Confirm Crop" or skip
   ↓
3. [NEW] Remove Background (optional checkbox)
   ├─ Enable checkbox
   ├─ Adjust sensitivity slider
   ├─ Preview before/after
   ├─ Click "Apply" or skip
   ↓
4. Select Palette (existing)
   ↓
5. Adjust Grid Size (existing)
   ↓
6. Download Pattern (existing)
```

---

## Technical Considerations

### Performance
- **Crop**: Very fast (just changing source rect)
- **Background Removal**: Potentially slow on large images
  - Consider: Web Worker for processing
  - Or: Resize to smaller preview size, then apply to full size

### Browser Compatibility
- Canvas API: Supported everywhere ✅
- ImageData manipulation: Supported everywhere ✅
- Touch events: Need to add for mobile cropping

### State Management
- Need to track: original image, crop box, bg removal settings
- When user changes one setting, re-process and re-render
- Cache intermediate results to avoid redundant processing

### Testing Challenges
- Visual testing for crop overlay rendering
- Background removal quality varies by image
- Need good test image suite

---

## Alternative: Simpler MVP

If full implementation is too heavy, we could start with:

**Minimal Crop Tool:**
- Just add X/Y offset sliders (no interactive dragging)
- Add scale slider to zoom in/out
- No visual overlay, just show result
- Simpler, 2-3 hours to implement

**Minimal Background Removal:**
- Just a checkbox + sensitivity slider
- No preview toggle, no color picker
- Show before/after side-by-side
- Simpler, 2-3 hours to implement

---

## Questions for Review

1. **Priority**: Should we do cropping first, or background removal first, or both in parallel?
2. **MVP Level**: Full featured version or simplified MVP?
3. **Background Removal Algorithm**: Smart color masking or edge detection?
4. **Mobile Support**: Do we need touch-based cropping or desktop-only?
5. **Performance**: OK to process on main thread or should we use Web Workers?
6. **Testing**: How important is visual regression testing vs unit testing?

---

## Files to Modify/Create

### Existing Files to Update:
- `index.html` - Add new control panels
- `script.js` - Add CropController, removeBackground(), event handlers
- `styles.css` - Add crop overlay styling, slider styling
- `README.md` - Document new workflow
- Tests - Add tests for new functions

### New Files:
- `__tests__/crop.test.js` - Crop tool tests
- `__tests__/background-removal.test.js` - BG removal tests

---

**Total Estimated Effort:**
- Crop Tool: 3-4 hours + 1 hour testing = 4-5 hours
- Background Removal: 4-5 hours + 1-2 hours testing = 5-7 hours
- Integration & Polish: 2-3 hours
- **Total: ~12-15 hours of work**

If we do MVP version: **6-8 hours total**
