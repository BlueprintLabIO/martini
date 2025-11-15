import { redirect } from "@sveltejs/kit";
const load = async ({ locals }) => {
  const { session, user } = await locals.safeGetSession();
  if (!session || !user) {
    throw redirect(303, "/auth/login");
  }
  return {
    user
  };
};
export {
  load
};
