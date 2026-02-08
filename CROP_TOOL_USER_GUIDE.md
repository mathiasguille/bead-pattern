# Visual Crop Interface - User Testing Guide

## ✨ What's New

The crop tool has been completely redesigned from slider controls to a **direct visual interface** where you can click and drag directly on your uploaded image to select the area you want to keep.

## 🎯 How to Use the New Crop Tool

### Step 1: Upload an Image
1. Click "Choose Image" in the Image Upload section
2. Select any image file from your computer
3. The image will appear in the preview

### Step 2: Enable Crop Mode
1. Check the "Enable manual crop" checkbox
2. A canvas will appear showing your uploaded image with a **green selection box**
3. The green box indicates what will be kept; everything outside is darkened

### Step 3: Adjust the Crop Region

You have several ways to interact with the crop box:

#### **Move the Entire Crop Box**
- Click anywhere **inside** the green box
- Drag to move the entire selection to a new position
- The image area will follow your cursor

#### **Resize from Edges**
- Hover over any edge (top, bottom, left, right) of the green box
- The cursor will change to show the resize direction (↑, ↓, ←, →)
- Click and drag to resize from that edge

#### **Resize from Corners**
- Hover over any corner of the green box
- The cursor will change to show diagonal resize (↖, ↗, ↙, ↘)
- Click and drag to resize from that corner

#### **Resize from Multiple Directions Simultaneously**
- Grab a corner and drag diagonally
- This resizes both dimensions at once

### Step 4: See Real-Time Information
- Below the image canvas, you'll see: `📍 Position: (x, y) | 📐 Size: width×height px`
- This updates in real-time as you drag to show your current crop area

### Step 5: Confirm Your Selection
- Click **"✓ Confirm Crop"** to lock in your selection and apply it to the pattern
- The pattern will re-render using only the cropped portion of your image

### Step 6: Undo or Try Again
- Click **"↺ Reset to Center"** to revert to the default auto-centered crop
- Then uncheck "Enable manual crop" to return to automatic center-crop mode

## 🎮 Interactive Features

| Action | Result |
|--------|--------|
| **Hover over green box** | Cursor changes to indicate available actions |
| **Click inside green box** | Enter "move" mode - drag to reposition |
| **Click on edge** | Enter "resize" mode - drag to resize one dimension |
| **Click on corner** | Enter "resize" mode - drag to resize two dimensions |
| **Drag while holding** | Smooth real-time feedback with visual outline |
| **Release mouse** | Finalize the position/size change |

## 💡 Tips for Best Results

1. **Use Clear, Bold Images**: Images with distinct shapes and colors work best
2. **Crop to Content**: Remove unnecessary background to focus on the subject
3. **Consider Square Crops**: While any aspect ratio works, square crops often look best
4. **Zoom In on Details**: Use corners to create a tight crop around your main subject
5. **Test Different Crops**: Try multiple crops to see how the pattern changes

## 🔍 Visual Feedback

The interface provides several visual cues:

- **Green Box**: Your current crop selection (this part will be kept)
- **Darkened Area**: The area outside the crop (this will be discarded)
- **Green Handles**: Small squares at corners and edges - these are where you grab to resize
- **Center Point**: A green circle in the middle - grab here to move the entire box
- **Cursor Changes**: 
  - Crosshair (↖): When hovering over handles
  - Shows resize direction (↑, ↙, etc.): When hovering over edges
  - Move cursor (✋): When inside the box
  - Default (arrow): When outside the box

## ⚠️ Constraints & Safety

- **Minimum Size**: Crop box must be at least 50×50 pixels
- **Maximum Size**: Cannot extend beyond image boundaries
- **Auto-Bounds Checking**: If you drag outside the image, the crop box automatically constrains
- **Non-Square**: Unlike the old interface, crops can now be any aspect ratio (not just square)

## 🧪 Testing Checklist

- [ ] Upload an image successfully
- [ ] Enable crop mode checkbox
- [ ] See the canvas with green crop box
- [ ] Drag the entire box to move it
- [ ] Drag top edge to resize height
- [ ] Drag right edge to resize width
- [ ] Drag corner to resize both dimensions
- [ ] See real-time coordinate updates
- [ ] Confirm crop applies the pattern
- [ ] Reset to center works
- [ ] Crop info displays correct values
- [ ] Cursor changes appropriately

## 🐛 Troubleshooting

### "The crop box doesn't appear"
- Make sure you have uploaded an image
- Check that "Enable manual crop" checkbox is checked
- Refresh the page and try again

### "Dragging isn't smooth"
- This is normal for slower computers; try refreshing
- Ensure no other heavy applications are running

### "The crop doesn't apply"
- Make sure to click "✓ Confirm Crop" to lock in your selection
- Without confirming, only the preview updates

### "I want to go back to auto-crop"
- Uncheck "Enable manual crop" to return to automatic center-crop
- Or click "↺ Reset to Center" to recenter

## 📱 Browser Support

Works in:
- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Any modern browser with Canvas API support

## 🎓 Technical Details (For Developers)

- **API**: Canvas 2D Context with mouse events
- **Interaction Model**: Direct manipulation with handle detection
- **Coordinate Space**: Automatic mapping from canvas pixels to image coordinates
- **Performance**: Real-time drawing at 60 FPS
- **Memory**: Efficient single-canvas rendering (no double-buffering needed)

---

**Enjoy your new visual crop interface! 🎨**
