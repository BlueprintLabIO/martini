import { v as head } from './index2-C2dN5VzZ.js';
import './exports-CgQJUv15.js';
import { a as attr } from './attributes-B00oQCA2.js';
import './state.svelte-fSU7FZzm.js';
import { U as Users } from './users-CQAY5aps.js';
import './escaping-DIDNNj62.js';
import './context-DXQNhZFv.js';
import './Icon-D2rpxpNy.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let roomCode = "";
    head("hy9bcf", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Join Game - Martini</title>`);
      });
    });
    $$renderer2.push(`<div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900"><div class="w-full max-w-md space-y-8 px-4"><div class="text-center"><div class="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600">`);
    Users($$renderer2, { class: "h-8 w-8 text-white" });
    $$renderer2.push(`<!----></div> <h1 class="text-4xl font-bold text-white">Join a Game</h1> <p class="mt-3 text-lg text-gray-300">Enter a room code to join a multiplayer game</p></div> <form class="mt-8 space-y-6"><div><label for="roomCode" class="sr-only">Room Code</label> <input id="roomCode" type="text"${attr("value", roomCode)} placeholder="Enter 6-digit code" maxlength="6" class="w-full rounded-lg border-2 border-gray-600 bg-gray-800 px-6 py-4 text-center text-2xl font-bold uppercase tracking-widest text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" autocomplete="off" spellcheck="false"/> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> <button type="submit" class="w-full rounded-lg bg-blue-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900">Join Game</button></form> <div class="text-center"><p class="text-sm text-gray-400">Don't have a code? Ask a friend to share their game code!</p></div></div></div>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-DfK0AKAJ.js.map
