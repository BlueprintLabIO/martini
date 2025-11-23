# How to Check if Phaser.Scale.FIT is Enabled

## Method 1: Browser Console Logs
1. Open http://localhost:5173/ide in your browser
2. Open DevTools (F12 or Cmd+Option+I)
3. Go to Console tab
4. Look for these logs:
   ```
   [martini-kit] Applying Phaser scale config: {mode: 2, autoCenter: 2, width: 800, height: 600}
   [martini-kit] Final Phaser config: {...}
   ```
5. Note: `mode: 2` means `Phaser.Scale.FIT` (enum value)

## Method 2: Inspect Phaser Game Instance
1. Open http://localhost:5173/ide
2. Open DevTools Console
3. Wait for game to load
4. Run these commands:

```javascript
// Find the Phaser game canvas
const canvas = document.querySelector('canvas');

// Check scale mode via Phaser game instance
// The game instance might be stored globally or in iframe
// For preview iframe:
const iframe = document.querySelector('iframe');
const iframeWindow = iframe?.contentWindow;
const game = iframeWindow?.game;

if (game) {
  console.log('Scale Mode:', game.scale.scaleMode); // Should be 2 (FIT)
  console.log('Scale Config:', game.config.scale);
} else {
  console.log('Game instance not found - check iframe');
}
```

## Method 3: Visual Verification
If Phaser.Scale.FIT is working:
- ✅ Canvas should scale to fit the container
- ✅ Canvas should maintain aspect ratio (800:600)
- ✅ Canvas should be centered in the container
- ✅ No black bars or stretching

If NOT working:
- ❌ Canvas might be cropped
- ❌ Canvas might overflow container
- ❌ Canvas might not center

## Phaser Scale Mode Reference
```typescript
Phaser.Scale.NONE = 0
Phaser.Scale.WIDTH_CONTROLS_HEIGHT = 1
Phaser.Scale.FIT = 2  // <-- What we want
Phaser.Scale.ENVELOP = 3
Phaser.Scale.RESIZE = 4
```
