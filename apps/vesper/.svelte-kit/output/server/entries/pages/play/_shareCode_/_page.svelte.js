import { v as head } from "../../../../chunks/index2.js";
import { U as Users } from "../../../../chunks/users.js";
import { j as escape_html } from "../../../../chunks/escaping.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    head("1a8ll76", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html(data.project.name)} - Play</title>`);
      });
    });
    $$renderer2.push(`<div class="flex h-screen flex-col bg-gray-900"><header class="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-6 py-4"><div><h1 class="text-xl font-bold text-white">${escape_html(data.project.name)}</h1> <div class="flex items-center gap-2 text-sm text-gray-400">`);
    if (data.isTestingMode) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<span class="rounded bg-yellow-600/20 px-2 py-0.5 text-yellow-400">Testing Mode</span>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<span>Share Code: ${escape_html(data.project.shareCode)}</span>`);
    }
    $$renderer2.push(`<!--]--> `);
    if (data.roomCode) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<span>•</span> <span class="flex items-center gap-1">`);
      Users($$renderer2, { class: "h-3 w-3" });
      $$renderer2.push(`<!----> Multiplayer Room: ${escape_html(data.roomCode)}</span>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></div></header> <div class="relative flex-1">`);
    {
      $$renderer2.push("<!--[!-->");
      {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--> <iframe src="/sandbox-runtime.html" sandbox="allow-scripts" title="Game" class="h-full w-full border-0"></iframe></div></div>`);
  });
}
export {
  _page as default
};
