# 🚀 Quick Start: Upload Starter Assets (10 minutes)

Follow these steps exactly to get starter assets into your platform!

---

## ☑️ Step-by-Step Checklist

### 1. Download Kenney Packs (3 minutes)

Open these URLs and click **"Download"** on each:

- [ ] https://kenney.nl/assets/pixel-platformer → Save to `~/Downloads/`
- [ ] https://kenney.nl/assets/interface-sounds → Save to `~/Downloads/`
- [ ] (Optional) https://kenney.nl/assets/digital-audio → Save to `~/Downloads/`

### 2. Extract Files (1 minute)

- [ ] Double-click each `.zip` file to extract
- [ ] Verify you have these folders in `~/Downloads/`:
  ```
  pixel-platformer/
  interface-sounds/
  digital-audio/ (if downloaded)
  ```

### 3. Create Supabase Bucket (2 minutes)

- [ ] Go to https://supabase.com/dashboard → Your Project → **Storage**
- [ ] Click **"New bucket"**
- [ ] Configure:
  - Name: `starter-assets`
  - Public bucket: ✅ **ON** (IMPORTANT!)
  - File size limit: `5242880`
- [ ] Click **"Create bucket"**

### 4. Install Dependencies (1 minute)

```bash
cd /Users/yao/blueprint/martini
pnpm add @supabase/supabase-js tsx
```

### 5. Run Upload Script (3 minutes)

```bash
pnpm upload-starter-assets
```

**Expected output:**
```
🚀 Uploading Starter Assets to Supabase
...
✅ Upload Complete!
   Uploaded: 83 files
```

### 6. Verify (1 minute)

- [ ] Go to Supabase Dashboard → Storage → `starter-assets`
- [ ] You should see `sprites/` and `sounds/` folders
- [ ] Test public URL (replace with your Supabase URL):
  ```
  https://YOUR-PROJECT.supabase.co/storage/v1/object/public/starter-assets/sprites/characters/player-alien.png
  ```

---

## ✅ Success!

You now have **83 curated, kid-friendly assets** ready to use:

- ✅ 8 player characters
- ✅ 8 enemies
- ✅ 15 collectible items
- ✅ 20 platform tiles
- ✅ 10 UI elements
- ✅ 22 sound effects

**Total size:** ~5-8 MB (well within free tier!)

---

## 🐛 Quick Troubleshooting

| Error | Fix |
|-------|-----|
| "Pixel Platformer not found" | Extract ZIPs to `~/Downloads/` exactly |
| "Missing Supabase credentials" | Check `.env` has `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| "row-level security" error | Make bucket **PUBLIC** in Supabase dashboard |
| Some uploads fail | Check specific error messages, file paths may vary |

---

## 📖 Detailed Guides

For more info, see:
- [scripts/README.md](scripts/README.md) - Detailed upload guide
- [STARTER_ASSETS_SETUP.md](STARTER_ASSETS_SETUP.md) - Full setup instructions

---

**Ready?** Start with Step 1! 🎮✨
