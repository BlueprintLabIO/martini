/**
 * Upload Starter Assets to Supabase Storage
 *
 * This script uploads Kenney sprite sheets and sounds to the starter-assets bucket.
 * Uses sprite sheets for efficiency and Phaser-friendly format.
 *
 * Prerequisites:
 * - Downloaded and extracted Kenney packs to ~/Downloads/
 * - Supabase starter-assets bucket created (public)
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../apps/web/.env') });

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SECRET_SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in apps/web/.env');
  console.error('   Need: PUBLIC_SUPABASE_URL and SECRET_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Use service role key to bypass RLS for admin operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Source paths (user's Downloads folder with kenney_ prefix)
const DOWNLOADS = path.join(process.env.HOME || '', 'Downloads');
const PIXEL_PLATFORMER = path.join(DOWNLOADS, 'kenney_pixel-platformer');
const INTERFACE_SOUNDS = path.join(DOWNLOADS, 'kenney_interface-sounds');
const DIGITAL_AUDIO = path.join(DOWNLOADS, 'kenney_digital-audio');

// Sprite sheets to upload (from Tilemap folder)
const SPRITE_SHEETS = [
  {
    src: 'Tilemap/tilemap-characters.png',
    dst: 'spritesheets/characters.png',
    description: '8 player characters (18x18 each)',
  },
  {
    src: 'Tilemap/tilemap.png',
    dst: 'spritesheets/tiles.png',
    description: 'All tiles, items, enemies (18x18 each)',
  },
  {
    src: 'Tilemap/tilemap-backgrounds.png',
    dst: 'spritesheets/backgrounds.png',
    description: 'Background elements',
  },
  {
    src: 'Tilemap/tilemap-characters_packed.png',
    dst: 'spritesheets/characters-packed.png',
    description: 'Packed characters (no spacing)',
  },
  {
    src: 'Tilemap/tilemap_packed.png',
    dst: 'spritesheets/tiles-packed.png',
    description: 'Packed tiles (no spacing)',
  },
];

// Curated sound effects
const SOUNDS = [
  // Game effects
  { src: 'Audio/confirmation_001.ogg', dst: 'sounds/coin.ogg', pack: 'interface' },
  { src: 'Audio/confirmation_002.ogg', dst: 'sounds/powerup.ogg', pack: 'interface' },
  { src: 'Audio/confirmation_003.ogg', dst: 'sounds/success.ogg', pack: 'interface' },
  { src: 'Audio/error_003.ogg', dst: 'sounds/hit.ogg', pack: 'interface' },
  { src: 'Audio/error_006.ogg', dst: 'sounds/death.ogg', pack: 'interface' },
  { src: 'Audio/maximize_008.ogg', dst: 'sounds/jump.ogg', pack: 'interface' },
  { src: 'Audio/minimize_007.ogg', dst: 'sounds/fall.ogg', pack: 'interface' },
  { src: 'Audio/drop_003.ogg', dst: 'sounds/land.ogg', pack: 'interface' },
  { src: 'Audio/pluck_001.ogg', dst: 'sounds/select.ogg', pack: 'interface' },

  // Digital effects (if digital-audio pack exists)
  { src: 'Audio/synth_misc_01.ogg', dst: 'sounds/laser.ogg', pack: 'digital' },
  { src: 'Audio/synth_misc_07.ogg', dst: 'sounds/explosion.ogg', pack: 'digital' },
  { src: 'Audio/synth_misc_15.ogg', dst: 'sounds/magic.ogg', pack: 'digital' },

  // UI sounds
  { src: 'Audio/click_001.ogg', dst: 'sounds/ui-click.ogg', pack: 'interface' },
  { src: 'Audio/click_002.ogg', dst: 'sounds/ui-click-alt.ogg', pack: 'interface' },
  { src: 'Audio/switch_001.ogg', dst: 'sounds/ui-toggle.ogg', pack: 'interface' },
  { src: 'Audio/navigation_forward-selection-minimal.ogg', dst: 'sounds/ui-hover.ogg', pack: 'interface' },
  { src: 'Audio/open_001.ogg', dst: 'sounds/ui-open.ogg', pack: 'interface' },
  { src: 'Audio/close_001.ogg', dst: 'sounds/ui-close.ogg', pack: 'interface' },
];

/**
 * Upload a single file to Supabase Storage
 */
async function uploadFile(
  localPath: string,
  storagePath: string,
  contentType: string
): Promise<boolean> {
  try {
    if (!fs.existsSync(localPath)) {
      console.error(`  ❌ File not found: ${localPath}`);
      return false;
    }

    const fileBuffer = fs.readFileSync(localPath);
    const fileSizeKB = (fileBuffer.length / 1024).toFixed(1);

    const { data, error } = await supabase.storage
      .from('starter-assets')
      .upload(storagePath, fileBuffer, {
        contentType,
        cacheControl: '31536000', // 1 year cache
        upsert: true,
      });

    if (error) {
      console.error(`  ❌ Upload failed: ${error.message}`);
      return false;
    }

    console.log(`  ✅ ${storagePath} (${fileSizeKB} KB)`);
    return true;
  } catch (error) {
    console.error(`  ❌ Error: ${error}`);
    return false;
  }
}

/**
 * Main upload function
 */
