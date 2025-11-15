import { redirect } from "@sveltejs/kit";
import { g as getProjectByShareCode } from "../../../../chunks/shareCode.js";
import { d as db, p as projects } from "../../../../chunks/index3.js";
import { eq } from "drizzle-orm";
const load = async ({ params, url }) => {
  const { shareCode } = params;
  const roomCode = url.searchParams.get("room");
  if (!shareCode) {
    throw redirect(303, "/play");
  }
  let project;
  const isUUID = shareCode.length > 6 && shareCode.includes("-");
  if (isUUID) {
    const result = await db.select().from(projects).where(eq(projects.id, shareCode)).limit(1);
    if (result.length === 0) {
      throw redirect(303, "/play");
    }
    project = result[0];
  } else {
    if (shareCode.length !== 6) {
      throw redirect(303, "/play");
    }
    project = await getProjectByShareCode(shareCode.toUpperCase());
    if (!project) {
      throw redirect(303, "/play");
    }
    if (project.state !== "published" || !project.shareCode) {
      throw redirect(303, "/play");
    }
  }
  return {
    project: {
      id: project.id,
      name: project.name,
      shareCode: project.shareCode || shareCode
      // Use shareCode if published, otherwise use ID
    },
    roomCode,
    // Pass room code for multiplayer
    isTestingMode: isUUID
    // Flag to show "testing mode" UI
  };
};
export {
  load
};
