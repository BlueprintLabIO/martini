import { e as error, j as json } from './index-Djsj11qr.js';
import { d as db, p as projects } from './index3-Cd3ryqyN.js';
import { eq } from 'drizzle-orm';
import { c as clearShareCode, a as generateUniqueShareCode } from './shareCode-BVlW2gVl.js';
import 'drizzle-orm/postgres-js';
import 'postgres';
import 'drizzle-orm/pg-core';
import './shared-server-DaWdgxVh.js';

const POST = async ({ params, locals }) => {
  const { id: projectId } = params;
  const { session, user } = await locals.safeGetSession();
  if (!session || !user) {
    throw error(401, "Unauthorized");
  }
  const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (project.length === 0) {
    throw error(404, "Project not found");
  }
  if (project[0].userId !== user.id) {
    throw error(403, "You do not own this project");
  }
  if (project[0].shareCode && project[0].state === "published") {
    return json({
      shareCode: project[0].shareCode,
      state: project[0].state,
      message: "Project already published for multiplayer"
    });
  }
  const shareCode = await generateUniqueShareCode();
  await db.update(projects).set({
    shareCode,
    state: "published",
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq(projects.id, projectId));
  console.log(`[Multiplayer] Project ${projectId} published with code ${shareCode}`);
  return json({
    shareCode,
    state: "published",
    message: "Share code generated successfully"
  });
};
const DELETE = async ({ params, locals }) => {
  const { id: projectId } = params;
  const { session, user } = await locals.safeGetSession();
  if (!session || !user) {
    throw error(401, "Unauthorized");
  }
  const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (project.length === 0) {
    throw error(404, "Project not found");
  }
  if (project[0].userId !== user.id) {
    throw error(403, "You do not own this project");
  }
  await clearShareCode(projectId);
  console.log(`[Multiplayer] Project ${projectId} unpublished (share code cleared)`);
  return json({
    message: "Multiplayer unpublished successfully"
  });
};
const GET = async ({ params, locals }) => {
  const { id: projectId } = params;
  const { session, user } = await locals.safeGetSession();
  if (!session || !user) {
    throw error(401, "Unauthorized");
  }
  const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (project.length === 0) {
    throw error(404, "Project not found");
  }
  if (project[0].userId !== user.id) {
    throw error(403, "You do not own this project");
  }
  return json({
    shareCode: project[0].shareCode,
    state: project[0].state,
    published: project[0].state === "published" && !!project[0].shareCode
  });
};

export { DELETE, GET, POST };
//# sourceMappingURL=_server.ts-l2IpDy5L.js.map