async function main() {
  console.log('🚀 Uploading Starter Assets to Supabase\n');

  // Verify source folders exist
  console.log('📂 Verifying source folders...');
  if (!fs.existsSync(PIXEL_PLATFORMER)) {
    console.error(`❌ Pixel Platformer not found at: ${PIXEL_PLATFORMER}`);
    console.error('   Please download from: https://kenney.nl/assets/pixel-platformer');
    console.error('   Extract to ~/Downloads/ (folder should be named kenney_pixel-platformer)');
    process.exit(1);
  }
  if (!fs.existsSync(INTERFACE_SOUNDS)) {
    console.error(`❌ Interface Sounds not found at: ${INTERFACE_SOUNDS}`);
    console.error('   Please download from: https://kenney.nl/assets/interface-sounds');
    console.error('   Extract to ~/Downloads/ (folder should be named kenney_interface-sounds)');
    process.exit(1);
  }

  const hasDigitalAudio = fs.existsSync(DIGITAL_AUDIO);
  if (!hasDigitalAudio) {
    console.log('⚠️  Digital Audio pack not found (optional) - skipping digital sound effects');
  }

  console.log('✅ Source folders found\n');

  let totalUploaded = 0;
  let totalFailed = 0;

  // Upload sprite sheets
  console.log('🎨 Uploading Sprite Sheets...\n');

  for (const sheet of SPRITE_SHEETS) {
    const localPath = path.join(PIXEL_PLATFORMER, sheet.src);

    console.log(`📄 ${sheet.description}`);
    const success = await uploadFile(localPath, sheet.dst, 'image/png');
    if (success) totalUploaded++;
    else totalFailed++;
  }
  console.log('');

  // Upload sounds
  console.log('🔊 Uploading Sounds...\n');

  for (const sound of SOUNDS) {
    // Skip digital audio sounds if pack not downloaded
    if (sound.pack === 'digital' && !hasDigitalAudio) {
      continue;
    }

    const packPath = sound.pack === 'interface' ? INTERFACE_SOUNDS : DIGITAL_AUDIO;
    const localPath = path.join(packPath, sound.src);

    const success = await uploadFile(localPath, sound.dst, 'audio/ogg');
    if (success) totalUploaded++;
    else totalFailed++;
  }
  console.log('');

  // Upload metadata JSON for easier asset browsing
  console.log('📋 Creating Asset Metadata...\n');

  const metadata = {
    spritesheets: {
      characters: {
        file: 'spritesheets/characters.png',
        frameWidth: 18,
        frameHeight: 18,
        frames: 8,
        description: '8 player characters - great for multiplayer games!',
        usage: "this.load.spritesheet('characters', url, { frameWidth: 18, frameHeight: 18 })",
      },
      tiles: {
        file: 'spritesheets/tiles.png',
        frameWidth: 18,
        frameHeight: 18,
        frames: 180, // approximate
        description: 'Platform tiles, items, enemies, hazards',
        usage: "this.load.spritesheet('tiles', url, { frameWidth: 18, frameHeight: 18 })",
      },
      backgrounds: {
        file: 'spritesheets/backgrounds.png',
        frameWidth: 18,
        frameHeight: 18,
        description: 'Background elements (clouds, hills, etc.)',
        usage: "this.load.spritesheet('backgrounds', url, { frameWidth: 18, frameHeight: 18 })",
      },
    },
    sounds: SOUNDS
      .filter(s => s.pack !== 'digital' || hasDigitalAudio)
      .reduce((acc, s) => {
        const name = path.basename(s.dst, '.ogg');
        acc[name] = {
          file: s.dst,
          usage: `this.load.audio('${name}', url)`,
        };
        return acc;
      }, {} as Record<string, any>),
    license: 'CC0 (Public Domain) - Created by Kenney.nl',
    source: 'https://kenney.nl/assets',
  };

  const metadataJson = JSON.stringify(metadata, null, 2);
  const metadataSuccess = await uploadFile(
    Buffer.from(metadataJson) as any,
    'metadata.json',
    'application/json'
  );

  if (metadataSuccess) totalUploaded++;
  else totalFailed++;

  // Summary
  console.log('═'.repeat(60));
  console.log(`✅ Upload Complete!`);
  console.log(`   Uploaded: ${totalUploaded} files`);
  if (totalFailed > 0) {
    console.log(`   Failed: ${totalFailed} files`);
  }
  console.log('═'.repeat(60));

  // Next steps
  console.log('\n📋 Next Steps:');
  console.log('1. Verify bucket "starter-assets" is PUBLIC in Supabase Dashboard');
  console.log('2. Test loading a sprite sheet:');
  console.log(`   ${SUPABASE_URL}/storage/v1/object/public/starter-assets/spritesheets/characters.png`);
  console.log('3. View metadata:');
  console.log(`   ${SUPABASE_URL}/storage/v1/object/public/starter-assets/metadata.json`);
  console.log('\n🎮 Ready to build games with these assets!');
}

// Helper to upload from buffer
async function uploadBuffer(buffer: Buffer, storagePath: string, contentType: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage
      .from('starter-assets')
      .upload(storagePath, buffer, {
        contentType,
        cacheControl: '31536000',
        upsert: true,
      });

    if (error) {
      console.error(`  ❌ Upload failed: ${error.message}`);
      return false;
    }

    console.log(`  ✅ ${storagePath}`);
    return true;
  } catch (error) {
    console.error(`  ❌ Error: ${error}`);
    return false;
  }
}

main().catch(console.error);
