# Starter Assets Setup Guide

## 📥 Step 1: Download Assets (5 minutes)

### Required Downloads

1. **Pixel Platformer** (200 assets, ~2MB)
   - URL: https://kenney.nl/assets/pixel-platformer
   - Click **"Download"** button (green button on the page)
   - Save as: `pixel-platformer.zip`

2. **Interface Sounds** (100 sounds, ~3MB)
   - URL: https://kenney.nl/assets/interface-sounds
   - Click **"Download"** button
   - Save as: `interface-sounds.zip`

3. **Digital Audio** (OPTIONAL - 50 sounds, ~2MB)
   - URL: https://kenney.nl/assets/digital-audio
   - Click **"Download"** button
   - Save as: `digital-audio.zip`

**Save all files to:** `/Users/yao/Downloads/`

---

## 📂 Step 2: Extract Files

After downloading, you should have:
```
~/Downloads/
├── pixel-platformer.zip
├── interface-sounds.zip
└── digital-audio.zip (optional)
```

**Extract each ZIP file** (double-click on Mac) - this will create folders:
```
~/Downloads/
├── pixel-platformer/
│   ├── Tilemap/
│   ├── Characters/
│   ├── Items/
│   ├── Tiles/
│   └── ... (other folders)
├── interface-sounds/
│   └── Audio/
│       ├── click1.ogg
│       ├── click2.ogg
│       └── ... (100 files)
└── digital-audio/
    └── Audio/
        └── ... (50 files)
```

---

## 🤖 Step 3: Run Automation Script

Once you've extracted the files, I'll create a script that will:
- ✅ Curate the best assets for kids (50-100 carefully selected)
- ✅ Organize into proper folder structure
- ✅ Rename files to be kid-friendly
- ✅ Upload to Supabase `starter-assets` bucket
- ✅ Verify uploads succeeded

**Next:** Tell me when you've downloaded and extracted the files, and I'll create the automation script!

---

## 🎯 What You'll Get

After running the script, your Supabase `starter-assets` bucket will look like:

```
starter-assets/
├── sprites/
│   ├── characters/
│   │   ├── player-alien.png
│   │   ├── player-girl.png
│   │   ├── player-robot.png
│   │   └── ... (10 characters)
│   ├── enemies/
│   │   ├── enemy-slime.png
│   │   ├── enemy-bee.png
│   │   └── ... (8 enemies)
│   ├── items/
│   │   ├── coin-gold.png
│   │   ├── gem-blue.png
│   │   └── ... (15 items)
│   ├── tiles/
│   │   ├── ground-grass.png
│   │   ├── platform-stone.png
│   │   └── ... (20 tiles)
│   └── ui/
│       ├── button-blue.png
│       ├── panel-wood.png
│       └── ... (10 UI elements)
└── sounds/
    ├── effects/
    │   ├── jump.ogg
    │   ├── coin.ogg
    │   ├── hit.ogg
    │   └── ... (15 sounds)
    └── ui/
        ├── click.ogg
        ├── hover.ogg
        └── ... (10 UI sounds)
```

**Total:** ~80-100 hand-picked assets, organized and ready for kids to use!

---

## 💡 Tips

- **Download location**: Save to `~/Downloads/` as shown above (script expects this)
- **Don't rename files yet**: The script will handle renaming
- **Optional donation**: Consider supporting Kenney at https://kenney.nl/support
- **License**: All assets are CC0 (public domain) - safe to redistribute!

---

**Ready?** Download the files, then let me know and I'll create the upload script! 🚀
