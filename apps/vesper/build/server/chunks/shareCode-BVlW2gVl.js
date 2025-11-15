import { d as db, p as projects } from './index3-Cd3ryqyN.js';
import { eq } from 'drizzle-orm';

const SHARE_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SHARE_CODE_LENGTH = 6;
const MAX_GENERATION_ATTEMPTS = 10;
function generateRandomCode() {
  let code = "";
  for (let i = 0; i < SHARE_CODE_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * SHARE_CODE_CHARS.length);
    code += SHARE_CODE_CHARS[randomIndex];
  }
  return code;
}
async function shareCodeExists(code) {
  const result = await db.select().from(projects).where(eq(projects.shareCode, code)).limit(1);
  return result.length > 0;
}
async function generateUniqueShareCode() {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const code = generateRandomCode();
    const exists = await shareCodeExists(code);
    if (!exists) {
      return code;
    }
    console.log(`[ShareCode] Collision on attempt ${attempt + 1}: ${code} already exists`);
  }
  throw new Error(
    `Failed to generate unique share code after ${MAX_GENERATION_ATTEMPTS} attempts. This is extremely unlikely and may indicate a database issue.`
  );
}
function isValidShareCode(code) {
  if (!code || typeof code !== "string") {
    return false;
  }
  if (code.length !== SHARE_CODE_LENGTH) {
    return false;
  }
  if (code !== code.toUpperCase()) {
    return false;
  }
  for (const char of code) {
    if (!SHARE_CODE_CHARS.includes(char)) {
      return false;
    }
  }
  return true;
}
async function getProjectByShareCode(code) {
  if (!isValidShareCode(code)) {
    return null;
  }
  const result = await db.select().from(projects).where(eq(projects.shareCode, code)).limit(1);
  if (result.length === 0) {
    return null;
  }
  return result[0];
}
async function clearShareCode(projectId) {
  await db.update(projects).set({
    shareCode: null,
    state: "draft"
  }).where(eq(projects.id, projectId));
}

export { generateUniqueShareCode as a, clearShareCode as c, getProjectByShareCode as g };
//# sourceMappingURL=shareCode-BVlW2gVl.js.map
