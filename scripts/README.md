# 🚀 Starter Assets Upload Guide

This guide will help you upload curated Kenney.nl assets to your Supabase storage.

## ✅ Prerequisites Checklist

Before running the script, ensure:

- [ ] Supabase `starter-assets` bucket exists
- [ ] Bucket is set to **PUBLIC**
- [ ] You've downloaded the Kenney packs (see below)
- [ ] Files are extracted to `~/Downloads/`

---

## 📥 Step 1: Download Asset Packs

### Required Downloads:

1. **Pixel Platformer** (200 assets)
   ```
   https://kenney.nl/assets/pixel-platformer
   ```
   - Click green "Download" button
   - Save to `~/Downloads/pixel-platformer.zip`
   - Extract (double-click the ZIP file)

2. **Interface Sounds** (100 sounds)
   ```
   https://kenney.nl/assets/interface-sounds
   ```
   - Click green "Download" button
   - Save to `~/Downloads/interface-sounds.zip`
   - Extract

3. **Digital Audio** (OPTIONAL - 50 sounds)
   ```
   https://kenney.nl/assets/digital-audio
   ```
   - Click green "Download" button
   - Save to `~/Downloads/digital-audio.zip`
   - Extract

### After Extraction, You Should Have:

```
~/Downloads/
├── pixel-platformer/
│   ├── Characters/
│   ├── Enemies/
│   ├── Items/
│   ├── Tiles/
│   ├── HUD/
│   └── ...
├── interface-sounds/
│   └── Audio/
│       ├── click_001.ogg
│       ├── confirmation_001.ogg
│       └── ... (100 files)
└── digital-audio/        (optional)
    └── Audio/
        └── ... (50 files)
```

---

## 🪣 Step 2: Create Supabase Bucket

### 2.1 Open Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **Storage** → **Buckets**

### 2.2 Create `starter-assets` Bucket

Click **"New bucket"** and configure:

```
Name:             starter-assets
Public bucket:    ✅ ON (IMPORTANT!)
File size limit:  5242880 (5MB)
Allowed MIME:     (leave empty)
```

Click **"Create bucket"**

### 2.3 Verify Bucket is Public

In the bucket settings, ensure:
- ✅ "Public bucket" toggle is **ON**
- Anyone should be able to read files
- Only authenticated users can upload (we'll do this via script)

---

## 🤖 Step 3: Run Upload Script

### 3.1 Install Dependencies

```bash
cd /Users/yao/blueprint/martini-kit
pnpm add @supabase/supabase-js tsx
```

### 3.2 Run the Upload Script

```bash
pnpm upload-starter-assets
```

### 3.3 What the Script Does

The script will:
1. ✅ Verify downloaded files exist
2. ✅ Select 80-100 best assets for kids
3. ✅ Organize into categories:
   - `sprites/characters/` - 8 player characters
   - `sprites/enemies/` - 8 enemies + hazards
   - `sprites/items/` - 15 collectibles (coins, gems, stars, etc.)
   - `sprites/tiles/` - 20 platform/ground tiles
   - `sprites/ui/` - 10 HUD elements
   - `sounds/effects/` - 13 game sounds (jump, coin, hit, etc.)
   - `sounds/ui/` - 9 UI sounds (click, hover, etc.)
4. ✅ Upload to Supabase with proper naming
5. ✅ Set 1-year cache headers for performance

### 3.4 Expected Output

```
🚀 Uploading Starter Assets to Supabase

📂 Verifying source folders...
✅ Source folders found

🎨 Uploading Sprites...

📁 characters/ (8 files)
  ✅ sprites/characters/player-alien.png
  ✅ sprites/characters/player-girl.png
  ✅ sprites/characters/player-robot.png
  ...

📁 enemies/ (8 files)
  ✅ sprites/enemies/enemy-slime.png
  ✅ sprites/enemies/enemy-bee.png
  ...

🔊 Uploading Sounds...

📁 sounds/effects/ (13 files)
  ✅ sounds/effects/coin.ogg
  ✅ sounds/effects/jump.ogg
  ...

════════════════════════════════════════════════════════════
✅ Upload Complete!
   Uploaded: 83 files
════════════════════════════════════════════════════════════
```

---

## ✅ Step 4: Verify Upload

### 4.1 Check Supabase Dashboard

1. Go to **Storage** → **starter-assets**
2. You should see folders: `sprites/` and `sounds/`
3. Browse through to verify files uploaded

### 4.2 Test Public Access

Open this URL in your browser (replace with your Supabase URL):

```
https://YOUR-PROJECT.supabase.co/storage/v1/object/public/starter-assets/sprites/characters/player-alien.png
```

You should see the alien character image! 🎉

---

## 🎯 What You Get

After successful upload, your starter assets are ready:

### Sprites (63 files)
- **8 Characters**: Colorful player options (alien, girl, robot, etc.)
- **8 Enemies**: Cute baddies (slime, bee, snail, etc.)
- **15 Items**: Collectibles (coins, gems, stars, keys, hearts)
- **20 Tiles**: Platforms and ground (grass, stone, dirt, snow, boxes)
- **10 UI**: HUD elements (numbers, icons)

### Sounds (20 files)
- **13 Effects**: Game sounds (jump, coin, hit, laser, explosion, etc.)
- **9 UI**: Interface sounds (click, hover, toggle, open, close)

**Total:** ~83 carefully curated, kid-friendly assets!

---

## 🐛 Troubleshooting

### Error: "Pixel Platformer not found"

**Solution:**
- Verify you downloaded and extracted to `~/Downloads/`
- Check folder name is exactly `pixel-platformer` (lowercase)
- Run: `ls ~/Downloads/pixel-platformer` to verify

### Error: "Missing Supabase credentials"

**Solution:**
- Check `apps/web/.env` has:
  ```
  PUBLIC_SUPABASE_URL="https://..."
  PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
  ```

### Error: "Upload failed: new row violates row-level security"

**Solution:**
- Bucket must be **PUBLIC** (not private)
- Go to Supabase → Storage → starter-assets → Settings
- Toggle "Public bucket" to ON

### Some Files Failed to Upload

**Solution:**
- Check the specific file paths in error messages
- Kenney occasionally updates pack structure
- You may need to adjust paths in `upload-starter-assets.ts`

---

## 💡 Pro Tips

1. **Optional Donation**: Consider supporting Kenney at https://kenney.nl/support
2. **License**: All assets are CC0 (public domain) - safe to redistribute!
3. **Add More Assets**: Edit `upload-starter-assets.ts` to curate different assets
4. **Cache**: Assets have 1-year cache headers for fast loading
5. **CDN**: Supabase serves from global CDN automatically

---

## 📚 Next Steps

After upload succeeds:

1. ✅ Update AssetPanel to display starter assets
2. ✅ Make `project-assets` bucket public for multiplayer
3. ✅ Fix thumbnail loading with public URLs
4. ✅ Add fallback icons for failed loads

See main project docs for implementation!

---

**Questions?** Ask in your team channel or reach out to the maintainers for help!
