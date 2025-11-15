import { a as attr } from "../../../chunks/attributes.js";
import { e as escape_html } from "../../../chunks/escaping.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/state.svelte.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    data.supabase;
    let loggingOut = false;
    $$renderer2.push(`<div class="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-blue-900"><nav class="bg-white/10 backdrop-blur-lg border-b border-white/20"><div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div class="flex justify-between items-center h-16"><div class="flex items-center"><h1 class="text-2xl font-bold text-white">Martini</h1></div> <button${attr("disabled", loggingOut, true)} class="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50">${escape_html("Log Out")}</button></div></div></nav> <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"><div class="mb-8"><div class="flex justify-between items-center mb-6"><div><h2 class="text-3xl font-bold text-white">My Projects</h2> <p class="text-purple-200 mt-1">Logged in as: <span class="font-mono">${escape_html(data.user.email)}</span></p></div> <button class="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-all">+ New Project</button></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="bg-white/10 backdrop-blur-lg rounded-2xl p-12 shadow-2xl text-center"><div class="text-white text-lg">Loading projects...</div></div>`);
    }
    $$renderer2.push(`<!--]--></div></main> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
export {
  _page as default
};
