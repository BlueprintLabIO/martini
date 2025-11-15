import { j as json } from './index-Djsj11qr.js';
import { createClient } from '@supabase/supabase-js';
import { P as PUBLIC_SUPABASE_URL } from './public-C280cyOd.js';
import { a as SECRET_SUPABASE_SERVICE_ROLE_KEY } from './private-B9JdXzlJ.js';

const GET = async () => {
  const supabase = createClient(PUBLIC_SUPABASE_URL, SECRET_SUPABASE_SERVICE_ROLE_KEY);
  try {
    const { data: files, error } = await supabase.storage.from("starter-assets").list("", {
      limit: 1e3,
      sortBy: { column: "name", order: "asc" }
    });
    if (error) {
      return json({
        error: "Failed to fetch starter assets",
        details: error.message
      }, { status: 500 });
    }
    const allFiles = [];
    async function listDirectory(path) {
      const { data: items, error: error2 } = await supabase.storage.from("starter-assets").list(path, {
        limit: 1e3,
        sortBy: { column: "name", order: "asc" }
      });
      if (error2) {
        return;
      }
      for (const item of items || []) {
        const itemPath = path ? `${path}/${item.name}` : item.name;
        if (item.name === "metadata.json") {
          continue;
        }
        if (!item.metadata && item.name.indexOf(".") === -1) {
          await listDirectory(itemPath);
        } else if (item.metadata) {
          allFiles.push({
            name: item.name,
            path: itemPath,
            size: item.metadata.size || 0
          });
        }
      }
    }
    await listDirectory("spritesheets");
    await listDirectory("sounds");
    const spritesheets = allFiles.filter((f) => f.path.startsWith("spritesheets/") && f.name.match(/\.(png|jpg|jpeg|gif|webp)$/i)).map((f) => {
      const { data } = supabase.storage.from("starter-assets").getPublicUrl(f.path);
      return {
        id: `starter-${f.path.replace(/[^a-zA-Z0-9]/g, "-")}`,
        filename: f.name,
        path: f.path,
        fileType: "image",
        assetType: "spritesheet",
        sizeBytes: f.size,
        url: data.publicUrl,
        isStarter: true
      };
    });
    const sounds = allFiles.filter((f) => f.path.startsWith("sounds/") && f.name.match(/\.(mp3|wav|ogg|m4a)$/i)).map((f) => {
      const { data } = supabase.storage.from("starter-assets").getPublicUrl(f.path);
      return {
        id: `starter-${f.path.replace(/[^a-zA-Z0-9]/g, "-")}`,
        filename: f.name,
        path: f.path,
        fileType: "audio",
        assetType: "audio",
        sizeBytes: f.size,
        url: data.publicUrl,
        isStarter: true
      };
    });
    return json({
      assets: {
        spritesheets,
        sounds,
        total: spritesheets.length + sounds.length
      }
    });
  } catch (error) {
    console.error("Unexpected error fetching starter assets:", error);
    return json(
      {
        error: "Failed to fetch starter assets",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
};

export { GET };
//# sourceMappingURL=_server.ts-DQNy_mZU.js.map
