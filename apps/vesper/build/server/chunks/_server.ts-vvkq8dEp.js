import { e as error, j as json } from './index-Djsj11qr.js';
import { g as getProjectByShareCode } from './shareCode-BVlW2gVl.js';
import { d as db, p as projects, a as assets } from './index3-Cd3ryqyN.js';
import { eq } from 'drizzle-orm';
import { P as PUBLIC_SUPABASE_URL } from './public-C280cyOd.js';
import 'drizzle-orm/postgres-js';
import 'postgres';
import 'drizzle-orm/pg-core';
import './shared-server-DaWdgxVh.js';

const GET = async ({ params }) => {
  const { shareCode } = params;
  let project;
  const isUUID = shareCode.length > 6 && shareCode.includes("-");
  if (isUUID) {
    const result = await db.select().from(projects).where(eq(projects.id, shareCode)).limit(1);
    if (result.length === 0) {
      throw error(404, "Game not found");
    }
    project = result[0];
  } else {
    project = await getProjectByShareCode(shareCode.toUpperCase());
    if (!project) {
      throw error(404, "Game not found");
    }
    if (project.state !== "published" || !project.shareCode) {
      throw error(404, "Game not available");
    }
  }
  const projectAssets = await db.select().from(assets).where(eq(assets.projectId, project.id));
  return json({
    assets: projectAssets.map((asset) => ({
      id: asset.id,
      filename: asset.filename,
      fileType: asset.fileType,
      url: `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/game-assets/${asset.storagePath}`
    }))
  });
};

export { GET };
//# sourceMappingURL=_server.ts-vvkq8dEp.js.map
