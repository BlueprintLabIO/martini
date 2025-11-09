# Asset Management - Quick Setup Guide

## 🚀 Quick Start (5 minutes)

### Step 1: Run Database Migration
```bash
cd apps/web
pnpm db:push
```

### Step 2: Create Supabase Storage Bucket

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → Your Project → **Storage**

2. Click **"New bucket"**

3. Fill in:
   - **Name:** `project-assets`
   - **Public bucket:** ❌ OFF
   - **File size limit:** `5242880` (5MB)

4. Click **"Create bucket"**

### Step 3: Set Up RLS Policy

In **Storage** → **Policies** → Click **"New policy"**

**Template:** Select "Give users access to own folder"

**Or manually paste this SQL:**

```sql
-- Allow users to upload to their own projects
CREATE POLICY "Users can upload to own projects"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-assets'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text
    FROM public.projects
    WHERE user_id = auth.uid()
  )
);

-- Allow users to read their own project assets
CREATE POLICY "Users can read own project assets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-assets'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text
    FROM public.projects
    WHERE user_id = auth.uid()
  )
);

-- Allow users to delete their own project assets
CREATE POLICY "Users can delete own project assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-assets'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text
    FROM public.projects
    WHERE user_id = auth.uid()
  )
);
```

### Step 4: Test It!

1. Start dev server: `pnpm dev`
2. Open a project in the editor
3. Look for **Asset Panel** below the file tree (left sidebar)
4. Click **Upload** button
5. Select a PNG or JPG image (< 5MB)
6. Click **Upload** in the modal
7. Asset should appear in the list!

---

## 📝 Usage in Game Code

When you upload `player.png`, use it in your game like this:

```javascript
// In your scene's create() method:
this.add.sprite(100, 100, 'player');  // No .png extension needed!

// For audio (e.g., jump.mp3):
this.sound.play('jump');  // No .mp3 extension needed!
```

**Tip:** Click the **Copy** button (📋) next to any asset to get the code snippet!

---

## 🎯 Supported File Types

### Images
- PNG, JPEG, JPG, GIF, WebP
- Max 5MB per file

### Audio
- MP3, WAV, OGG
- Max 5MB per file

---

## ❓ Troubleshooting

### "Failed to upload file"
- Check Supabase bucket exists: `project-assets`
- Verify RLS policies are created
- Make sure you're logged in

### "Asset not loading in game"
- Check browser console for errors
- Verify CSP allows Supabase: `https://*.supabase.co`
- Make sure filename doesn't have special characters

### "Unauthorized" error
- RLS policies might be wrong
- Check that project belongs to logged-in user
- Try re-creating the policies

---

## 📚 Full Documentation

For detailed info, see:
- **[docs/supabase-storage-setup.md](docs/supabase-storage-setup.md)** - Complete setup guide
- **[docs/asset-management-implementation.md](docs/asset-management-implementation.md)** - Implementation details

---

## ✅ You're Done!

Asset management is now fully functional. Kids can:
- ✅ Upload their own sprites and sounds
- ✅ See thumbnails/icons in the panel
- ✅ Copy code snippets to use assets
- ✅ Delete unwanted assets
- ✅ Assets auto-load into games

**Have fun creating! 🎮🎨**
