import { j as json } from './index-Djsj11qr.js';
import { d as db, p as projects, a as assets } from './index3-Cd3ryqyN.js';
import { eq } from 'drizzle-orm';
import { createServerClient } from '@supabase/ssr';
import { P as PUBLIC_SUPABASE_URL, a as PUBLIC_SUPABASE_PUBLISHABLE_KEY } from './public-C280cyOd.js';
import 'drizzle-orm/postgres-js';
import 'postgres';
import 'drizzle-orm/pg-core';
import './shared-server-DaWdgxVh.js';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
const POST = async ({ params, request, locals, cookies }) => {
  const { session, user } = await locals.safeGetSession();
  if (!session || !user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  const [project] = await db.select().from(projects).where(eq(projects.id, params.id)).limit(1);
  if (!project) {
    return json({ error: "Project not found" }, { status: 404 });
  }
  if (project.userId !== user.id) {
    return json({ error: "Unauthorized" }, { status: 403 });
  }
  const formData = await request.formData();
  const file = formData.get("file");
  if (!file) {
    return json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return json(
      {
        error: "Invalid file type",
        details: `Allowed types: PNG, JPEG, GIF, WebP`
      },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return json(
      {
        error: "File too large",
        details: `Maximum file size is 5MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`
      },
      { status: 400 }
    );
  }
  const timestamp = Date.now();
  const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_").replace(/_{2,}/g, "_");
  const uniqueFilename = `chat_${timestamp}_${sanitizedFilename}`;
  const storagePath = `${params.id}/chat/${uniqueFilename}`;
  const supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookies.set(name, value, { ...options, path: options.path ?? "/" });
        });
      }
    }
  });
  const { data: uploadData, error: uploadError } = await supabase.storage.from("project-assets").upload(storagePath, file, {
    cacheControl: "3600",
    upsert: false
    // Don't overwrite - each chat image is unique
  });
  if (uploadError) {
    console.error("Supabase upload error:", uploadError);
    return json(
      {
        error: "Failed to upload file",
        details: uploadError.message
      },
      { status: 500 }
    );
  }
  try {
    const [newAsset] = await db.insert(assets).values({
      projectId: params.id,
      filename: uniqueFilename,
      storagePath: uploadData.path,
      fileType: "image",
      assetType: "image",
      sizeBytes: file.size,
      metadata: { isChat: true }
      // Mark as chat image (hidden from AI/game assets)
    }).returning();
    const { data: urlData } = supabase.storage.from("project-assets").getPublicUrl(uploadData.path);
    return json(
      {
        success: true,
        asset: {
          id: newAsset.id,
          filename: newAsset.filename,
          url: urlData.publicUrl,
          sizeBytes: newAsset.sizeBytes,
          mediaType: file.type
          // Return the media type for AI SDK
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Database insert error:", error);
    await supabase.storage.from("project-assets").remove([uploadData.path]);
    return json(
      {
        error: "Failed to save asset metadata",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
};

export { POST };
//# sourceMappingURL=_server.ts-DG4oUhrV.js.map
