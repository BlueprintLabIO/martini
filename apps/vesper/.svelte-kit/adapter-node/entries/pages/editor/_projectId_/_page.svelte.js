import { i as is_array, b as get_prototype_of, o as object_prototype, k as run, j as escape_html } from "../../../../chunks/escaping.js";
import { clsx } from "clsx";
import { z as ATTACHMENT_KEY, F as sanitize_props, G as spread_props, J as slot, K as attributes, N as bind_props, O as derived, P as props_id, Q as attr_class, y as stringify, x as ensure_array_like } from "../../../../chunks/index2.js";
import { c as clearConsoleLogs } from "../../../../chunks/game-console-output.js";
import { I as Icon } from "../../../../chunks/Icon.js";
import { a as attr } from "../../../../chunks/attributes.js";
import { a as ssr_context, h as hasContext, g as getContext, s as setContext } from "../../../../chunks/context.js";
import { diffLines } from "diff";
import { AbstractChat } from "ai";
import { twMerge } from "tailwind-merge";
const empty = [];
function snapshot(value, skip_warning = false, no_tojson = false) {
  return clone(value, /* @__PURE__ */ new Map(), "", empty, null, no_tojson);
}
function clone(value, cloned, path, paths, original = null, no_tojson = false) {
  if (typeof value === "object" && value !== null) {
    var unwrapped = cloned.get(value);
    if (unwrapped !== void 0) return unwrapped;
    if (value instanceof Map) return (
      /** @type {Snapshot<T>} */
      new Map(value)
    );
    if (value instanceof Set) return (
      /** @type {Snapshot<T>} */
      new Set(value)
    );
    if (is_array(value)) {
      var copy = (
        /** @type {Snapshot<any>} */
        Array(value.length)
      );
      cloned.set(value, copy);
      if (original !== null) {
        cloned.set(original, copy);
      }
      for (var i = 0; i < value.length; i += 1) {
        var element2 = value[i];
        if (i in value) {
          copy[i] = clone(element2, cloned, path, paths, null, no_tojson);
        }
      }
      return copy;
    }
    if (get_prototype_of(value) === object_prototype) {
      copy = {};
      cloned.set(value, copy);
      if (original !== null) {
        cloned.set(original, copy);
      }
      for (var key in value) {
        copy[key] = clone(
          // @ts-expect-error
          value[key],
          cloned,
          path,
          paths,
          null,
          no_tojson
        );
      }
      return copy;
    }
    if (value instanceof Date) {
      return (
        /** @type {Snapshot<T>} */
        structuredClone(value)
      );
    }
    if (typeof /** @type {T & { toJSON?: any } } */
    value.toJSON === "function" && !no_tojson) {
      return clone(
        /** @type {T & { toJSON(): any } } */
        value.toJSON(),
        cloned,
        path,
        paths,
        // Associate the instance with the toJSON clone
        value
      );
    }
  }
  if (value instanceof EventTarget) {
    return (
      /** @type {Snapshot<T>} */
      value
    );
  }
  try {
    return (
      /** @type {Snapshot<T>} */
      structuredClone(value)
    );
  } catch (e) {
    return (
      /** @type {Snapshot<T>} */
      value
    );
  }
}
function createAttachmentKey() {
  return Symbol(ATTACHMENT_KEY);
}
function onDestroy(fn) {
  /** @type {SSRContext} */
  ssr_context.r.on_destroy(fn);
}
async function tick() {
}
function Arrow_left($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    ["path", { "d": "m12 19-7-7 7-7" }],
    ["path", { "d": "M19 12H5" }]
  ];
  Icon($$renderer, spread_props([
    { name: "arrow-left" },
    $$sanitized_props,
    {
      /**
       * @component @name ArrowLeft
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtMTIgMTktNy03IDctNyIgLz4KICA8cGF0aCBkPSJNMTkgMTJINSIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/arrow-left
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      iconNode,
      children: ($$renderer2) => {
        $$renderer2.push(`<!--[-->`);
        slot($$renderer2, $$props, "default", {});
        $$renderer2.push(`<!--]-->`);
      },
      $$slots: { default: true }
    }
  ]));
}
function Check($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [["path", { "d": "M20 6 9 17l-5-5" }]];
  Icon($$renderer, spread_props([
    { name: "check" },
    $$sanitized_props,
    {
      /**
       * @component @name Check
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMjAgNiA5IDE3bC01LTUiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/check
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      iconNode,
      children: ($$renderer2) => {
        $$renderer2.push(`<!--[-->`);
        slot($$renderer2, $$props, "default", {});
        $$renderer2.push(`<!--]-->`);
      },
      $$slots: { default: true }
    }
  ]));
}
function Chevron_down($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [["path", { "d": "m6 9 6 6 6-6" }]];
  Icon($$renderer, spread_props([
    { name: "chevron-down" },
    $$sanitized_props,
    {
      /**
       * @component @name ChevronDown
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtNiA5IDYgNiA2LTYiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/chevron-down
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      iconNode,
      children: ($$renderer2) => {
        $$renderer2.push(`<!--[-->`);
        slot($$renderer2, $$props, "default", {});
        $$renderer2.push(`<!--]-->`);
      },
      $$slots: { default: true }
    }
  ]));
}
function Circle_alert($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    ["circle", { "cx": "12", "cy": "12", "r": "10" }],
    ["line", { "x1": "12", "x2": "12", "y1": "8", "y2": "12" }],
    [
      "line",
      { "x1": "12", "x2": "12.01", "y1": "16", "y2": "16" }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "circle-alert" },
    $$sanitized_props,
    {
      /**
       * @component @name CircleAlert
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgLz4KICA8bGluZSB4MT0iMTIiIHgyPSIxMiIgeTE9IjgiIHkyPSIxMiIgLz4KICA8bGluZSB4MT0iMTIiIHgyPSIxMi4wMSIgeTE9IjE2IiB5Mj0iMTYiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/circle-alert
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      iconNode,
      children: ($$renderer2) => {
        $$renderer2.push(`<!--[-->`);
        slot($$renderer2, $$props, "default", {});
        $$renderer2.push(`<!--]-->`);
      },
      $$slots: { default: true }
    }
  ]));
}
function Circle_stop($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    ["circle", { "cx": "12", "cy": "12", "r": "10" }],
    [
      "rect",
      { "x": "9", "y": "9", "width": "6", "height": "6", "rx": "1" }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "circle-stop" },
    $$sanitized_props,
    {
      /**
       * @component @name CircleStop
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgLz4KICA8cmVjdCB4PSI5IiB5PSI5IiB3aWR0aD0iNiIgaGVpZ2h0PSI2IiByeD0iMSIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/circle-stop
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      iconNode,
      children: ($$renderer2) => {
        $$renderer2.push(`<!--[-->`);
        slot($$renderer2, $$props, "default", {});
        $$renderer2.push(`<!--]-->`);
      },
      $$slots: { default: true }
    }
  ]));
}
function Copy($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    [
      "rect",
      {
        "width": "14",
        "height": "14",
        "x": "8",
        "y": "8",
        "rx": "2",
        "ry": "2"
      }
    ],
    [
      "path",
      {
        "d": "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"
      }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "copy" },
    $$sanitized_props,
    {
      /**
       * @component @name Copy
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cmVjdCB3aWR0aD0iMTQiIGhlaWdodD0iMTQiIHg9IjgiIHk9IjgiIHJ4PSIyIiByeT0iMiIgLz4KICA8cGF0aCBkPSJNNCAxNmMtMS4xIDAtMi0uOS0yLTJWNGMwLTEuMS45LTIgMi0yaDEwYzEuMSAwIDIgLjkgMiAyIiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/copy
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      iconNode,
      children: ($$renderer2) => {
        $$renderer2.push(`<!--[-->`);
        slot($$renderer2, $$props, "default", {});
        $$renderer2.push(`<!--]-->`);
      },
      $$slots: { default: true }
    }
  ]));
}
function Grip_vertical($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    ["circle", { "cx": "9", "cy": "12", "r": "1" }],
    ["circle", { "cx": "9", "cy": "5", "r": "1" }],
    ["circle", { "cx": "9", "cy": "19", "r": "1" }],
    ["circle", { "cx": "15", "cy": "12", "r": "1" }],
    ["circle", { "cx": "15", "cy": "5", "r": "1" }],
    ["circle", { "cx": "15", "cy": "19", "r": "1" }]
  ];
  Icon($$renderer, spread_props([
    { name: "grip-vertical" },
    $$sanitized_props,
    {
      /**
       * @component @name GripVertical
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8Y2lyY2xlIGN4PSI5IiBjeT0iMTIiIHI9IjEiIC8+CiAgPGNpcmNsZSBjeD0iOSIgY3k9IjUiIHI9IjEiIC8+CiAgPGNpcmNsZSBjeD0iOSIgY3k9IjE5IiByPSIxIiAvPgogIDxjaXJjbGUgY3g9IjE1IiBjeT0iMTIiIHI9IjEiIC8+CiAgPGNpcmNsZSBjeD0iMTUiIGN5PSI1IiByPSIxIiAvPgogIDxjaXJjbGUgY3g9IjE1IiBjeT0iMTkiIHI9IjEiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/grip-vertical
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      iconNode,
      children: ($$renderer2) => {
        $$renderer2.push(`<!--[-->`);
        slot($$renderer2, $$props, "default", {});
        $$renderer2.push(`<!--]-->`);
      },
      $$slots: { default: true }
    }
  ]));
}
function Image($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    [
      "rect",
      {
        "width": "18",
        "height": "18",
        "x": "3",
        "y": "3",
        "rx": "2",
        "ry": "2"
      }
    ],
    ["circle", { "cx": "9", "cy": "9", "r": "2" }],
    ["path", { "d": "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" }]
  ];
  Icon($$renderer, spread_props([
    { name: "image" },
    $$sanitized_props,
    {
      /**
       * @component @name Image
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cmVjdCB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHg9IjMiIHk9IjMiIHJ4PSIyIiByeT0iMiIgLz4KICA8Y2lyY2xlIGN4PSI5IiBjeT0iOSIgcj0iMiIgLz4KICA8cGF0aCBkPSJtMjEgMTUtMy4wODYtMy4wODZhMiAyIDAgMCAwLTIuODI4IDBMNiAyMSIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/image
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      iconNode,
      children: ($$renderer2) => {
        $$renderer2.push(`<!--[-->`);
        slot($$renderer2, $$props, "default", {});
        $$renderer2.push(`<!--]-->`);
      },
      $$slots: { default: true }
    }
  ]));
}
function Link($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    [
      "path",
      {
        "d": "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
      }
    ],
    [
      "path",
      {
        "d": "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
      }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "link" },
    $$sanitized_props,
    {
      /**
       * @component @name Link
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTAgMTNhNSA1IDAgMCAwIDcuNTQuNTRsMy0zYTUgNSAwIDAgMC03LjA3LTcuMDdsLTEuNzIgMS43MSIgLz4KICA8cGF0aCBkPSJNMTQgMTFhNSA1IDAgMCAwLTcuNTQtLjU0bC0zIDNhNSA1IDAgMCAwIDcuMDcgNy4wN2wxLjcxLTEuNzEiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/link
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      iconNode,
      children: ($$renderer2) => {
        $$renderer2.push(`<!--[-->`);
        slot($$renderer2, $$props, "default", {});
        $$renderer2.push(`<!--]-->`);
      },
      $$slots: { default: true }
    }
  ]));
}
function Pause($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    [
      "rect",
      { "x": "14", "y": "3", "width": "5", "height": "18", "rx": "1" }
    ],
    [
      "rect",
      { "x": "5", "y": "3", "width": "5", "height": "18", "rx": "1" }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "pause" },
    $$sanitized_props,
    {
      /**
       * @component @name Pause
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cmVjdCB4PSIxNCIgeT0iMyIgd2lkdGg9IjUiIGhlaWdodD0iMTgiIHJ4PSIxIiAvPgogIDxyZWN0IHg9IjUiIHk9IjMiIHdpZHRoPSI1IiBoZWlnaHQ9IjE4IiByeD0iMSIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/pause
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      iconNode,
      children: ($$renderer2) => {
        $$renderer2.push(`<!--[-->`);
        slot($$renderer2, $$props, "default", {});
        $$renderer2.push(`<!--]-->`);
      },
      $$slots: { default: true }
    }
  ]));
}
function Play($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    [
      "path",
      {
        "d": "M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"
      }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "play" },
    $$sanitized_props,
    {
      /**
       * @component @name Play
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNNSA1YTIgMiAwIDAgMSAzLjAwOC0xLjcyOGwxMS45OTcgNi45OThhMiAyIDAgMCAxIC4wMDMgMy40NThsLTEyIDdBMiAyIDAgMCAxIDUgMTl6IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/play
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      iconNode,
      children: ($$renderer2) => {
        $$renderer2.push(`<!--[-->`);
        slot($$renderer2, $$props, "default", {});
        $$renderer2.push(`<!--]-->`);
      },
      $$slots: { default: true }
    }
  ]));
}
function Plus($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [["path", { "d": "M5 12h14" }], ["path", { "d": "M12 5v14" }]];
  Icon($$renderer, spread_props([
    { name: "plus" },
    $$sanitized_props,
    {
      /**
       * @component @name Plus
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNNSAxMmgxNCIgLz4KICA8cGF0aCBkPSJNMTIgNXYxNCIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/plus
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      iconNode,
      children: ($$renderer2) => {
        $$renderer2.push(`<!--[-->`);
        slot($$renderer2, $$props, "default", {});
        $$renderer2.push(`<!--]-->`);
      },
      $$slots: { default: true }
    }
  ]));
}
function Terminal($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    ["path", { "d": "M12 19h8" }],
    ["path", { "d": "m4 17 6-6-6-6" }]
  ];
  Icon($$renderer, spread_props([
    { name: "terminal" },
    $$sanitized_props,
    {
      /**
       * @component @name Terminal
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTIgMTloOCIgLz4KICA8cGF0aCBkPSJtNCAxNyA2LTYtNi02IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/terminal
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      iconNode,
      children: ($$renderer2) => {
        $$renderer2.push(`<!--[-->`);
        slot($$renderer2, $$props, "default", {});
        $$renderer2.push(`<!--]-->`);
      },
      $$slots: { default: true }
    }
  ]));
}
function X($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    ["path", { "d": "M18 6 6 18" }],
    ["path", { "d": "m6 6 12 12" }]
  ];
  Icon($$renderer, spread_props([
    { name: "x" },
    $$sanitized_props,
    {
      /**
       * @component @name X
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTggNiA2IDE4IiAvPgogIDxwYXRoIGQ9Im02IDYgMTIgMTIiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/x
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      iconNode,
      children: ($$renderer2) => {
        $$renderer2.push(`<!--[-->`);
        slot($$renderer2, $$props, "default", {});
        $$renderer2.push(`<!--]-->`);
      },
      $$slots: { default: true }
    }
  ]));
}
function Zap_off($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    [
      "path",
      {
        "d": "M10.513 4.856 13.12 2.17a.5.5 0 0 1 .86.46l-1.377 4.317"
      }
    ],
    [
      "path",
      { "d": "M15.656 10H20a1 1 0 0 1 .78 1.63l-1.72 1.773" }
    ],
    [
      "path",
      {
        "d": "M16.273 16.273 10.88 21.83a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14H4a1 1 0 0 1-.78-1.63l4.507-4.643"
      }
    ],
    ["path", { "d": "m2 2 20 20" }]
  ];
  Icon($$renderer, spread_props([
    { name: "zap-off" },
    $$sanitized_props,
    {
      /**
       * @component @name ZapOff
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTAuNTEzIDQuODU2IDEzLjEyIDIuMTdhLjUuNSAwIDAgMSAuODYuNDZsLTEuMzc3IDQuMzE3IiAvPgogIDxwYXRoIGQ9Ik0xNS42NTYgMTBIMjBhMSAxIDAgMCAxIC43OCAxLjYzbC0xLjcyIDEuNzczIiAvPgogIDxwYXRoIGQ9Ik0xNi4yNzMgMTYuMjczIDEwLjg4IDIxLjgzYS41LjUgMCAwIDEtLjg2LS40NmwxLjkyLTYuMDJBMSAxIDAgMCAwIDExIDE0SDRhMSAxIDAgMCAxLS43OC0xLjYzbDQuNTA3LTQuNjQzIiAvPgogIDxwYXRoIGQ9Im0yIDIgMjAgMjAiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/zap-off
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      iconNode,
      children: ($$renderer2) => {
        $$renderer2.push(`<!--[-->`);
        slot($$renderer2, $$props, "default", {});
        $$renderer2.push(`<!--]-->`);
      },
      $$slots: { default: true }
    }
  ]));
}
function Zap($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    [
      "path",
      {
        "d": "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"
      }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "zap" },
    $$sanitized_props,
    {
      /**
       * @component @name Zap
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNNCAxNGExIDEgMCAwIDEtLjc4LTEuNjNsOS45LTEwLjJhLjUuNSAwIDAgMSAuODYuNDZsLTEuOTIgNi4wMkExIDEgMCAwIDAgMTMgMTBoN2ExIDEgMCAwIDEgLjc4IDEuNjNsLTkuOSAxMC4yYS41LjUgMCAwIDEtLjg2LS40NmwxLjkyLTYuMDJBMSAxIDAgMCAwIDExIDE0eiIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/zap
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      iconNode,
      children: ($$renderer2) => {
        $$renderer2.push(`<!--[-->`);
        slot($$renderer2, $$props, "default", {});
        $$renderer2.push(`<!--]-->`);
      },
      $$slots: { default: true }
    }
  ]));
}
function isObject$1(value) {
  return value !== null && typeof value === "object";
}
const CLASS_VALUE_PRIMITIVE_TYPES$1 = ["string", "number", "bigint", "boolean"];
function isClassValue$1(value) {
  if (value === null || value === void 0)
    return true;
  if (CLASS_VALUE_PRIMITIVE_TYPES$1.includes(typeof value))
    return true;
  if (Array.isArray(value))
    return value.every((item) => isClassValue$1(item));
  if (typeof value === "object") {
    if (Object.getPrototypeOf(value) !== Object.prototype)
      return false;
    return true;
  }
  return false;
}
const BoxSymbol$1 = Symbol("box");
const isWritableSymbol$1 = Symbol("is-writable");
function boxWith$1(getter, setter) {
  const derived2 = getter();
  if (setter) {
    return {
      [BoxSymbol$1]: true,
      [isWritableSymbol$1]: true,
      get current() {
        return derived2;
      },
      set current(v) {
        setter(v);
      }
    };
  }
  return {
    [BoxSymbol$1]: true,
    get current() {
      return getter();
    }
  };
}
function isBox$1(value) {
  return isObject$1(value) && BoxSymbol$1 in value;
}
function composeHandlers$1(...handlers) {
  return function(e) {
    for (const handler of handlers) {
      if (!handler)
        continue;
      if (e.defaultPrevented)
        return;
      if (typeof handler === "function") {
        handler.call(this, e);
      } else {
        handler.current?.call(this, e);
      }
    }
  };
}
var COMMENT_REGEX = /\/\*[^*]*\*+([^/*][^*]*\*+)*\//g;
var NEWLINE_REGEX = /\n/g;
var WHITESPACE_REGEX = /^\s*/;
var PROPERTY_REGEX = /^(\*?[-#/*\\\w]+(\[[0-9a-z_-]+\])?)\s*/;
var COLON_REGEX = /^:\s*/;
var VALUE_REGEX = /^((?:'(?:\\'|.)*?'|"(?:\\"|.)*?"|\([^)]*?\)|[^};])+)/;
var SEMICOLON_REGEX = /^[;\s]*/;
var TRIM_REGEX = /^\s+|\s+$/g;
var NEWLINE = "\n";
var FORWARD_SLASH = "/";
var ASTERISK = "*";
var EMPTY_STRING = "";
var TYPE_COMMENT = "comment";
var TYPE_DECLARATION = "declaration";
function index(style, options) {
  if (typeof style !== "string") {
    throw new TypeError("First argument must be a string");
  }
  if (!style) return [];
  options = options || {};
  var lineno = 1;
  var column = 1;
  function updatePosition(str) {
    var lines = str.match(NEWLINE_REGEX);
    if (lines) lineno += lines.length;
    var i = str.lastIndexOf(NEWLINE);
    column = ~i ? str.length - i : column + str.length;
  }
  function position() {
    var start = { line: lineno, column };
    return function(node) {
      node.position = new Position(start);
      whitespace();
      return node;
    };
  }
  function Position(start) {
    this.start = start;
    this.end = { line: lineno, column };
    this.source = options.source;
  }
  Position.prototype.content = style;
  function error(msg) {
    var err = new Error(
      options.source + ":" + lineno + ":" + column + ": " + msg
    );
    err.reason = msg;
    err.filename = options.source;
    err.line = lineno;
    err.column = column;
    err.source = style;
    if (options.silent) ;
    else {
      throw err;
    }
  }
  function match(re) {
    var m = re.exec(style);
    if (!m) return;
    var str = m[0];
    updatePosition(str);
    style = style.slice(str.length);
    return m;
  }
  function whitespace() {
    match(WHITESPACE_REGEX);
  }
  function comments(rules) {
    var c;
    rules = rules || [];
    while (c = comment()) {
      if (c !== false) {
        rules.push(c);
      }
    }
    return rules;
  }
  function comment() {
    var pos = position();
    if (FORWARD_SLASH != style.charAt(0) || ASTERISK != style.charAt(1)) return;
    var i = 2;
    while (EMPTY_STRING != style.charAt(i) && (ASTERISK != style.charAt(i) || FORWARD_SLASH != style.charAt(i + 1))) {
      ++i;
    }
    i += 2;
    if (EMPTY_STRING === style.charAt(i - 1)) {
      return error("End of comment missing");
    }
    var str = style.slice(2, i - 2);
    column += 2;
    updatePosition(str);
    style = style.slice(i);
    column += 2;
    return pos({
      type: TYPE_COMMENT,
      comment: str
    });
  }
  function declaration() {
    var pos = position();
    var prop = match(PROPERTY_REGEX);
    if (!prop) return;
    comment();
    if (!match(COLON_REGEX)) return error("property missing ':'");
    var val = match(VALUE_REGEX);
    var ret = pos({
      type: TYPE_DECLARATION,
      property: trim(prop[0].replace(COMMENT_REGEX, EMPTY_STRING)),
      value: val ? trim(val[0].replace(COMMENT_REGEX, EMPTY_STRING)) : EMPTY_STRING
    });
    match(SEMICOLON_REGEX);
    return ret;
  }
  function declarations() {
    var decls = [];
    comments(decls);
    var decl;
    while (decl = declaration()) {
      if (decl !== false) {
        decls.push(decl);
        comments(decls);
      }
    }
    return decls;
  }
  whitespace();
  return declarations();
}
function trim(str) {
  return str ? str.replace(TRIM_REGEX, EMPTY_STRING) : EMPTY_STRING;
}
function StyleToObject(style, iterator) {
  let styleObject = null;
  if (!style || typeof style !== "string") {
    return styleObject;
  }
  const declarations = index(style);
  const hasIterator = typeof iterator === "function";
  declarations.forEach((declaration) => {
    if (declaration.type !== "declaration") {
      return;
    }
    const { property, value } = declaration;
    if (hasIterator) {
      iterator(property, value, declaration);
    } else if (value) {
      styleObject = styleObject || {};
      styleObject[property] = value;
    }
  });
  return styleObject;
}
const NUMBER_CHAR_RE$1 = /\d/;
const STR_SPLITTERS$1 = ["-", "_", "/", "."];
function isUppercase$1(char = "") {
  if (NUMBER_CHAR_RE$1.test(char))
    return void 0;
  return char !== char.toLowerCase();
}
function splitByCase$1(str) {
  const parts = [];
  let buff = "";
  let previousUpper;
  let previousSplitter;
  for (const char of str) {
    const isSplitter = STR_SPLITTERS$1.includes(char);
    if (isSplitter === true) {
      parts.push(buff);
      buff = "";
      previousUpper = void 0;
      continue;
    }
    const isUpper = isUppercase$1(char);
    if (previousSplitter === false) {
      if (previousUpper === false && isUpper === true) {
        parts.push(buff);
        buff = char;
        previousUpper = isUpper;
        continue;
      }
      if (previousUpper === true && isUpper === false && buff.length > 1) {
        const lastChar = buff.at(-1);
        parts.push(buff.slice(0, Math.max(0, buff.length - 1)));
        buff = lastChar + char;
        previousUpper = isUpper;
        continue;
      }
    }
    buff += char;
    previousUpper = isUpper;
    previousSplitter = isSplitter;
  }
  parts.push(buff);
  return parts;
}
function pascalCase$1(str) {
  if (!str)
    return "";
  return splitByCase$1(str).map((p) => upperFirst$1(p)).join("");
}
function camelCase$1(str) {
  return lowerFirst$1(pascalCase$1(str || ""));
}
function upperFirst$1(str) {
  return str ? str[0].toUpperCase() + str.slice(1) : "";
}
function lowerFirst$1(str) {
  return str ? str[0].toLowerCase() + str.slice(1) : "";
}
function cssToStyleObj$1(css) {
  if (!css)
    return {};
  const styleObj = {};
  function iterator(name, value) {
    if (name.startsWith("-moz-") || name.startsWith("-webkit-") || name.startsWith("-ms-") || name.startsWith("-o-")) {
      styleObj[pascalCase$1(name)] = value;
      return;
    }
    if (name.startsWith("--")) {
      styleObj[name] = value;
      return;
    }
    styleObj[camelCase$1(name)] = value;
  }
  StyleToObject(css, iterator);
  return styleObj;
}
function executeCallbacks$1(...callbacks) {
  return (...args) => {
    for (const callback of callbacks) {
      if (typeof callback === "function") {
        callback(...args);
      }
    }
  };
}
function createParser$1(matcher, replacer) {
  const regex = RegExp(matcher, "g");
  return (str) => {
    if (typeof str !== "string") {
      throw new TypeError(`expected an argument of type string, but got ${typeof str}`);
    }
    if (!str.match(regex))
      return str;
    return str.replace(regex, replacer);
  };
}
const camelToKebab$1 = createParser$1(/[A-Z]/, (match) => `-${match.toLowerCase()}`);
function styleToCSS$1(styleObj) {
  if (!styleObj || typeof styleObj !== "object" || Array.isArray(styleObj)) {
    throw new TypeError(`expected an argument of type object, but got ${typeof styleObj}`);
  }
  return Object.keys(styleObj).map((property) => `${camelToKebab$1(property)}: ${styleObj[property]};`).join("\n");
}
function styleToString$1(style = {}) {
  return styleToCSS$1(style).replace("\n", " ");
}
const EVENT_LIST$1 = [
  "onabort",
  "onanimationcancel",
  "onanimationend",
  "onanimationiteration",
  "onanimationstart",
  "onauxclick",
  "onbeforeinput",
  "onbeforetoggle",
  "onblur",
  "oncancel",
  "oncanplay",
  "oncanplaythrough",
  "onchange",
  "onclick",
  "onclose",
  "oncompositionend",
  "oncompositionstart",
  "oncompositionupdate",
  "oncontextlost",
  "oncontextmenu",
  "oncontextrestored",
  "oncopy",
  "oncuechange",
  "oncut",
  "ondblclick",
  "ondrag",
  "ondragend",
  "ondragenter",
  "ondragleave",
  "ondragover",
  "ondragstart",
  "ondrop",
  "ondurationchange",
  "onemptied",
  "onended",
  "onerror",
  "onfocus",
  "onfocusin",
  "onfocusout",
  "onformdata",
  "ongotpointercapture",
  "oninput",
  "oninvalid",
  "onkeydown",
  "onkeypress",
  "onkeyup",
  "onload",
  "onloadeddata",
  "onloadedmetadata",
  "onloadstart",
  "onlostpointercapture",
  "onmousedown",
  "onmouseenter",
  "onmouseleave",
  "onmousemove",
  "onmouseout",
  "onmouseover",
  "onmouseup",
  "onpaste",
  "onpause",
  "onplay",
  "onplaying",
  "onpointercancel",
  "onpointerdown",
  "onpointerenter",
  "onpointerleave",
  "onpointermove",
  "onpointerout",
  "onpointerover",
  "onpointerup",
  "onprogress",
  "onratechange",
  "onreset",
  "onresize",
  "onscroll",
  "onscrollend",
  "onsecuritypolicyviolation",
  "onseeked",
  "onseeking",
  "onselect",
  "onselectionchange",
  "onselectstart",
  "onslotchange",
  "onstalled",
  "onsubmit",
  "onsuspend",
  "ontimeupdate",
  "ontoggle",
  "ontouchcancel",
  "ontouchend",
  "ontouchmove",
  "ontouchstart",
  "ontransitioncancel",
  "ontransitionend",
  "ontransitionrun",
  "ontransitionstart",
  "onvolumechange",
  "onwaiting",
  "onwebkitanimationend",
  "onwebkitanimationiteration",
  "onwebkitanimationstart",
  "onwebkittransitionend",
  "onwheel"
];
const EVENT_LIST_SET$1 = new Set(EVENT_LIST$1);
function isEventHandler$1(key) {
  return EVENT_LIST_SET$1.has(key);
}
function mergeProps$1(...args) {
  const result = { ...args[0] };
  for (let i = 1; i < args.length; i++) {
    const props = args[i];
    if (!props)
      continue;
    for (const key of Object.keys(props)) {
      const a = result[key];
      const b = props[key];
      const aIsFunction = typeof a === "function";
      const bIsFunction = typeof b === "function";
      if (aIsFunction && typeof bIsFunction && isEventHandler$1(key)) {
        const aHandler = a;
        const bHandler = b;
        result[key] = composeHandlers$1(aHandler, bHandler);
      } else if (aIsFunction && bIsFunction) {
        result[key] = executeCallbacks$1(a, b);
      } else if (key === "class") {
        const aIsClassValue = isClassValue$1(a);
        const bIsClassValue = isClassValue$1(b);
        if (aIsClassValue && bIsClassValue) {
          result[key] = clsx(a, b);
        } else if (aIsClassValue) {
          result[key] = clsx(a);
        } else if (bIsClassValue) {
          result[key] = clsx(b);
        }
      } else if (key === "style") {
        const aIsObject = typeof a === "object";
        const bIsObject = typeof b === "object";
        const aIsString = typeof a === "string";
        const bIsString = typeof b === "string";
        if (aIsObject && bIsObject) {
          result[key] = { ...a, ...b };
        } else if (aIsObject && bIsString) {
          const parsedStyle = cssToStyleObj$1(b);
          result[key] = { ...a, ...parsedStyle };
        } else if (aIsString && bIsObject) {
          const parsedStyle = cssToStyleObj$1(a);
          result[key] = { ...parsedStyle, ...b };
        } else if (aIsString && bIsString) {
          const parsedStyleA = cssToStyleObj$1(a);
          const parsedStyleB = cssToStyleObj$1(b);
          result[key] = { ...parsedStyleA, ...parsedStyleB };
        } else if (aIsObject) {
          result[key] = a;
        } else if (bIsObject) {
          result[key] = b;
        } else if (aIsString) {
          result[key] = a;
        } else if (bIsString) {
          result[key] = b;
        }
      } else {
        result[key] = b !== void 0 ? b : a;
      }
    }
    for (const key of Object.getOwnPropertySymbols(props)) {
      const a = result[key];
      const b = props[key];
      result[key] = b !== void 0 ? b : a;
    }
  }
  if (typeof result.style === "object") {
    result.style = styleToString$1(result.style).replaceAll("\n", " ");
  }
  if (result.hidden === false) {
    result.hidden = void 0;
    delete result.hidden;
  }
  if (result.disabled === false) {
    result.disabled = void 0;
    delete result.disabled;
  }
  return result;
}
const srOnlyStyles$1 = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: "0",
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  borderWidth: "0",
  transform: "translateX(-100%)"
};
const srOnlyStylesString = styleToString$1(srOnlyStyles$1);
const defaultWindow$2 = void 0;
function getActiveElement$3(document2) {
  let activeElement = document2.activeElement;
  while (activeElement?.shadowRoot) {
    const node = activeElement.shadowRoot.activeElement;
    if (node === activeElement)
      break;
    else
      activeElement = node;
  }
  return activeElement;
}
function createSubscriber(_) {
  return () => {
  };
}
let ActiveElement$2 = class ActiveElement {
  #document;
  #subscribe;
  constructor(options = {}) {
    const { window: window2 = defaultWindow$2, document: document2 = window2?.document } = options;
    if (window2 === void 0) return;
    this.#document = document2;
    this.#subscribe = createSubscriber();
  }
  get current() {
    this.#subscribe?.();
    if (!this.#document) return null;
    return getActiveElement$3(this.#document);
  }
};
new ActiveElement$2();
let Context$1 = class Context {
  #name;
  #key;
  /**
   * @param name The name of the context.
   * This is used for generating the context key and error messages.
   */
  constructor(name) {
    this.#name = name;
    this.#key = Symbol(name);
  }
  /**
   * The key used to get and set the context.
   *
   * It is not recommended to use this value directly.
   * Instead, use the methods provided by this class.
   */
  get key() {
    return this.#key;
  }
  /**
   * Checks whether this has been set in the context of a parent component.
   *
   * Must be called during component initialisation.
   */
  exists() {
    return hasContext(this.#key);
  }
  /**
   * Retrieves the context that belongs to the closest parent component.
   *
   * Must be called during component initialisation.
   *
   * @throws An error if the context does not exist.
   */
  get() {
    const context = getContext(this.#key);
    if (context === void 0) {
      throw new Error(`Context "${this.#name}" not found`);
    }
    return context;
  }
  /**
   * Retrieves the context that belongs to the closest parent component,
   * or the given fallback value if the context does not exist.
   *
   * Must be called during component initialisation.
   */
  getOr(fallback) {
    const context = getContext(this.#key);
    if (context === void 0) {
      return fallback;
    }
    return context;
  }
  /**
   * Associates the given value with the current component and returns it.
   *
   * Must be called during component initialisation.
   */
  set(context) {
    return setContext(this.#key, context);
  }
};
function attachRef$1(ref, onChange) {
  return {
    [createAttachmentKey()]: (node) => {
      if (isBox$1(ref)) {
        ref.current = node;
        run(() => onChange?.(node));
        return () => {
          if ("isConnected" in node && node.isConnected)
            return;
          ref.current = null;
        };
      }
      ref(node);
      run(() => onChange?.(node));
      return () => {
        if ("isConnected" in node && node.isConnected)
          return;
        ref(null);
      };
    }
  };
}
function boolToStr(condition) {
  return condition ? "true" : "false";
}
function boolToEmptyStrOrUndef(condition) {
  return condition ? "" : void 0;
}
function boolToTrueOrUndef(condition) {
  return condition ? true : void 0;
}
function getDataChecked(condition) {
  return condition ? "checked" : "unchecked";
}
function getAriaChecked(checked, indeterminate) {
  return checked ? "true" : "false";
}
class BitsAttrs {
  #variant;
  #prefix;
  attrs;
  constructor(config) {
    this.#variant = config.getVariant ? config.getVariant() : null;
    this.#prefix = this.#variant ? `data-${this.#variant}-` : `data-${config.component}-`;
    this.getAttr = this.getAttr.bind(this);
    this.selector = this.selector.bind(this);
    this.attrs = Object.fromEntries(config.parts.map((part) => [part, this.getAttr(part)]));
  }
  getAttr(part, variantOverride) {
    if (variantOverride)
      return `data-${variantOverride}-${part}`;
    return `${this.#prefix}${part}`;
  }
  selector(part, variantOverride) {
    return `[${this.getAttr(part, variantOverride)}]`;
  }
}
function createBitsAttrs(config) {
  const bitsAttrs = new BitsAttrs(config);
  return {
    ...bitsAttrs.attrs,
    selector: bitsAttrs.selector,
    getAttr: bitsAttrs.getAttr
  };
}
const ENTER = "Enter";
const SPACE = " ";
function noop$1() {
}
function createId(prefixOrUid, uid) {
  return `bits-${prefixOrUid}`;
}
function Hidden_input($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { value = void 0, $$slots, $$events, ...restProps } = $$props;
    const mergedProps = mergeProps$1(restProps, {
      "aria-hidden": "true",
      tabindex: -1,
      style: srOnlyStylesString
    });
    if (mergedProps.type === "checkbox") {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<input${attributes({ ...mergedProps, value }, void 0, void 0, void 0, 4)}/>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<input${attributes({ value, ...mergedProps }, void 0, void 0, void 0, 4)}/>`);
    }
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, { value });
  });
}
const labelAttrs = createBitsAttrs({ component: "label", parts: ["root"] });
class LabelRootState {
  static create(opts) {
    return new LabelRootState(opts);
  }
  opts;
  attachment;
  constructor(opts) {
    this.opts = opts;
    this.attachment = attachRef$1(this.opts.ref);
    this.onmousedown = this.onmousedown.bind(this);
  }
  onmousedown(e) {
    if (e.detail > 1) e.preventDefault();
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    [labelAttrs.root]: "",
    onmousedown: this.onmousedown,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
function Label$1($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const uid = props_id($$renderer2);
    let {
      children,
      child,
      id = createId(uid),
      ref = null,
      for: forProp,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const rootState = LabelRootState.create({
      id: boxWith$1(() => id),
      ref: boxWith$1(() => ref, (v) => ref = v)
    });
    const mergedProps = mergeProps$1(restProps, rootState.props, { for: forProp });
    if (child) {
      $$renderer2.push("<!--[-->");
      child($$renderer2, { props: mergedProps });
      $$renderer2.push(`<!---->`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<label${attributes({ ...mergedProps, for: forProp })}>`);
      children?.($$renderer2);
      $$renderer2.push(`<!----></label>`);
    }
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, { ref });
  });
}
const switchAttrs = createBitsAttrs({ component: "switch", parts: ["root", "thumb"] });
const SwitchRootContext = new Context$1("Switch.Root");
class SwitchRootState {
  static create(opts) {
    return SwitchRootContext.set(new SwitchRootState(opts));
  }
  opts;
  attachment;
  constructor(opts) {
    this.opts = opts;
    this.attachment = attachRef$1(opts.ref);
    this.onkeydown = this.onkeydown.bind(this);
    this.onclick = this.onclick.bind(this);
  }
  #toggle() {
    this.opts.checked.current = !this.opts.checked.current;
  }
  onkeydown(e) {
    if (!(e.key === ENTER || e.key === SPACE) || this.opts.disabled.current) return;
    e.preventDefault();
    this.#toggle();
  }
  onclick(_) {
    if (this.opts.disabled.current) return;
    this.#toggle();
  }
  #sharedProps = derived(() => ({
    "data-disabled": boolToEmptyStrOrUndef(this.opts.disabled.current),
    "data-state": getDataChecked(this.opts.checked.current),
    "data-required": boolToEmptyStrOrUndef(this.opts.required.current)
  }));
  get sharedProps() {
    return this.#sharedProps();
  }
  set sharedProps($$value) {
    return this.#sharedProps($$value);
  }
  #snippetProps = derived(() => ({ checked: this.opts.checked.current }));
  get snippetProps() {
    return this.#snippetProps();
  }
  set snippetProps($$value) {
    return this.#snippetProps($$value);
  }
  #props = derived(() => ({
    ...this.sharedProps,
    id: this.opts.id.current,
    role: "switch",
    disabled: boolToTrueOrUndef(this.opts.disabled.current),
    "aria-checked": getAriaChecked(this.opts.checked.current),
    "aria-required": boolToStr(this.opts.required.current),
    [switchAttrs.root]: "",
    onclick: this.onclick,
    onkeydown: this.onkeydown,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class SwitchInputState {
  static create() {
    return new SwitchInputState(SwitchRootContext.get());
  }
  root;
  #shouldRender = derived(() => this.root.opts.name.current !== void 0);
  get shouldRender() {
    return this.#shouldRender();
  }
  set shouldRender($$value) {
    return this.#shouldRender($$value);
  }
  constructor(root) {
    this.root = root;
  }
  #props = derived(() => ({
    type: "checkbox",
    name: this.root.opts.name.current,
    value: this.root.opts.value.current,
    checked: this.root.opts.checked.current,
    disabled: this.root.opts.disabled.current,
    required: this.root.opts.required.current
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class SwitchThumbState {
  static create(opts) {
    return new SwitchThumbState(opts, SwitchRootContext.get());
  }
  opts;
  root;
  attachment;
  constructor(opts, root) {
    this.opts = opts;
    this.root = root;
    this.attachment = attachRef$1(opts.ref);
  }
  #snippetProps = derived(() => ({ checked: this.root.opts.checked.current }));
  get snippetProps() {
    return this.#snippetProps();
  }
  set snippetProps($$value) {
    return this.#snippetProps($$value);
  }
  #props = derived(() => ({
    ...this.root.sharedProps,
    id: this.opts.id.current,
    [switchAttrs.thumb]: "",
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
function Switch_input($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const inputState = SwitchInputState.create();
    if (inputState.shouldRender) {
      $$renderer2.push("<!--[-->");
      Hidden_input($$renderer2, spread_props([inputState.props]));
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function Switch$1($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const uid = props_id($$renderer2);
    let {
      child,
      children,
      ref = null,
      id = createId(uid),
      disabled = false,
      required = false,
      checked = false,
      value = "on",
      name = void 0,
      type = "button",
      onCheckedChange = noop$1,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const rootState = SwitchRootState.create({
      checked: boxWith$1(() => checked, (v) => {
        checked = v;
        onCheckedChange?.(v);
      }),
      disabled: boxWith$1(() => disabled ?? false),
      required: boxWith$1(() => required),
      value: boxWith$1(() => value),
      name: boxWith$1(() => name),
      id: boxWith$1(() => id),
      ref: boxWith$1(() => ref, (v) => ref = v)
    });
    const mergedProps = mergeProps$1(restProps, rootState.props, { type });
    if (child) {
      $$renderer2.push("<!--[-->");
      child($$renderer2, { props: mergedProps, ...rootState.snippetProps });
      $$renderer2.push(`<!---->`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<button${attributes({ ...mergedProps })}>`);
      children?.($$renderer2, rootState.snippetProps);
      $$renderer2.push(`<!----></button>`);
    }
    $$renderer2.push(`<!--]--> `);
    Switch_input($$renderer2);
    $$renderer2.push(`<!---->`);
    bind_props($$props, { ref, checked });
  });
}
function Switch_thumb($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const uid = props_id($$renderer2);
    let {
      child,
      children,
      ref = null,
      id = createId(uid),
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const thumbState = SwitchThumbState.create({
      id: boxWith$1(() => id),
      ref: boxWith$1(() => ref, (v) => ref = v)
    });
    const mergedProps = mergeProps$1(restProps, thumbState.props);
    if (child) {
      $$renderer2.push("<!--[-->");
      child($$renderer2, { props: mergedProps, ...thumbState.snippetProps });
      $$renderer2.push(`<!---->`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<span${attributes({ ...mergedProps })}>`);
      children?.($$renderer2, thumbState.snippetProps);
      $$renderer2.push(`<!----></span>`);
    }
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, { ref });
  });
}
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
class FileTreeStore {
  files = [];
  activeFile = null;
  buildTree(filePaths) {
    const root = [];
    filePaths.forEach((path) => {
      const parts = path.split("/").filter(Boolean);
      let current = root;
      parts.forEach((part, i) => {
        const isFile = i === parts.length - 1;
        let node = current.find((n) => n.name === part);
        if (!node) {
          node = {
            path: "/" + parts.slice(0, i + 1).join("/"),
            name: part,
            type: isFile ? "file" : "folder",
            children: isFile ? void 0 : []
          };
          current.push(node);
        }
        if (!isFile && node.children) {
          current = node.children;
        }
      });
    });
    this.files = root;
  }
  setActiveFile(path) {
    this.activeFile = path;
  }
}
const fileTree = new FileTreeStore();
function GamePreview($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      projectId,
      onRunGame,
      hotReloadEnabled = true,
      onSendErrorToAI,
      iframeEl = void 0
    } = $$props;
    let gameError = null;
    let consoleLogs = [];
    let isReady = false;
    let isLoading = false;
    let roomCode = null;
    let multiplayerUrl = null;
    async function runGame() {
      console.log("🎮 [Parent] runGame() called");
      console.log("   [Parent] isReady:", isReady, "| isLoading:", isLoading);
      isLoading = true;
      gameError = null;
      consoleLogs = [];
      clearConsoleLogs(projectId);
      try {
        console.log("📦 [Parent] Fetching code bundle and assets...");
        const [codeResponse, assetsResponse] = await Promise.all([
          fetch(`/api/projects/${projectId}/bundle`, { method: "POST" }),
          fetch(`/api/projects/${projectId}/assets`)
        ]);
        if (!codeResponse.ok) {
          const error = await codeResponse.json();
          throw new Error(error.details || error.error || "Failed to bundle code");
        }
        const { code } = await codeResponse.json();
        console.log("✅ [Parent] Code bundle fetched, size:", code.length, "chars");
        let assets = [];
        if (assetsResponse.ok) {
          const assetsData = await assetsResponse.json();
          assets = assetsData.assets || [];
        }
        roomCode = generateRoomCode();
        const generatedRoomId = `room-${roomCode}`;
        const baseUrl = window.location.origin;
        multiplayerUrl = `${baseUrl}/play/${projectId}?room=${roomCode}`;
        console.log("📨 [Parent] Sending LOAD_CODE to iframe...");
        console.log("   [Parent] Room ID:", generatedRoomId, "| isHost: true");
        if (iframeEl?.contentWindow) {
          iframeEl.contentWindow.postMessage(
            {
              type: "LOAD_CODE",
              payload: {
                code,
                roomId: generatedRoomId,
                isHost: true,
                // Editor is always host
                assets: assets.map((asset) => ({
                  filename: asset.filename,
                  fileType: asset.fileType,
                  url: asset.url
                }))
              }
            },
            "*"
          );
          console.log("✅ [Parent] LOAD_CODE message sent");
        } else {
          console.error("❌ [Parent] iframe contentWindow not available!");
        }
        await onRunGame();
      } catch (error) {
        gameError = {
          message: error instanceof Error ? error.message : String(error)
        };
        isLoading = false;
      }
    }
    function generateRoomCode() {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const length = 6;
      let code = "";
      for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    }
    $$renderer2.push(`<div class="flex h-full flex-col border-l bg-muted/20"><div class="flex items-center justify-between border-b bg-background px-4 py-2"><h3 class="text-sm font-semibold">Game Preview</h3> <div class="flex gap-2 items-center">`);
    if (
      // Expose runGame to parent
      multiplayerUrl && isReady
    ) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="flex items-center gap-2 rounded bg-blue-600/10 px-3 py-1 border border-blue-600/20">`);
      Link($$renderer2, { class: "h-3 w-3 text-blue-600" });
      $$renderer2.push(`<!----> <span class="text-xs text-blue-600 max-w-[200px] truncate"${attr("title", multiplayerUrl)}>/play/...?room=${escape_html(roomCode)}</span> <button class="hover:bg-blue-600/20 rounded p-1 transition" title="Copy multiplayer link">`);
      {
        $$renderer2.push("<!--[!-->");
        Copy($$renderer2, { class: "h-3 w-3 text-blue-600" });
      }
      $$renderer2.push(`<!--]--></button></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <button${attr_class(`flex items-center gap-1 rounded px-2 py-1 text-xs ${stringify(hotReloadEnabled ? "bg-green-600/10 text-green-600 hover:bg-green-600/20" : "text-muted-foreground hover:bg-muted")}`)}${attr("title", hotReloadEnabled ? "Hot reload ON (auto-refresh on save)" : "Hot reload OFF")}>`);
    if (hotReloadEnabled) {
      $$renderer2.push("<!--[-->");
      Zap($$renderer2, { class: "h-3 w-3" });
      $$renderer2.push(`<!----> Hot Reload`);
    } else {
      $$renderer2.push("<!--[!-->");
      Zap_off($$renderer2, { class: "h-3 w-3" });
      $$renderer2.push(`<!----> Hot Reload`);
    }
    $$renderer2.push(`<!--]--></button> <button class="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-muted" title="Toggle console">`);
    Terminal($$renderer2, { class: "h-3 w-3" });
    $$renderer2.push(`<!----> Console `);
    if (consoleLogs.length > 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`(${escape_html(consoleLogs.length)})`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></button></div></div> <div class="relative flex-1 overflow-hidden">`);
    if (gameError) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="absolute inset-0 z-10 flex items-center justify-center bg-black/90 p-6"><div class="max-w-md text-center">`);
      Circle_alert($$renderer2, { class: "mx-auto mb-4 h-12 w-12 text-red-500" });
      $$renderer2.push(`<!----> <h4 class="mb-2 text-lg font-bold text-white">Game Error</h4> <p class="mb-4 font-mono text-sm text-red-300">${escape_html(gameError.message)}</p> <div class="flex gap-2 justify-center"><button class="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">Retry</button> `);
      if (onSendErrorToAI) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<button class="rounded bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700">🤖 Fix with AI</button>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> <button class="rounded bg-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-700">Close</button></div></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (isLoading) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="absolute inset-0 z-10 flex items-center justify-center bg-black/50"><div class="text-center"><div class="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent mx-auto"></div> <p class="text-sm text-white">Bundling &amp; loading game...</p></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <iframe src="/sandbox-runtime.html" sandbox="allow-scripts" title="Game Preview" class="h-full w-full border-0"></iframe></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div>`);
    bind_props($$props, { hotReloadEnabled, iframeEl, runGame });
  });
}
class Chat extends AbstractChat {
  constructor(init) {
    super({ ...init, state: new SvelteChatState(init.messages) });
  }
}
class SvelteChatState {
  messages;
  status = "ready";
  error = void 0;
  constructor(messages = []) {
    this.messages = messages;
  }
  setMessages = (messages) => {
    this.messages = messages;
  };
  pushMessage = (message) => {
    this.messages.push(message);
  };
  popMessage = () => {
    this.messages.pop();
  };
  replaceMessage = (index2, message) => {
    this.messages[index2] = message;
  };
  snapshot = (thing) => snapshot(thing);
}
function ChatHeader($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      conversations,
      currentConversationId,
      isLoadingConversations,
      isStreaming,
      isSavingMessages,
      showConversationDropdown = void 0,
      onConversationSwitch,
      onNewConversation
    } = $$props;
    const currentTitle = conversations.find((c) => c.id === currentConversationId)?.title || "Select conversation";
    $$renderer2.push(`<div class="header svelte-rcge9b"><div class="title svelte-rcge9b">`);
    if (isLoadingConversations) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<span class="text svelte-rcge9b">Loading...</span>`);
    } else {
      $$renderer2.push("<!--[!-->");
      if (currentConversationId) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="conversation-selector svelte-rcge9b"><button class="conversation-btn svelte-rcge9b"${attr("disabled", isStreaming, true)}${attr("title", isStreaming ? "Cannot switch conversations while AI is thinking" : "Switch conversation")}><span class="conversation-title svelte-rcge9b">${escape_html(currentTitle)}</span> `);
        Chevron_down($$renderer2, { class: "h-4 w-4" });
        $$renderer2.push(`<!----></button> `);
        if (showConversationDropdown) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="conversation-dropdown svelte-rcge9b"><!--[-->`);
          const each_array = ensure_array_like(conversations.filter((c) => !c.isArchived));
          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
            let conv = each_array[$$index];
            $$renderer2.push(`<button${attr_class("conversation-item svelte-rcge9b", void 0, { "active": conv.id === currentConversationId })}>${escape_html(conv.title)}</button>`);
          }
          $$renderer2.push(`<!--]--></div>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--></div> <button class="new-conversation-btn svelte-rcge9b"${attr("disabled", isStreaming, true)}${attr("title", isStreaming ? "Cannot create new conversation while AI is thinking" : "New conversation")}>`);
        Plus($$renderer2, { class: "h-4 w-4" });
        $$renderer2.push(`<!----></button>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--> `);
    if (isStreaming) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<span class="loading-indicator svelte-rcge9b">●</span>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (isSavingMessages) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<span class="saving-indicator svelte-rcge9b" title="Saving...">💾</span>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></div>`);
    bind_props($$props, { showConversationDropdown });
  });
}
function ToolReadFile($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { part } = $$props;
    const input = part.input;
    const output = part.output;
    $$renderer2.push(`<div class="tool-name svelte-1pd3wwm">📖 Reading ${escape_html(input?.path || "file")}</div> `);
    if (output) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="tool-result svelte-1pd3wwm">`);
      if (output.error) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<span class="error svelte-1pd3wwm">❌ ${escape_html(output.error)}</span>`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<span class="success svelte-1pd3wwm">✅ Read ${escape_html(output.lines)} lines (${escape_html(output.size)} bytes)</span>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function ToolListFiles($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { part } = $$props;
    const output = part.output;
    $$renderer2.push(`<div class="tool-name svelte-e54psj">📂 Listing files...</div> `);
    if (output) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="tool-result svelte-e54psj">`);
      if (output.error) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<span class="error svelte-e54psj">❌ ${escape_html(output.error)}</span>`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<span class="success svelte-e54psj">✅ Found ${escape_html(output.total)} files</span>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function DiffPreview($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { before, after, lineStart } = $$props;
    const diffResult = (() => {
      return diffLines(before, after);
    })();
    $$renderer2.push(`<div class="diff-preview svelte-hb5k53"><div class="diff-preview-header svelte-hb5k53">Line ${escape_html(lineStart)}</div> <div class="diff-preview-panels svelte-hb5k53"><div class="diff-preview-panel before svelte-hb5k53"><div class="diff-preview-label svelte-hb5k53">Before:</div> <pre class="diff-preview-code svelte-hb5k53"><!--[-->`);
    const each_array = ensure_array_like(diffResult);
    for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
      let change = each_array[$$index_1];
      if (!change.added) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<!--[-->`);
        const each_array_1 = ensure_array_like(change.value.split("\n").filter(Boolean));
        for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
          let line = each_array_1[$$index];
          $$renderer2.push(`<span${attr_class("svelte-hb5k53", void 0, {
            "removed": change.removed,
            "context": !change.removed && !change.added
          })}>${escape_html(change.removed ? "- " : "  ")}${escape_html(line)}
</span>`);
        }
        $$renderer2.push(`<!--]-->`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></pre></div> <div class="diff-preview-panel after svelte-hb5k53"><div class="diff-preview-label svelte-hb5k53">After:</div> <pre class="diff-preview-code svelte-hb5k53"><!--[-->`);
    const each_array_2 = ensure_array_like(diffResult);
    for (let $$index_3 = 0, $$length = each_array_2.length; $$index_3 < $$length; $$index_3++) {
      let change = each_array_2[$$index_3];
      if (!change.removed) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<!--[-->`);
        const each_array_3 = ensure_array_like(change.value.split("\n").filter(Boolean));
        for (let $$index_2 = 0, $$length2 = each_array_3.length; $$index_2 < $$length2; $$index_2++) {
          let line = each_array_3[$$index_2];
          $$renderer2.push(`<span${attr_class("svelte-hb5k53", void 0, {
            "added": change.added,
            "context": !change.removed && !change.added
          })}>${escape_html(change.added ? "+ " : "  ")}${escape_html(line)}
</span>`);
        }
        $$renderer2.push(`<!--]-->`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></pre></div></div></div>`);
  });
}
function extractDiffPreview(originalContent, edits) {
  if (!edits || edits.length === 0) return null;
  const firstEdit = edits[0];
  if (!firstEdit.old_text || firstEdit.new_text === void 0) return null;
  const matchIndex = originalContent.indexOf(firstEdit.old_text);
  if (matchIndex === -1) {
    return {
      before: firstEdit.old_text.slice(0, 200),
      after: firstEdit.new_text.slice(0, 200),
      lineStart: 1
    };
  }
  const beforeMatch = originalContent.slice(0, matchIndex);
  const lineNumber = beforeMatch.split("\n").length;
  const lines = originalContent.split("\n");
  const contextBefore = 3;
  const contextAfter = 3;
  const changeStartLine = lineNumber - 1;
  const startLine = Math.max(0, changeStartLine - contextBefore);
  const endLine = Math.min(lines.length, changeStartLine + 1 + contextAfter);
  const beforeLines = lines.slice(startLine, endLine);
  const before = beforeLines.join("\n");
  const afterContent = originalContent.slice(0, matchIndex) + firstEdit.new_text + originalContent.slice(matchIndex + firstEdit.old_text.length);
  const afterLines = afterContent.split("\n").slice(startLine, endLine);
  const after = afterLines.join("\n");
  return {
    before: before || "(empty)",
    after: after || "(empty)",
    lineStart: lineNumber
  };
}
function countLines(content) {
  return content.split("\n").length;
}
function ToolEditFile($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { part, originalContentCache } = $$props;
    const input = part.input;
    const output = part.output;
    const state = "state" in part ? part.state : null;
    const diffPreview = () => {
      if (state !== "input-streaming" || !input?.path || !input?.edits) return null;
      const originalContent = originalContentCache.get(input.path) || "";
      if (!originalContent) return null;
      return extractDiffPreview(originalContent, input.edits);
    };
    $$renderer2.push(`<div class="tool-name svelte-1w4r9ae">✏️ Editing ${escape_html(input?.path || "file")} `);
    if (state === "input-streaming") {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<span class="text-xs text-muted-foreground ml-2 svelte-1w4r9ae"><span class="streaming-indicator svelte-1w4r9ae">●</span> Streaming...</span>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> `);
    if (state === "input-streaming" && input) {
      $$renderer2.push("<!--[-->");
      const preview = diffPreview();
      if (preview) {
        $$renderer2.push("<!--[-->");
        DiffPreview($$renderer2, {
          before: preview.before,
          after: preview.after,
          lineStart: preview.lineStart
        });
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<div class="streaming-preview svelte-1w4r9ae"><div class="streaming-preview-label svelte-1w4r9ae">Preparing changes...</div></div>`);
      }
      $$renderer2.push(`<!--]-->`);
    } else {
      $$renderer2.push("<!--[!-->");
      if (state === "approval-requested" && !output) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="approval-notice svelte-1w4r9ae"><div class="approval-label svelte-1w4r9ae">Auto-approving...</div> <div class="file-path svelte-1w4r9ae">${escape_html(input?.path || "Unknown file")}</div></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
        if (output) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="tool-result svelte-1w4r9ae">`);
          if (output.error) {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`<span class="error svelte-1w4r9ae">❌ ${escape_html(output.error)}</span>`);
          } else {
            $$renderer2.push("<!--[!-->");
            $$renderer2.push(`<span class="success svelte-1w4r9ae">✅ File updated (${escape_html(output.changes?.old_lines)} → ${escape_html(output.changes?.new_lines)} lines)</span> `);
            if (output.diff) {
              $$renderer2.push("<!--[-->");
              $$renderer2.push(`<details class="diff-details svelte-1w4r9ae"><summary class="svelte-1w4r9ae">View diff</summary> <pre class="diff-content svelte-1w4r9ae">${escape_html(output.diff)}</pre></details>`);
            } else {
              $$renderer2.push("<!--[!-->");
            }
            $$renderer2.push(`<!--]-->`);
          }
          $$renderer2.push(`<!--]--></div>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function ToolCreateFile($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { part } = $$props;
    const input = part.input;
    const output = part.output;
    const state = "state" in part ? part.state : null;
    const approvalId = "approval" in part ? part.approval?.id : null;
    $$renderer2.push(`<div class="tool-name svelte-19axggu">📄 Creating ${escape_html(input?.path || "file")} `);
    if (state === "input-streaming") {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<span class="text-xs text-muted-foreground ml-2 svelte-19axggu"><span class="streaming-indicator svelte-19axggu">●</span> Streaming...</span>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> `);
    if (state === "input-streaming" && input) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="create-file-preview svelte-19axggu"><div class="create-file-header svelte-19axggu"><span class="svelte-19axggu">📄 Creating: ${escape_html(input.path)}</span></div> `);
      if (input.content) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="create-file-content svelte-19axggu"><pre class="svelte-19axggu"><code class="svelte-19axggu">${escape_html(input.content)}</code></pre></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<div class="streaming-preview svelte-19axggu"><div class="streaming-preview-label svelte-19axggu">Preparing file content...</div></div>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      if (state === "approval-requested" && !output) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="approval-request svelte-19axggu"><div class="approval-details svelte-19axggu"><div class="file-path svelte-19axggu">${escape_html(input?.path || "Unknown file")}</div> <div class="file-info svelte-19axggu">New file (${escape_html(input?.content ? countLines(input.content) : 0)} lines)</div> `);
        if (approvalId) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="approval-actions svelte-19axggu"><button class="approve-btn svelte-19axggu">`);
          Check($$renderer2, { class: "h-4 w-4" });
          $$renderer2.push(`<!----> <span class="svelte-19axggu">Approve</span></button> <button class="deny-btn svelte-19axggu">`);
          X($$renderer2, { class: "h-4 w-4" });
          $$renderer2.push(`<!----> <span class="svelte-19axggu">Reject</span></button></div>`);
        } else {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push(`<div class="diff-notice svelte-19axggu">⏳ Waiting for approval...</div>`);
        }
        $$renderer2.push(`<!--]--></div></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
        if (output) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="tool-result svelte-19axggu">`);
          if (output.error) {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`<span class="error svelte-19axggu">❌ ${escape_html(output.error)}</span>`);
          } else {
            $$renderer2.push("<!--[!-->");
            $$renderer2.push(`<span class="success svelte-19axggu">✅ File created (${escape_html(output.lines)} lines, ${escape_html(output.size)} bytes)</span>`);
          }
          $$renderer2.push(`<!--]--></div>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function ToolGetConsoleLogs($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { part } = $$props;
    const output = part.output;
    const hasError = part.state === "output-error";
    $$renderer2.push(`<div class="tool-get-console-logs svelte-1ah54hm"><div class="tool-header svelte-1ah54hm"><span class="tool-icon svelte-1ah54hm">📋</span> <span class="tool-name">Console Logs</span> `);
    if (output?.total) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<span class="tool-badge svelte-1ah54hm">${escape_html(output.total)} logs</span>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> `);
    if (hasError) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="tool-error svelte-1ah54hm"><span class="error-icon">❌</span> <span>${escape_html(part.errorText || "Failed to fetch console logs")}</span></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      if (output) {
        $$renderer2.push("<!--[-->");
        if (output.message) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="tool-info svelte-1ah54hm">${escape_html(output.message)}</div>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> `);
        if (output.logs && output.logs.length > 0) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="logs-container svelte-1ah54hm"><!--[-->`);
          const each_array = ensure_array_like(output.logs);
          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
            let log = each_array[$$index];
            $$renderer2.push(`<div class="log-line svelte-1ah54hm">${escape_html(log)}</div>`);
          }
          $$renderer2.push(`<!--]--></div>`);
        } else {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push(`<div class="tool-info svelte-1ah54hm">No logs found</div>`);
        }
        $$renderer2.push(`<!--]--> `);
        if (output.hint) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="tool-hint svelte-1ah54hm">💡 ${escape_html(output.hint)}</div>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]-->`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
function ToolCaptureScreenshot($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { part } = $$props;
    const output = part.output;
    const hasError = part.state === "output-error";
    $$renderer2.push(`<div class="tool-capture-screenshot svelte-dsitjy"><div class="tool-header svelte-dsitjy"><span class="tool-icon svelte-dsitjy">📸</span> <span class="tool-name">Screenshot Captured</span> `);
    if (output?.width && output?.height) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<span class="tool-badge svelte-dsitjy">${escape_html(output.width)}×${escape_html(output.height)}</span>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> `);
    if (hasError) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="tool-error svelte-dsitjy"><span class="error-icon">❌</span> <span>${escape_html(part.errorText || "Failed to capture screenshot")}</span></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      if (output?.image) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="screenshot-container svelte-dsitjy"><img${attr("src", output.image)} alt="Game screenshot" class="screenshot-image svelte-dsitjy"/></div> <div class="screenshot-info svelte-dsitjy"><span class="info-text svelte-dsitjy">Screenshot captured at ${escape_html(new Date(output.timestamp).toLocaleTimeString())}</span></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
function MessagePartTool($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { part, originalContentCache } = $$props;
    $$renderer2.push(`<div class="tool-call svelte-1015gfm">`);
    if (part.type === "tool-readFile") {
      $$renderer2.push("<!--[-->");
      ToolReadFile($$renderer2, { part });
    } else {
      $$renderer2.push("<!--[!-->");
      if (part.type === "tool-listFiles") {
        $$renderer2.push("<!--[-->");
        ToolListFiles($$renderer2, { part });
      } else {
        $$renderer2.push("<!--[!-->");
        if (part.type === "tool-editFile") {
          $$renderer2.push("<!--[-->");
          ToolEditFile($$renderer2, { part, originalContentCache });
        } else {
          $$renderer2.push("<!--[!-->");
          if (part.type === "tool-createFile") {
            $$renderer2.push("<!--[-->");
            ToolCreateFile($$renderer2, { part });
          } else {
            $$renderer2.push("<!--[!-->");
            if (part.type === "tool-getConsoleLogs") {
              $$renderer2.push("<!--[-->");
              ToolGetConsoleLogs($$renderer2, { part });
            } else {
              $$renderer2.push("<!--[!-->");
              if (part.type === "tool-captureScreenshot") {
                $$renderer2.push("<!--[-->");
                ToolCaptureScreenshot($$renderer2, { part });
              } else {
                $$renderer2.push("<!--[!-->");
              }
              $$renderer2.push(`<!--]-->`);
            }
            $$renderer2.push(`<!--]-->`);
          }
          $$renderer2.push(`<!--]-->`);
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
function ChatMessage($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { message, originalContentCache } = $$props;
    const isUser = message.role === "user";
    const isAssistant = message.role === "assistant";
    $$renderer2.push(`<div${attr_class("message svelte-19rwc5v", void 0, { "user": isUser, "assistant": isAssistant })}><!--[-->`);
    const each_array = ensure_array_like(message.parts);
    for (let partIndex = 0, $$length = each_array.length; partIndex < $$length; partIndex++) {
      let part = each_array[partIndex];
      if (part.type === "file" && part.mediaType?.startsWith("image/")) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="image-attachments svelte-19rwc5v"><img${attr("src", part.url)}${attr("alt", part.filename || "Attached image")} class="attached-image svelte-19rwc5v"/></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
        if (part.type === "text") {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="content svelte-19rwc5v">${escape_html(part.text)}</div>`);
        } else {
          $$renderer2.push("<!--[!-->");
          if (part.type.startsWith("tool-")) {
            $$renderer2.push("<!--[-->");
            MessagePartTool($$renderer2, { part, originalContentCache });
          } else {
            $$renderer2.push("<!--[!-->");
          }
          $$renderer2.push(`<!--]-->`);
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
function ChatMessageList($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      chat,
      isStreaming,
      originalContentCache,
      onFileCreateRequested
    } = $$props;
    function scrollToBottom() {
    }
    $$renderer2.push(`<div class="messages svelte-cp69sn">`);
    if (chat) {
      $$renderer2.push("<!--[-->");
      if (chat.messages.length === 0) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="welcome-placeholder svelte-cp69sn"><h3 class="welcome-title svelte-cp69sn">AI Coding Assistant</h3> <p class="welcome-subtitle svelte-cp69sn">I can help you build your Phaser game!</p> <div class="welcome-suggestions svelte-cp69sn"><p class="suggestions-title svelte-cp69sn">Try asking me:</p> <ul class="suggestions-list svelte-cp69sn"><li class="svelte-cp69sn">"Show me the current game code"</li> <li class="svelte-cp69sn">"List all the files in this project"</li> <li class="svelte-cp69sn">"How do I add a jumping animation?"</li> <li class="svelte-cp69sn">"Make the player move faster"</li></ul></div></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> <!--[-->`);
      const each_array = ensure_array_like(chat.messages);
      for (let messageIndex = 0, $$length = each_array.length; messageIndex < $$length; messageIndex++) {
        let message = each_array[messageIndex];
        ChatMessage($$renderer2, { message, originalContentCache });
      }
      $$renderer2.push(`<!--]--> `);
      if (isStreaming) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="message assistant svelte-cp69sn"><div class="typing-indicator svelte-cp69sn"><span class="svelte-cp69sn"></span> <span class="svelte-cp69sn"></span> <span class="svelte-cp69sn"></span></div></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]-->`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="flex h-full items-center justify-center text-sm text-muted-foreground svelte-cp69sn">Loading chat...</div>`);
    }
    $$renderer2.push(`<!--]--></div>`);
    bind_props($$props, { scrollToBottom });
  });
}
function ChatInputArea($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      input = void 0,
      isStreaming,
      planMode,
      hideToggles = false,
      projectId,
      attachedImages = void 0,
      onSubmit,
      onStop,
      onTogglePlanMode
    } = $$props;
    let uploadingImage = false;
    $$renderer2.push(`<div class="input-area svelte-15qp4e9">`);
    if (attachedImages.length > 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="image-previews svelte-15qp4e9"><!--[-->`);
      const each_array = ensure_array_like(attachedImages);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let image = each_array[$$index];
        $$renderer2.push(`<div class="image-preview svelte-15qp4e9"><img${attr("src", image.url)}${attr("alt", image.filename)} class="svelte-15qp4e9"/> <button type="button" class="remove-image-btn svelte-15qp4e9" title="Remove image">`);
        X($$renderer2, { class: "h-3 w-3" });
        $$renderer2.push(`<!----></button></div>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <form class="input-form svelte-15qp4e9"><textarea${attr("placeholder", isStreaming ? "AI is thinking... (type to queue next message)" : "Press Enter to send, Shift+Enter for new line, Paste or click 📎 to add images")} autocomplete="off" rows="1" class="svelte-15qp4e9">`);
    const $$body = escape_html(input);
    if ($$body) {
      $$renderer2.push(`${$$body}`);
    }
    $$renderer2.push(`</textarea></form> <input type="file" accept="image/png,image/jpeg,image/jpg,image/gif,image/webp" style="display: none;"/> <div class="controls-row svelte-15qp4e9"><div class="left-controls svelte-15qp4e9">`);
    if (!hideToggles) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="mode-toggles svelte-15qp4e9"><button${attr_class("mode-toggle-btn svelte-15qp4e9", void 0, { "active": planMode })}${attr("title", planMode ? "Plan Mode: Generate game specs and documentation" : "Act Mode: Generate and edit game code")} type="button">`);
      if (planMode) {
        $$renderer2.push("<!--[-->");
        Pause($$renderer2, { class: "h-4 w-4" });
        $$renderer2.push(`<!----> <span>Plan</span>`);
      } else {
        $$renderer2.push("<!--[!-->");
        Play($$renderer2, { class: "h-4 w-4" });
        $$renderer2.push(`<!----> <span>Act</span>`);
      }
      $$renderer2.push(`<!--]--></button></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <button type="button" class="image-upload-btn svelte-15qp4e9"${attr("disabled", uploadingImage, true)} title="Upload image (or paste)">`);
    Image($$renderer2, { class: "h-4 w-4" });
    $$renderer2.push(`<!----> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></button></div> `);
    if (isStreaming) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<button class="stop-btn svelte-15qp4e9" type="button">`);
      Circle_stop($$renderer2, { class: "h-4 w-4" });
      $$renderer2.push(`<!----> <span>Stop</span></button>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<button class="send-btn svelte-15qp4e9"${attr("disabled", !input.trim(), true)} type="button">Send</button>`);
    }
    $$renderer2.push(`<!--]--></div></div>`);
    bind_props($$props, { input, attachedImages });
  });
}
function AIChatPanel($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      projectId,
      onFileEditCompleted,
      onFileCreateRequested,
      hideToggles = false
    } = $$props;
    let input = "";
    let chat = null;
    let planMode = false;
    let attachedImages = [];
    let chatStatus = chat?.status ?? "ready";
    let isStreaming = chatStatus === "submitted" || chatStatus === "streaming";
    let conversations = [];
    let currentConversationId = null;
    let isLoadingConversations = true;
    let isSavingMessages = false;
    let showConversationDropdown = false;
    let originalContentCache = /* @__PURE__ */ new Map();
    let saveTimer = null;
    let lastAutoSentMessageId = null;
    function saveModeSettings() {
      if (typeof window === "undefined") return;
      try {
        localStorage.setItem(`martini_project_${projectId}_planMode`, String(planMode));
      } catch (error) {
        console.error("Failed to save mode settings:", error);
      }
    }
    function togglePlanMode() {
      planMode = !planMode;
      saveModeSettings();
    }
    async function createNewConversation(title) {
      try {
        if (conversations.length > 0) {
          const latestConversation = conversations[0];
          const messagesRes = await fetch(`/api/conversations/${latestConversation.id}/messages`);
          if (messagesRes.ok) {
            const messagesData = await messagesRes.json();
            const messages = messagesData.messages || [];
            if (messages.length === 0) {
              if (currentConversationId !== latestConversation.id) {
                currentConversationId = latestConversation.id;
                if (chat) chat.messages = [];
              }
              return;
            }
          }
        }
        const res = await fetch(`/api/projects/${projectId}/conversations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title || "New Conversation" })
        });
        if (!res.ok) throw new Error("Failed to create conversation");
        const data = await res.json();
        const newConversation = data.conversation;
        conversations = [newConversation, ...conversations];
        currentConversationId = newConversation.id;
        if (chat) chat.messages = [];
      } catch (error) {
        console.error("Failed to create conversation:", error);
      }
    }
    async function loadMessages(conversationId) {
      try {
        const res = await fetch(`/api/conversations/${conversationId}/messages`);
        if (!res.ok) throw new Error("Failed to load messages");
        const data = await res.json();
        if (chat) chat.messages = data.messages || [];
      } catch (error) {
        console.error("Failed to load messages:", error);
      }
    }
    function debouncedSaveMessages() {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(
        async () => {
          await saveMessages();
        },
        2e3
      );
    }
    async function saveMessages() {
      if (!chat || !currentConversationId) return;
      try {
        isSavingMessages = true;
        const res = await fetch(`/api/conversations/${currentConversationId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: chat.messages })
        });
        if (!res.ok) throw new Error("Failed to save messages");
        const currentConv = conversations.find((c) => c.id === currentConversationId);
        if (currentConv && currentConv.title === "New Conversation" && chat.messages.length > 0) {
          const firstUserMessage = chat.messages.find((m) => m.role === "user");
          if (firstUserMessage) {
            const text = firstUserMessage.parts.find((p) => p.type === "text")?.text || "";
            const autoTitle = text.slice(0, 50).trim() || "New Conversation";
            await updateConversationTitle(currentConversationId, autoTitle);
          }
        }
      } catch (error) {
        console.error("Failed to save messages:", error);
      } finally {
        isSavingMessages = false;
      }
    }
    async function updateConversationTitle(conversationId, title) {
      try {
        const res = await fetch(`/api/conversations/${conversationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title })
        });
        if (!res.ok) throw new Error("Failed to update title");
        conversations = conversations.map((c) => c.id === conversationId ? { ...c, title } : c);
      } catch (error) {
        console.error("Failed to update title:", error);
      }
    }
    async function switchConversation(conversationId) {
      if (conversationId === currentConversationId) return;
      await saveMessages();
      currentConversationId = conversationId;
      await loadMessages(conversationId);
      showConversationDropdown = false;
    }
    function shouldAutoSend({ messages }) {
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage || lastMessage.role !== "assistant") return false;
      if (lastMessage.id === lastAutoSentMessageId) return false;
      let hasCompletedTools = false;
      let hasPendingApprovals = false;
      for (const part of lastMessage.parts) {
        if (part.type.startsWith("tool-") && "state" in part) {
          const state = part.state;
          if (state === "output-available" || state === "output-error") {
            hasCompletedTools = true;
          }
          if (state === "approval-requested") {
            hasPendingApprovals = true;
          }
        }
      }
      const shouldSend = hasCompletedTools && !hasPendingApprovals;
      if (shouldSend) {
        lastAutoSentMessageId = lastMessage.id;
      }
      return shouldSend;
    }
    chat = new Chat({ sendAutomaticallyWhen: shouldAutoSend });
    function sendMessage(message) {
      if (!chat) return;
      input = message;
      chat.sendMessage({ text: message, metadata: { projectId } });
      input = "";
      debouncedSaveMessages();
      setTimeout(
        () => {
        },
        100
      );
    }
    function buildMessageWithAttachments() {
      const files = attachedImages.map((img) => ({
        type: "file",
        mediaType: img.mediaType,
        // Use actual media type from upload
        url: img.url,
        // Public URL from Supabase - MUST be 'url' not 'data'
        filename: img.filename
      }));
      return {
        text: input.trim() || void 0,
        files: files.length > 0 ? files : void 0,
        metadata: { projectId, planMode }
      };
    }
    onDestroy(() => {
    });
    function handleSubmit(e) {
      e.preventDefault();
      if (!chat || !input.trim() && attachedImages.length === 0 || isStreaming) return;
      const message = buildMessageWithAttachments();
      chat.sendMessage(message);
      input = "";
      attachedImages = [];
      setTimeout(
        () => {
        },
        100
      );
    }
    async function handleStop() {
      if (!chat) return;
      await chat.stop();
    }
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<div class="ai-chat-panel svelte-1oi7e3x">`);
      ChatHeader($$renderer3, {
        conversations,
        currentConversationId,
        isLoadingConversations,
        isStreaming,
        isSavingMessages,
        onConversationSwitch: switchConversation,
        onNewConversation: () => createNewConversation(),
        get showConversationDropdown() {
          return showConversationDropdown;
        },
        set showConversationDropdown($$value) {
          showConversationDropdown = $$value;
          $$settled = false;
        }
      });
      $$renderer3.push(`<!----> <div class="chat-content svelte-1oi7e3x">`);
      ChatMessageList($$renderer3, {
        chat,
        isStreaming,
        originalContentCache,
        onFileCreateRequested
      });
      $$renderer3.push(`<!----> `);
      if (chat) {
        $$renderer3.push("<!--[-->");
        ChatInputArea($$renderer3, {
          projectId,
          isStreaming,
          planMode,
          hideToggles,
          onSubmit: handleSubmit,
          onStop: handleStop,
          onTogglePlanMode: togglePlanMode,
          get input() {
            return input;
          },
          set input($$value) {
            input = $$value;
            $$settled = false;
          },
          get attachedImages() {
            return attachedImages;
          },
          set attachedImages($$value) {
            attachedImages = $$value;
            $$settled = false;
          }
        });
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--></div></div>`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    bind_props($$props, { sendMessage });
  });
}
function isFunction(value) {
  return typeof value === "function";
}
function isObject(value) {
  return value !== null && typeof value === "object";
}
const CLASS_VALUE_PRIMITIVE_TYPES = ["string", "number", "bigint", "boolean"];
function isClassValue(value) {
  if (value === null || value === void 0)
    return true;
  if (CLASS_VALUE_PRIMITIVE_TYPES.includes(typeof value))
    return true;
  if (Array.isArray(value))
    return value.every((item) => isClassValue(item));
  if (typeof value === "object") {
    if (Object.getPrototypeOf(value) !== Object.prototype)
      return false;
    return true;
  }
  return false;
}
const BoxSymbol = Symbol("box");
const isWritableSymbol = Symbol("is-writable");
function isBox(value) {
  return isObject(value) && BoxSymbol in value;
}
function isWritableBox(value) {
  return box.isBox(value) && isWritableSymbol in value;
}
function box(initialValue) {
  let current = initialValue;
  return {
    [BoxSymbol]: true,
    [isWritableSymbol]: true,
    get current() {
      return current;
    },
    set current(v) {
      current = v;
    }
  };
}
function boxWith(getter, setter) {
  const derived2 = getter();
  if (setter) {
    return {
      [BoxSymbol]: true,
      [isWritableSymbol]: true,
      get current() {
        return derived2;
      },
      set current(v) {
        setter(v);
      }
    };
  }
  return {
    [BoxSymbol]: true,
    get current() {
      return getter();
    }
  };
}
function boxFrom(value) {
  if (box.isBox(value)) return value;
  if (isFunction(value)) return box.with(value);
  return box(value);
}
function boxFlatten(boxes) {
  return Object.entries(boxes).reduce(
    (acc, [key, b]) => {
      if (!box.isBox(b)) {
        return Object.assign(acc, { [key]: b });
      }
      if (box.isWritableBox(b)) {
        Object.defineProperty(acc, key, {
          get() {
            return b.current;
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          set(v) {
            b.current = v;
          }
        });
      } else {
        Object.defineProperty(acc, key, {
          get() {
            return b.current;
          }
        });
      }
      return acc;
    },
    {}
  );
}
function toReadonlyBox(b) {
  if (!box.isWritableBox(b)) return b;
  return {
    [BoxSymbol]: true,
    get current() {
      return b.current;
    }
  };
}
box.from = boxFrom;
box.with = boxWith;
box.flatten = boxFlatten;
box.readonly = toReadonlyBox;
box.isBox = isBox;
box.isWritableBox = isWritableBox;
function composeHandlers(...handlers) {
  return function(e) {
    for (const handler of handlers) {
      if (!handler)
        continue;
      if (e.defaultPrevented)
        return;
      if (typeof handler === "function") {
        handler.call(this, e);
      } else {
        handler.current?.call(this, e);
      }
    }
  };
}
const NUMBER_CHAR_RE = /\d/;
const STR_SPLITTERS = ["-", "_", "/", "."];
function isUppercase(char = "") {
  if (NUMBER_CHAR_RE.test(char))
    return void 0;
  return char !== char.toLowerCase();
}
function splitByCase(str) {
  const parts = [];
  let buff = "";
  let previousUpper;
  let previousSplitter;
  for (const char of str) {
    const isSplitter = STR_SPLITTERS.includes(char);
    if (isSplitter === true) {
      parts.push(buff);
      buff = "";
      previousUpper = void 0;
      continue;
    }
    const isUpper = isUppercase(char);
    if (previousSplitter === false) {
      if (previousUpper === false && isUpper === true) {
        parts.push(buff);
        buff = char;
        previousUpper = isUpper;
        continue;
      }
      if (previousUpper === true && isUpper === false && buff.length > 1) {
        const lastChar = buff.at(-1);
        parts.push(buff.slice(0, Math.max(0, buff.length - 1)));
        buff = lastChar + char;
        previousUpper = isUpper;
        continue;
      }
    }
    buff += char;
    previousUpper = isUpper;
    previousSplitter = isSplitter;
  }
  parts.push(buff);
  return parts;
}
function pascalCase(str) {
  if (!str)
    return "";
  return splitByCase(str).map((p) => upperFirst(p)).join("");
}
function camelCase(str) {
  return lowerFirst(pascalCase(str || ""));
}
function upperFirst(str) {
  return str ? str[0].toUpperCase() + str.slice(1) : "";
}
function lowerFirst(str) {
  return str ? str[0].toLowerCase() + str.slice(1) : "";
}
function cssToStyleObj(css) {
  if (!css)
    return {};
  const styleObj = {};
  function iterator(name, value) {
    if (name.startsWith("-moz-") || name.startsWith("-webkit-") || name.startsWith("-ms-") || name.startsWith("-o-")) {
      styleObj[pascalCase(name)] = value;
      return;
    }
    if (name.startsWith("--")) {
      styleObj[name] = value;
      return;
    }
    styleObj[camelCase(name)] = value;
  }
  StyleToObject(css, iterator);
  return styleObj;
}
function executeCallbacks(...callbacks) {
  return (...args) => {
    for (const callback of callbacks) {
      if (typeof callback === "function") {
        callback(...args);
      }
    }
  };
}
function addEventListener(target, event, handler, options) {
  const events = Array.isArray(event) ? event : [event];
  events.forEach((_event) => target.addEventListener(_event, handler, options));
  return () => {
    events.forEach((_event) => target.removeEventListener(_event, handler, options));
  };
}
function createParser(matcher, replacer) {
  const regex = RegExp(matcher, "g");
  return (str) => {
    if (typeof str !== "string") {
      throw new TypeError(`expected an argument of type string, but got ${typeof str}`);
    }
    if (!str.match(regex))
      return str;
    return str.replace(regex, replacer);
  };
}
const camelToKebab = createParser(/[A-Z]/, (match) => `-${match.toLowerCase()}`);
function styleToCSS(styleObj) {
  if (!styleObj || typeof styleObj !== "object" || Array.isArray(styleObj)) {
    throw new TypeError(`expected an argument of type object, but got ${typeof styleObj}`);
  }
  return Object.keys(styleObj).map((property) => `${camelToKebab(property)}: ${styleObj[property]};`).join("\n");
}
function styleToString(style = {}) {
  return styleToCSS(style).replace("\n", " ");
}
const srOnlyStyles = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: "0",
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  borderWidth: "0",
  transform: "translateX(-100%)"
};
styleToString(srOnlyStyles);
const EVENT_LIST = [
  "onabort",
  "onanimationcancel",
  "onanimationend",
  "onanimationiteration",
  "onanimationstart",
  "onauxclick",
  "onbeforeinput",
  "onbeforetoggle",
  "onblur",
  "oncancel",
  "oncanplay",
  "oncanplaythrough",
  "onchange",
  "onclick",
  "onclose",
  "oncompositionend",
  "oncompositionstart",
  "oncompositionupdate",
  "oncontextlost",
  "oncontextmenu",
  "oncontextrestored",
  "oncopy",
  "oncuechange",
  "oncut",
  "ondblclick",
  "ondrag",
  "ondragend",
  "ondragenter",
  "ondragleave",
  "ondragover",
  "ondragstart",
  "ondrop",
  "ondurationchange",
  "onemptied",
  "onended",
  "onerror",
  "onfocus",
  "onfocusin",
  "onfocusout",
  "onformdata",
  "ongotpointercapture",
  "oninput",
  "oninvalid",
  "onkeydown",
  "onkeypress",
  "onkeyup",
  "onload",
  "onloadeddata",
  "onloadedmetadata",
  "onloadstart",
  "onlostpointercapture",
  "onmousedown",
  "onmouseenter",
  "onmouseleave",
  "onmousemove",
  "onmouseout",
  "onmouseover",
  "onmouseup",
  "onpaste",
  "onpause",
  "onplay",
  "onplaying",
  "onpointercancel",
  "onpointerdown",
  "onpointerenter",
  "onpointerleave",
  "onpointermove",
  "onpointerout",
  "onpointerover",
  "onpointerup",
  "onprogress",
  "onratechange",
  "onreset",
  "onresize",
  "onscroll",
  "onscrollend",
  "onsecuritypolicyviolation",
  "onseeked",
  "onseeking",
  "onselect",
  "onselectionchange",
  "onselectstart",
  "onslotchange",
  "onstalled",
  "onsubmit",
  "onsuspend",
  "ontimeupdate",
  "ontoggle",
  "ontouchcancel",
  "ontouchend",
  "ontouchmove",
  "ontouchstart",
  "ontransitioncancel",
  "ontransitionend",
  "ontransitionrun",
  "ontransitionstart",
  "onvolumechange",
  "onwaiting",
  "onwebkitanimationend",
  "onwebkitanimationiteration",
  "onwebkitanimationstart",
  "onwebkittransitionend",
  "onwheel"
];
const EVENT_LIST_SET = new Set(EVENT_LIST);
function isEventHandler(key) {
  return EVENT_LIST_SET.has(key);
}
function mergeProps(...args) {
  const result = { ...args[0] };
  for (let i = 1; i < args.length; i++) {
    const props = args[i];
    if (!props)
      continue;
    for (const key of Object.keys(props)) {
      const a = result[key];
      const b = props[key];
      const aIsFunction = typeof a === "function";
      const bIsFunction = typeof b === "function";
      if (aIsFunction && typeof bIsFunction && isEventHandler(key)) {
        const aHandler = a;
        const bHandler = b;
        result[key] = composeHandlers(aHandler, bHandler);
      } else if (aIsFunction && bIsFunction) {
        result[key] = executeCallbacks(a, b);
      } else if (key === "class") {
        const aIsClassValue = isClassValue(a);
        const bIsClassValue = isClassValue(b);
        if (aIsClassValue && bIsClassValue) {
          result[key] = clsx(a, b);
        } else if (aIsClassValue) {
          result[key] = clsx(a);
        } else if (bIsClassValue) {
          result[key] = clsx(b);
        }
      } else if (key === "style") {
        const aIsObject = typeof a === "object";
        const bIsObject = typeof b === "object";
        const aIsString = typeof a === "string";
        const bIsString = typeof b === "string";
        if (aIsObject && bIsObject) {
          result[key] = { ...a, ...b };
        } else if (aIsObject && bIsString) {
          const parsedStyle = cssToStyleObj(b);
          result[key] = { ...a, ...parsedStyle };
        } else if (aIsString && bIsObject) {
          const parsedStyle = cssToStyleObj(a);
          result[key] = { ...parsedStyle, ...b };
        } else if (aIsString && bIsString) {
          const parsedStyleA = cssToStyleObj(a);
          const parsedStyleB = cssToStyleObj(b);
          result[key] = { ...parsedStyleA, ...parsedStyleB };
        } else if (aIsObject) {
          result[key] = a;
        } else if (bIsObject) {
          result[key] = b;
        } else if (aIsString) {
          result[key] = a;
        } else if (bIsString) {
          result[key] = b;
        }
      } else {
        result[key] = b !== void 0 ? b : a;
      }
    }
    for (const key of Object.getOwnPropertySymbols(props)) {
      const a = result[key];
      const b = props[key];
      result[key] = b !== void 0 ? b : a;
    }
  }
  if (typeof result.style === "object") {
    result.style = styleToString(result.style).replaceAll("\n", " ");
  }
  if (result.hidden !== true) {
    result.hidden = void 0;
    delete result.hidden;
  }
  if (result.disabled !== true) {
    result.disabled = void 0;
    delete result.disabled;
  }
  return result;
}
const defaultWindow$1 = void 0;
function getActiveElement$2(document2) {
  let activeElement = document2.activeElement;
  while (activeElement?.shadowRoot) {
    const node = activeElement.shadowRoot.activeElement;
    if (node === activeElement)
      break;
    else
      activeElement = node;
  }
  return activeElement;
}
let ActiveElement$1 = class ActiveElement2 {
  #document;
  #subscribe;
  constructor(options = {}) {
    const { window: window2 = defaultWindow$1, document: document2 = window2?.document } = options;
    if (window2 === void 0) return;
    this.#document = document2;
    this.#subscribe = createSubscriber();
  }
  get current() {
    this.#subscribe?.();
    if (!this.#document) return null;
    return getActiveElement$2(this.#document);
  }
};
new ActiveElement$1();
function afterTick(fn) {
  tick().then(fn);
}
const DOCUMENT_NODE = 9;
function isDocument(node) {
  return isObject(node) && node.nodeType === DOCUMENT_NODE;
}
function isWindow(node) {
  return isObject(node) && node.constructor?.name === "VisualViewport";
}
function getDocument(node) {
  if (isDocument(node))
    return node;
  if (isWindow(node))
    return node.document;
  return node?.ownerDocument ?? document;
}
function getActiveElement$1(rootNode) {
  let activeElement = rootNode.activeElement;
  while (activeElement?.shadowRoot) {
    const el = activeElement.shadowRoot.activeElement;
    if (el === activeElement)
      break;
    else
      activeElement = el;
  }
  return activeElement;
}
class DOMContext {
  element;
  #root = derived(() => {
    if (!this.element.current) return document;
    const rootNode = this.element.current.getRootNode() ?? document;
    return rootNode;
  });
  get root() {
    return this.#root();
  }
  set root($$value) {
    return this.#root($$value);
  }
  constructor(element2) {
    if (typeof element2 === "function") {
      this.element = box.with(element2);
    } else {
      this.element = element2;
    }
  }
  getDocument = () => {
    return getDocument(this.root);
  };
  getWindow = () => {
    return this.getDocument().defaultView ?? window;
  };
  getActiveElement = () => {
    return getActiveElement$1(this.root);
  };
  isActiveElement = (node) => {
    return node === this.getActiveElement();
  };
  getElementById(id) {
    return this.root.getElementById(id);
  }
  querySelector = (selector) => {
    if (!this.root) return null;
    return this.root.querySelector(selector);
  };
  querySelectorAll = (selector) => {
    if (!this.root) return [];
    return this.root.querySelectorAll(selector);
  };
  setTimeout = (callback, delay) => {
    return this.getWindow().setTimeout(callback, delay);
  };
  clearTimeout = (timeoutId) => {
    return this.getWindow().clearTimeout(timeoutId);
  };
}
function attachRef(ref, onChange) {
  return {
    [createAttachmentKey()]: (node) => {
      if (box.isBox(ref)) {
        ref.current = node;
        run(() => onChange?.(node));
        return () => {
          if ("isConnected" in node && node.isConnected)
            return;
          ref.current = null;
        };
      }
      ref(node);
      run(() => onChange?.(node));
      return () => {
        if ("isConnected" in node && node.isConnected)
          return;
        ref(null);
      };
    }
  };
}
function calculateAriaValues({ layout, panesArray, pivotIndices }) {
  let currentMinSize = 0;
  let currentMaxSize = 100;
  let totalMinSize = 0;
  let totalMaxSize = 0;
  const firstIndex = pivotIndices[0];
  for (let i = 0; i < panesArray.length; i++) {
    const constraints = panesArray[i].constraints;
    const { maxSize = 100, minSize = 0 } = constraints;
    if (i === firstIndex) {
      currentMinSize = minSize;
      currentMaxSize = maxSize;
    } else {
      totalMinSize += minSize;
      totalMaxSize += maxSize;
    }
  }
  const valueMax = Math.min(currentMaxSize, 100 - totalMinSize);
  const valueMin = Math.max(currentMinSize, 100 - totalMaxSize);
  const valueNow = layout[firstIndex];
  return {
    valueMax,
    valueMin,
    valueNow
  };
}
function assert(expectedCondition, message = "Assertion failed!") {
  if (!expectedCondition) {
    console.error(message);
    throw new Error(message);
  }
}
const LOCAL_STORAGE_DEBOUNCE_INTERVAL = 100;
const PRECISION = 10;
function areNumbersAlmostEqual(actual, expected, fractionDigits = PRECISION) {
  return compareNumbersWithTolerance(actual, expected, fractionDigits) === 0;
}
function compareNumbersWithTolerance(actual, expected, fractionDigits = PRECISION) {
  const roundedActual = roundTo(actual, fractionDigits);
  const roundedExpected = roundTo(expected, fractionDigits);
  return Math.sign(roundedActual - roundedExpected);
}
function areArraysEqual(arrA, arrB) {
  if (arrA.length !== arrB.length)
    return false;
  for (let index2 = 0; index2 < arrA.length; index2++) {
    if (arrA[index2] !== arrB[index2])
      return false;
  }
  return true;
}
function roundTo(value, decimals) {
  return Number.parseFloat(value.toFixed(decimals));
}
const isBrowser = typeof document !== "undefined";
function isHTMLElement(element2) {
  return element2 instanceof HTMLElement;
}
function isKeyDown(event) {
  return event.type === "keydown";
}
function isMouseEvent(event) {
  return event.type.startsWith("mouse");
}
function isTouchEvent(event) {
  return event.type.startsWith("touch");
}
function resizePane({ paneConstraints: paneConstraintsArray, paneIndex, initialSize }) {
  const paneConstraints = paneConstraintsArray[paneIndex];
  assert(paneConstraints != null, "Pane constraints should not be null.");
  const { collapsedSize = 0, collapsible, maxSize = 100, minSize = 0 } = paneConstraints;
  let newSize = initialSize;
  if (compareNumbersWithTolerance(newSize, minSize) < 0) {
    newSize = getAdjustedSizeForCollapsible(newSize, collapsible, collapsedSize, minSize);
  }
  newSize = Math.min(maxSize, newSize);
  return Number.parseFloat(newSize.toFixed(PRECISION));
}
function getAdjustedSizeForCollapsible(size, collapsible, collapsedSize, minSize) {
  if (!collapsible)
    return minSize;
  const halfwayPoint = (collapsedSize + minSize) / 2;
  return compareNumbersWithTolerance(size, halfwayPoint) < 0 ? collapsedSize : minSize;
}
function noop() {
}
function updateResizeHandleAriaValues({ groupId, layout, panesArray, domContext }) {
  const resizeHandleElements = getResizeHandleElementsForGroup(groupId, domContext);
  for (let index2 = 0; index2 < panesArray.length - 1; index2++) {
    const { valueMax, valueMin, valueNow } = calculateAriaValues({
      layout,
      panesArray,
      pivotIndices: [index2, index2 + 1]
    });
    const resizeHandleEl = resizeHandleElements[index2];
    if (isHTMLElement(resizeHandleEl)) {
      const paneData = panesArray[index2];
      resizeHandleEl.setAttribute("aria-controls", paneData.opts.id.current);
      resizeHandleEl.setAttribute("aria-valuemax", `${Math.round(valueMax)}`);
      resizeHandleEl.setAttribute("aria-valuemin", `${Math.round(valueMin)}`);
      resizeHandleEl.setAttribute("aria-valuenow", valueNow != null ? `${Math.round(valueNow)}` : "");
    }
  }
  return () => {
    for (const el of resizeHandleElements) {
      el.removeAttribute("aria-controls");
      el.removeAttribute("aria-valuemax");
      el.removeAttribute("aria-valuemin");
      el.removeAttribute("aria-valuenow");
    }
  };
}
function getResizeHandleElementsForGroup(groupId, domContext) {
  if (!isBrowser)
    return [];
  return Array.from(domContext.querySelectorAll(`[data-pane-resizer-id][data-pane-group-id="${groupId}"]`));
}
function getResizeHandleElementIndex({ groupId, id, domContext }) {
  if (!isBrowser)
    return null;
  const handles = getResizeHandleElementsForGroup(groupId, domContext);
  const index2 = handles.findIndex((handle) => handle.getAttribute("data-pane-resizer-id") === id);
  return index2 ?? null;
}
function getPivotIndices({ groupId, dragHandleId, domContext }) {
  const index2 = getResizeHandleElementIndex({
    groupId,
    id: dragHandleId,
    domContext
  });
  return index2 != null ? [index2, index2 + 1] : [-1, -1];
}
function paneDataHelper(panesArray, pane, layout) {
  const paneConstraintsArray = panesArray.map((paneData) => paneData.constraints);
  const paneIndex = findPaneDataIndex(panesArray, pane);
  const paneConstraints = paneConstraintsArray[paneIndex];
  const isLastPane = paneIndex === panesArray.length - 1;
  const pivotIndices = isLastPane ? [paneIndex - 1, paneIndex] : [paneIndex, paneIndex + 1];
  const paneSize = layout[paneIndex];
  return {
    ...paneConstraints,
    paneSize,
    pivotIndices
  };
}
function findPaneDataIndex(panesArray, pane) {
  return panesArray.findIndex((prevPaneData) => prevPaneData.opts.id.current === pane.opts.id.current);
}
function callPaneCallbacks(panesArray, layout, paneIdToLastNotifiedSizeMap) {
  for (let index2 = 0; index2 < layout.length; index2++) {
    const size = layout[index2];
    const paneData = panesArray[index2];
    assert(paneData);
    const { collapsedSize = 0, collapsible } = paneData.constraints;
    const lastNotifiedSize = paneIdToLastNotifiedSizeMap[paneData.opts.id.current];
    if (!(lastNotifiedSize == null || size !== lastNotifiedSize))
      continue;
    paneIdToLastNotifiedSizeMap[paneData.opts.id.current] = size;
    const { onCollapse, onExpand, onResize } = paneData.callbacks;
    onResize?.(size, lastNotifiedSize);
    if (collapsible && (onCollapse || onExpand)) {
      if (onExpand && (lastNotifiedSize == null || lastNotifiedSize === collapsedSize) && size !== collapsedSize) {
        onExpand();
      }
      if (onCollapse && (lastNotifiedSize == null || lastNotifiedSize !== collapsedSize) && size === collapsedSize) {
        onCollapse();
      }
    }
  }
}
function getUnsafeDefaultLayout({ panesArray }) {
  const layout = Array(panesArray.length);
  const paneConstraintsArray = panesArray.map((paneData) => paneData.constraints);
  let numPanesWithSizes = 0;
  let remainingSize = 100;
  for (let index2 = 0; index2 < panesArray.length; index2++) {
    const paneConstraints = paneConstraintsArray[index2];
    assert(paneConstraints);
    const { defaultSize } = paneConstraints;
    if (defaultSize != null) {
      numPanesWithSizes++;
      layout[index2] = defaultSize;
      remainingSize -= defaultSize;
    }
  }
  for (let index2 = 0; index2 < panesArray.length; index2++) {
    const paneConstraints = paneConstraintsArray[index2];
    assert(paneConstraints);
    const { defaultSize } = paneConstraints;
    if (defaultSize != null) {
      continue;
    }
    const numRemainingPanes = panesArray.length - numPanesWithSizes;
    const size = remainingSize / numRemainingPanes;
    numPanesWithSizes++;
    layout[index2] = size;
    remainingSize -= size;
  }
  return layout;
}
function validatePaneGroupLayout({ layout: prevLayout, paneConstraints }) {
  const nextLayout = [...prevLayout];
  const nextLayoutTotalSize = nextLayout.reduce((accumulated, current) => accumulated + current, 0);
  if (nextLayout.length !== paneConstraints.length) {
    throw new Error(`Invalid ${paneConstraints.length} pane layout: ${nextLayout.map((size) => `${size}%`).join(", ")}`);
  } else if (!areNumbersAlmostEqual(nextLayoutTotalSize, 100)) {
    for (let index2 = 0; index2 < paneConstraints.length; index2++) {
      const unsafeSize = nextLayout[index2];
      assert(unsafeSize != null);
      const safeSize = 100 / nextLayoutTotalSize * unsafeSize;
      nextLayout[index2] = safeSize;
    }
  }
  let remainingSize = 0;
  for (let index2 = 0; index2 < paneConstraints.length; index2++) {
    const unsafeSize = nextLayout[index2];
    assert(unsafeSize != null);
    const safeSize = resizePane({
      paneConstraints,
      paneIndex: index2,
      initialSize: unsafeSize
    });
    if (unsafeSize !== safeSize) {
      remainingSize += unsafeSize - safeSize;
      nextLayout[index2] = safeSize;
    }
  }
  if (!areNumbersAlmostEqual(remainingSize, 0)) {
    for (let index2 = 0; index2 < paneConstraints.length; index2++) {
      const prevSize = nextLayout[index2];
      assert(prevSize != null);
      const unsafeSize = prevSize + remainingSize;
      const safeSize = resizePane({
        paneConstraints,
        paneIndex: index2,
        initialSize: unsafeSize
      });
      if (prevSize !== safeSize) {
        remainingSize -= safeSize - prevSize;
        nextLayout[index2] = safeSize;
        if (areNumbersAlmostEqual(remainingSize, 0)) {
          break;
        }
      }
    }
  }
  return nextLayout;
}
function getPaneGroupElement(id, domContext) {
  if (!isBrowser)
    return null;
  const element2 = domContext.querySelector(`[data-pane-group][data-pane-group-id="${id}"]`);
  if (element2)
    return element2;
  return null;
}
function getResizeHandleElement(id, domContext) {
  if (!isBrowser)
    return null;
  const element2 = domContext.querySelector(`[data-pane-resizer-id="${id}"]`);
  if (element2)
    return element2;
  return null;
}
function getDragOffsetPercentage({ event, dragHandleId, dir, initialDragState, domContext }) {
  const isHorizontal = dir === "horizontal";
  const handleElement = getResizeHandleElement(dragHandleId, domContext);
  assert(handleElement);
  const groupId = handleElement.getAttribute("data-pane-group-id");
  assert(groupId);
  const { initialCursorPosition } = initialDragState;
  const cursorPosition = getResizeEventCursorPosition(dir, event);
  const groupElement = getPaneGroupElement(groupId, domContext);
  assert(groupElement);
  const groupRect = groupElement.getBoundingClientRect();
  const groupSizeInPixels = isHorizontal ? groupRect.width : groupRect.height;
  const offsetPixels = cursorPosition - initialCursorPosition;
  const offsetPercentage = offsetPixels / groupSizeInPixels * 100;
  return offsetPercentage;
}
function getDeltaPercentage({ event, dragHandleId, dir, initialDragState, keyboardResizeBy, domContext }) {
  if (isKeyDown(event)) {
    const isHorizontal = dir === "horizontal";
    let delta = 0;
    if (event.shiftKey) {
      delta = 100;
    } else if (keyboardResizeBy != null) {
      delta = keyboardResizeBy;
    } else {
      delta = 10;
    }
    let movement = 0;
    switch (event.key) {
      case "ArrowDown":
        movement = isHorizontal ? 0 : delta;
        break;
      case "ArrowLeft":
        movement = isHorizontal ? -delta : 0;
        break;
      case "ArrowRight":
        movement = isHorizontal ? delta : 0;
        break;
      case "ArrowUp":
        movement = isHorizontal ? 0 : -delta;
        break;
      case "End":
        movement = 100;
        break;
      case "Home":
        movement = -100;
        break;
    }
    return movement;
  } else {
    if (initialDragState == null)
      return 0;
    return getDragOffsetPercentage({
      event,
      dragHandleId,
      dir,
      initialDragState,
      domContext
    });
  }
}
function getResizeEventCursorPosition(dir, e) {
  const isHorizontal = dir === "horizontal";
  if (isMouseEvent(e)) {
    return isHorizontal ? e.clientX : e.clientY;
  } else if (isTouchEvent(e)) {
    const firstTouch = e.touches[0];
    assert(firstTouch);
    return isHorizontal ? firstTouch.screenX : firstTouch.screenY;
  } else {
    throw new Error(`Unsupported event type "${e.type}"`);
  }
}
function getResizeHandlePaneIds({ groupId, handleId, panesArray, domContext }) {
  const handle = getResizeHandleElement(handleId, domContext);
  const handles = getResizeHandleElementsForGroup(groupId, domContext);
  const index2 = handle ? handles.indexOf(handle) : -1;
  const idBefore = panesArray[index2]?.opts.id.current ?? null;
  const idAfter = panesArray[index2 + 1]?.opts.id.current ?? null;
  return [idBefore, idAfter];
}
const defaultWindow = void 0;
function getActiveElement(document2) {
  let activeElement = document2.activeElement;
  while (activeElement?.shadowRoot) {
    const node = activeElement.shadowRoot.activeElement;
    if (node === activeElement)
      break;
    else
      activeElement = node;
  }
  return activeElement;
}
class ActiveElement3 {
  #document;
  #subscribe;
  constructor(options = {}) {
    const { window: window2 = defaultWindow, document: document2 = window2?.document } = options;
    if (window2 === void 0) return;
    this.#document = document2;
    this.#subscribe = createSubscriber();
  }
  get current() {
    this.#subscribe?.();
    if (!this.#document) return null;
    return getActiveElement(this.#document);
  }
}
new ActiveElement3();
function runWatcher(sources, flush, effect, options = {}) {
  const { lazy = false } = options;
}
function watch(sources, effect, options) {
  runWatcher(sources, "post", effect, options);
}
function watchPre(sources, effect, options) {
  runWatcher(sources, "pre", effect, options);
}
watch.pre = watchPre;
class Context2 {
  #name;
  #key;
  /**
   * @param name The name of the context.
   * This is used for generating the context key and error messages.
   */
  constructor(name) {
    this.#name = name;
    this.#key = Symbol(name);
  }
  /**
   * The key used to get and set the context.
   *
   * It is not recommended to use this value directly.
   * Instead, use the methods provided by this class.
   */
  get key() {
    return this.#key;
  }
  /**
   * Checks whether this has been set in the context of a parent component.
   *
   * Must be called during component initialisation.
   */
  exists() {
    return hasContext(this.#key);
  }
  /**
   * Retrieves the context that belongs to the closest parent component.
   *
   * Must be called during component initialisation.
   *
   * @throws An error if the context does not exist.
   */
  get() {
    const context = getContext(this.#key);
    if (context === void 0) {
      throw new Error(`Context "${this.#name}" not found`);
    }
    return context;
  }
  /**
   * Retrieves the context that belongs to the closest parent component,
   * or the given fallback value if the context does not exist.
   *
   * Must be called during component initialisation.
   */
  getOr(fallback) {
    const context = getContext(this.#key);
    if (context === void 0) {
      return fallback;
    }
    return context;
  }
  /**
   * Associates the given value with the current component and returns it.
   *
   * Must be called during component initialisation.
   */
  set(context) {
    return setContext(this.#key, context);
  }
}
function adjustLayoutByDelta({ delta, layout: prevLayout, paneConstraints: paneConstraintsArray, pivotIndices, trigger }) {
  if (areNumbersAlmostEqual(delta, 0))
    return prevLayout;
  const nextLayout = [...prevLayout];
  const [firstPivotIndex, secondPivotIndex] = pivotIndices;
  let deltaApplied = 0;
  {
    if (trigger === "keyboard") {
      {
        const index2 = delta < 0 ? secondPivotIndex : firstPivotIndex;
        const paneConstraints = paneConstraintsArray[index2];
        assert(paneConstraints);
        if (paneConstraints.collapsible) {
          const prevSize = prevLayout[index2];
          assert(prevSize != null);
          const paneConstraints2 = paneConstraintsArray[index2];
          assert(paneConstraints2);
          const { collapsedSize = 0, minSize = 0 } = paneConstraints2;
          if (areNumbersAlmostEqual(prevSize, collapsedSize)) {
            const localDelta = minSize - prevSize;
            if (compareNumbersWithTolerance(localDelta, Math.abs(delta)) > 0) {
              delta = delta < 0 ? 0 - localDelta : localDelta;
            }
          }
        }
      }
      {
        const index2 = delta < 0 ? firstPivotIndex : secondPivotIndex;
        const paneConstraints = paneConstraintsArray[index2];
        assert(paneConstraints);
        const { collapsible } = paneConstraints;
        if (collapsible) {
          const prevSize = prevLayout[index2];
          assert(prevSize != null);
          const paneConstraints2 = paneConstraintsArray[index2];
          assert(paneConstraints2);
          const { collapsedSize = 0, minSize = 0 } = paneConstraints2;
          if (areNumbersAlmostEqual(prevSize, minSize)) {
            const localDelta = prevSize - collapsedSize;
            if (compareNumbersWithTolerance(localDelta, Math.abs(delta)) > 0) {
              delta = delta < 0 ? 0 - localDelta : localDelta;
            }
          }
        }
      }
    }
  }
  {
    const increment = delta < 0 ? 1 : -1;
    let index2 = delta < 0 ? secondPivotIndex : firstPivotIndex;
    let maxAvailableDelta = 0;
    while (true) {
      const prevSize = prevLayout[index2];
      assert(prevSize != null);
      const maxSafeSize = resizePane({
        paneConstraints: paneConstraintsArray,
        paneIndex: index2,
        initialSize: 100
      });
      const delta2 = maxSafeSize - prevSize;
      maxAvailableDelta += delta2;
      index2 += increment;
      if (index2 < 0 || index2 >= paneConstraintsArray.length) {
        break;
      }
    }
    const minAbsDelta = Math.min(Math.abs(delta), Math.abs(maxAvailableDelta));
    delta = delta < 0 ? 0 - minAbsDelta : minAbsDelta;
  }
  {
    const pivotIndex = delta < 0 ? firstPivotIndex : secondPivotIndex;
    let index2 = pivotIndex;
    while (index2 >= 0 && index2 < paneConstraintsArray.length) {
      const deltaRemaining = Math.abs(delta) - Math.abs(deltaApplied);
      const prevSize = prevLayout[index2];
      assert(prevSize != null);
      const unsafeSize = prevSize - deltaRemaining;
      const safeSize = resizePane({
        paneConstraints: paneConstraintsArray,
        paneIndex: index2,
        initialSize: unsafeSize
      });
      if (!areNumbersAlmostEqual(prevSize, safeSize)) {
        deltaApplied += prevSize - safeSize;
        nextLayout[index2] = safeSize;
        if (deltaApplied.toPrecision(3).localeCompare(Math.abs(delta).toPrecision(3), void 0, {
          numeric: true
        }) >= 0) {
          break;
        }
      }
      if (delta < 0) {
        index2--;
      } else {
        index2++;
      }
    }
  }
  if (areNumbersAlmostEqual(deltaApplied, 0)) {
    return prevLayout;
  }
  {
    const pivotIndex = delta < 0 ? secondPivotIndex : firstPivotIndex;
    const prevSize = prevLayout[pivotIndex];
    assert(prevSize != null);
    const unsafeSize = prevSize + deltaApplied;
    const safeSize = resizePane({
      paneConstraints: paneConstraintsArray,
      paneIndex: pivotIndex,
      initialSize: unsafeSize
    });
    nextLayout[pivotIndex] = safeSize;
    if (!areNumbersAlmostEqual(safeSize, unsafeSize)) {
      let deltaRemaining = unsafeSize - safeSize;
      const pivotIndex2 = delta < 0 ? secondPivotIndex : firstPivotIndex;
      let index2 = pivotIndex2;
      while (index2 >= 0 && index2 < paneConstraintsArray.length) {
        const prevSize2 = nextLayout[index2];
        assert(prevSize2 != null);
        const unsafeSize2 = prevSize2 + deltaRemaining;
        const safeSize2 = resizePane({
          paneConstraints: paneConstraintsArray,
          paneIndex: index2,
          initialSize: unsafeSize2
        });
        if (!areNumbersAlmostEqual(prevSize2, safeSize2)) {
          deltaRemaining -= safeSize2 - prevSize2;
          nextLayout[index2] = safeSize2;
        }
        if (areNumbersAlmostEqual(deltaRemaining, 0))
          break;
        delta > 0 ? index2-- : index2++;
      }
    }
  }
  const totalSize = nextLayout.reduce((total, size) => size + total, 0);
  if (!areNumbersAlmostEqual(totalSize, 100))
    return prevLayout;
  return nextLayout;
}
let currentState = null;
let element = null;
function getCursorStyle(state) {
  switch (state) {
    case "horizontal":
      return "ew-resize";
    case "horizontal-max":
      return "w-resize";
    case "horizontal-min":
      return "e-resize";
    case "vertical":
      return "ns-resize";
    case "vertical-max":
      return "n-resize";
    case "vertical-min":
      return "s-resize";
  }
}
function resetGlobalCursorStyle() {
  if (element === null)
    return;
  document.head.removeChild(element);
  currentState = null;
  element = null;
}
function setGlobalCursorStyle(state, doc) {
  if (currentState === state)
    return;
  currentState = state;
  const style = getCursorStyle(state);
  if (element === null) {
    element = doc.createElement("style");
    doc.head.appendChild(element);
  }
  element.innerHTML = `*{cursor: ${style}!important;}`;
}
function computePaneFlexBoxStyle({ defaultSize, dragState, layout, panesArray, paneIndex, precision = 3 }) {
  const size = layout[paneIndex];
  let flexGrow;
  if (size == null) {
    flexGrow = defaultSize ?? "1";
  } else if (panesArray.length === 1) {
    flexGrow = "1";
  } else {
    flexGrow = size.toPrecision(precision);
  }
  return {
    flexBasis: 0,
    flexGrow,
    flexShrink: 1,
    // Without this, pane sizes may be unintentionally overridden by their content
    overflow: "hidden",
    // Disable pointer events inside of a pane during resize
    // This avoid edge cases like nested iframes
    pointerEvents: dragState !== null ? "none" : void 0
  };
}
function initializeStorage(storageObject) {
  try {
    if (typeof localStorage === "undefined") {
      throw new TypeError("localStorage is not supported in this environment");
    }
    storageObject.getItem = (name) => localStorage.getItem(name);
    storageObject.setItem = (name, value) => localStorage.setItem(name, value);
  } catch (err) {
    console.error(err);
    storageObject.getItem = () => null;
    storageObject.setItem = () => {
    };
  }
}
function getPaneGroupKey(autoSaveId) {
  return `paneforge:${autoSaveId}`;
}
function getPaneKey(panes) {
  const sortedPaneIds = panes.map((pane) => {
    return pane.opts.order.current ? `${pane.opts.order.current}:${JSON.stringify(pane.constraints)}` : JSON.stringify(pane.constraints);
  }).sort().join(",");
  return sortedPaneIds;
}
function loadSerializedPaneGroupState(autoSaveId, storage) {
  try {
    const paneGroupKey = getPaneGroupKey(autoSaveId);
    const serialized = storage.getItem(paneGroupKey);
    const parsed = JSON.parse(serialized || "");
    if (typeof parsed === "object" && parsed !== null) {
      return parsed;
    }
  } catch {
  }
  return null;
}
function loadPaneGroupState(autoSaveId, panesArray, storage) {
  const state = loadSerializedPaneGroupState(autoSaveId, storage) || {};
  const paneKey = getPaneKey(panesArray);
  return state[paneKey] || null;
}
function savePaneGroupState(autoSaveId, panesArray, paneSizesBeforeCollapse, sizes, storage) {
  const paneGroupKey = getPaneGroupKey(autoSaveId);
  const paneKey = getPaneKey(panesArray);
  const state = loadSerializedPaneGroupState(autoSaveId, storage) || {};
  state[paneKey] = {
    expandToSizes: Object.fromEntries(paneSizesBeforeCollapse.entries()),
    layout: sizes
  };
  try {
    storage.setItem(paneGroupKey, JSON.stringify(state));
  } catch (error) {
    console.error(error);
  }
}
const debounceMap = {};
function debounce(callback, durationMs = 10) {
  let timeoutId = null;
  const callable = (...args) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      callback(...args);
    }, durationMs);
  };
  return callable;
}
function updateStorageValues({ autoSaveId, layout, storage, panesArray, paneSizeBeforeCollapse }) {
  if (layout.length === 0 || layout.length !== panesArray.length)
    return;
  let debouncedSave = debounceMap[autoSaveId];
  if (debouncedSave == null) {
    debouncedSave = debounce(savePaneGroupState, LOCAL_STORAGE_DEBOUNCE_INTERVAL);
    debounceMap[autoSaveId] = debouncedSave;
  }
  const clonedPanesArray = [...panesArray];
  const clonedPaneSizesBeforeCollapse = new Map(paneSizeBeforeCollapse);
  debouncedSave(autoSaveId, clonedPanesArray, clonedPaneSizesBeforeCollapse, layout, storage);
}
const defaultStorage = {
  getItem: (name) => {
    initializeStorage(defaultStorage);
    return defaultStorage.getItem(name);
  },
  setItem: (name, value) => {
    initializeStorage(defaultStorage);
    defaultStorage.setItem(name, value);
  }
};
const PaneGroupContext = new Context2("PaneGroup");
class PaneGroupState {
  static create(opts) {
    return PaneGroupContext.set(new PaneGroupState(opts));
  }
  opts;
  attachment;
  domContext;
  dragState = null;
  layout = [];
  panesArray = [];
  panesArrayChanged = false;
  paneIdToLastNotifiedSizeMap = {};
  paneSizeBeforeCollapseMap = /* @__PURE__ */ new Map();
  prevDelta = 0;
  constructor(opts) {
    this.opts = opts;
    this.attachment = attachRef(this.opts.ref);
    this.domContext = new DOMContext(this.opts.ref);
    watch(
      [
        () => this.opts.id.current,
        () => this.layout,
        () => this.panesArray
      ],
      () => {
        return updateResizeHandleAriaValues({
          groupId: this.opts.id.current,
          layout: this.layout,
          panesArray: this.panesArray,
          domContext: this.domContext
        });
      }
    );
    watch(
      [
        () => this.opts.autoSaveId.current,
        () => this.layout,
        () => this.opts.storage.current
      ],
      () => {
        if (!this.opts.autoSaveId.current) return;
        updateStorageValues({
          autoSaveId: this.opts.autoSaveId.current,
          layout: this.layout,
          storage: this.opts.storage.current,
          panesArray: this.panesArray,
          paneSizeBeforeCollapse: this.paneSizeBeforeCollapseMap
        });
      }
    );
    watch(() => this.panesArrayChanged, () => {
      if (!this.panesArrayChanged) return;
      this.panesArrayChanged = false;
      const prevLayout = this.layout;
      let unsafeLayout = null;
      if (this.opts.autoSaveId.current) {
        const state = loadPaneGroupState(this.opts.autoSaveId.current, this.panesArray, this.opts.storage.current);
        if (state) {
          this.paneSizeBeforeCollapseMap = new Map(Object.entries(state.expandToSizes));
          unsafeLayout = state.layout;
        }
      }
      if (unsafeLayout == null) {
        unsafeLayout = getUnsafeDefaultLayout({ panesArray: this.panesArray });
      }
      const nextLayout = validatePaneGroupLayout({
        layout: unsafeLayout,
        paneConstraints: this.panesArray.map((paneData) => paneData.constraints)
      });
      if (areArraysEqual(prevLayout, nextLayout)) return;
      this.layout = nextLayout;
      this.opts.onLayout.current?.(nextLayout);
      callPaneCallbacks(this.panesArray, nextLayout, this.paneIdToLastNotifiedSizeMap);
    });
  }
  setLayout = (newLayout) => {
    this.layout = newLayout;
  };
  registerResizeHandle = (dragHandleId) => {
    return (event) => {
      event.preventDefault();
      const direction = this.opts.direction.current;
      const dragState = this.dragState;
      const groupId = this.opts.id.current;
      const keyboardResizeBy = this.opts.keyboardResizeBy.current;
      const prevLayout = this.layout;
      const paneDataArray = this.panesArray;
      const { initialLayout } = dragState ?? {};
      const doc = this.domContext.getDocument();
      const pivotIndices = getPivotIndices({ groupId, dragHandleId, domContext: this.domContext });
      let delta = getDeltaPercentage({
        event,
        dragHandleId,
        dir: direction,
        initialDragState: dragState,
        keyboardResizeBy,
        domContext: this.domContext
      });
      if (delta === 0) return;
      const isHorizontal = direction === "horizontal";
      if (doc.dir === "rtl" && isHorizontal) {
        delta = -delta;
      }
      const paneConstraints = paneDataArray.map((paneData) => paneData.constraints);
      const nextLayout = adjustLayoutByDelta({
        delta,
        layout: initialLayout ?? prevLayout,
        paneConstraints,
        pivotIndices,
        trigger: isKeyDown(event) ? "keyboard" : "mouse-or-touch"
      });
      const layoutChanged = !areArraysEqual(prevLayout, nextLayout);
      if (isMouseEvent(event) || isTouchEvent(event)) {
        const prevDelta = this.prevDelta;
        if (prevDelta !== delta) {
          this.prevDelta = delta;
          if (!layoutChanged) {
            if (isHorizontal) {
              setGlobalCursorStyle(delta < 0 ? "horizontal-min" : "horizontal-max", doc);
            } else {
              setGlobalCursorStyle(delta < 0 ? "vertical-min" : "vertical-max", doc);
            }
          } else {
            setGlobalCursorStyle(isHorizontal ? "horizontal" : "vertical", doc);
          }
        }
      }
      if (layoutChanged) {
        this.setLayout(nextLayout);
        this.opts.onLayout.current?.(nextLayout);
        callPaneCallbacks(paneDataArray, nextLayout, this.paneIdToLastNotifiedSizeMap);
      }
    };
  };
  resizePane = (paneState, unsafePaneSize) => {
    const prevLayout = this.layout;
    const panesArray = this.panesArray;
    const paneConstraintsArr = panesArray.map((paneData) => paneData.constraints);
    const { paneSize, pivotIndices } = paneDataHelper(panesArray, paneState, prevLayout);
    assert(paneSize != null);
    const isLastPane = findPaneDataIndex(panesArray, paneState) === panesArray.length - 1;
    const delta = isLastPane ? paneSize - unsafePaneSize : unsafePaneSize - paneSize;
    const nextLayout = adjustLayoutByDelta({
      delta,
      layout: prevLayout,
      paneConstraints: paneConstraintsArr,
      pivotIndices,
      trigger: "imperative-api"
    });
    if (areArraysEqual(prevLayout, nextLayout)) return;
    this.setLayout(nextLayout);
    this.opts.onLayout.current?.(nextLayout);
    callPaneCallbacks(panesArray, nextLayout, this.paneIdToLastNotifiedSizeMap);
  };
  startDragging = (dragHandleId, e) => {
    const direction = this.opts.direction.current;
    const layout = this.layout;
    const handleElement = getResizeHandleElement(dragHandleId, this.domContext);
    assert(handleElement);
    const initialCursorPosition = getResizeEventCursorPosition(direction, e);
    this.dragState = {
      dragHandleId,
      dragHandleRect: handleElement.getBoundingClientRect(),
      initialCursorPosition,
      initialLayout: layout
    };
  };
  stopDragging = () => {
    resetGlobalCursorStyle();
    this.dragState = null;
  };
  isPaneCollapsed = (pane) => {
    const paneDataArray = this.panesArray;
    const layout = this.layout;
    const { collapsedSize = 0, collapsible, paneSize } = paneDataHelper(paneDataArray, pane, layout);
    if (typeof paneSize !== "number" || typeof collapsedSize !== "number") return false;
    return collapsible === true && areNumbersAlmostEqual(paneSize, collapsedSize);
  };
  expandPane = (pane) => {
    const prevLayout = this.layout;
    const paneDataArray = this.panesArray;
    if (!pane.constraints.collapsible) return;
    const paneConstraintsArray = paneDataArray.map((paneData) => paneData.constraints);
    const { collapsedSize = 0, paneSize, minSize = 0, pivotIndices } = paneDataHelper(paneDataArray, pane, prevLayout);
    if (paneSize !== collapsedSize) return;
    const prevPaneSize = this.paneSizeBeforeCollapseMap.get(pane.opts.id.current);
    const baseSize = prevPaneSize != null && prevPaneSize >= minSize ? prevPaneSize : minSize;
    const isLastPane = findPaneDataIndex(paneDataArray, pane) === paneDataArray.length - 1;
    const delta = isLastPane ? paneSize - baseSize : baseSize - paneSize;
    const nextLayout = adjustLayoutByDelta({
      delta,
      layout: prevLayout,
      paneConstraints: paneConstraintsArray,
      pivotIndices,
      trigger: "imperative-api"
    });
    if (areArraysEqual(prevLayout, nextLayout)) return;
    this.setLayout(nextLayout);
    this.opts.onLayout.current?.(nextLayout);
    callPaneCallbacks(paneDataArray, nextLayout, this.paneIdToLastNotifiedSizeMap);
  };
  collapsePane = (pane) => {
    const prevLayout = this.layout;
    const paneDataArray = this.panesArray;
    if (!pane.constraints.collapsible) return;
    const paneConstraintsArray = paneDataArray.map((paneData) => paneData.constraints);
    const { collapsedSize = 0, paneSize, pivotIndices } = paneDataHelper(paneDataArray, pane, prevLayout);
    assert(paneSize != null);
    if (paneSize === collapsedSize) return;
    this.paneSizeBeforeCollapseMap.set(pane.opts.id.current, paneSize);
    const isLastPane = findPaneDataIndex(paneDataArray, pane) === paneDataArray.length - 1;
    const delta = isLastPane ? paneSize - collapsedSize : collapsedSize - paneSize;
    const nextLayout = adjustLayoutByDelta({
      delta,
      layout: prevLayout,
      paneConstraints: paneConstraintsArray,
      pivotIndices,
      trigger: "imperative-api"
    });
    if (areArraysEqual(prevLayout, nextLayout)) return;
    this.layout = nextLayout;
    this.opts.onLayout.current?.(nextLayout);
    callPaneCallbacks(paneDataArray, nextLayout, this.paneIdToLastNotifiedSizeMap);
  };
  getPaneSize = (pane) => {
    return paneDataHelper(this.panesArray, pane, this.layout).paneSize;
  };
  getPaneStyle = (pane, defaultSize) => {
    const paneDataArray = this.panesArray;
    const layout = this.layout;
    const dragState = this.dragState;
    const paneIndex = findPaneDataIndex(paneDataArray, pane);
    return computePaneFlexBoxStyle({
      defaultSize,
      dragState,
      layout,
      panesArray: paneDataArray,
      paneIndex
    });
  };
  isPaneExpanded = (pane) => {
    const { collapsedSize = 0, collapsible, paneSize } = paneDataHelper(this.panesArray, pane, this.layout);
    return !collapsible || paneSize > collapsedSize;
  };
  registerPane = (pane) => {
    const newPaneDataArray = [...this.panesArray, pane];
    newPaneDataArray.sort((paneA, paneB) => {
      const orderA = paneA.opts.order.current;
      const orderB = paneB.opts.order.current;
      if (orderA == null && orderB == null) {
        return 0;
      } else if (orderA == null) {
        return -1;
      } else if (orderB == null) {
        return 1;
      } else {
        return orderA - orderB;
      }
    });
    this.panesArray = newPaneDataArray;
    this.panesArrayChanged = true;
    return () => {
      const paneDataArray = [...this.panesArray];
      const index2 = findPaneDataIndex(this.panesArray, pane);
      if (index2 < 0) return;
      paneDataArray.splice(index2, 1);
      this.panesArray = paneDataArray;
      delete this.paneIdToLastNotifiedSizeMap[pane.opts.id.current];
      this.panesArrayChanged = true;
    };
  };
  #setResizeHandlerEventListeners = () => {
    const groupId = this.opts.id.current;
    const handles = getResizeHandleElementsForGroup(groupId, this.domContext);
    const paneDataArray = this.panesArray;
    const unsubHandlers = handles.map((handle) => {
      const handleId = handle.getAttribute("data-pane-resizer-id");
      if (!handleId) return noop;
      const [idBefore, idAfter] = getResizeHandlePaneIds({
        groupId,
        handleId,
        panesArray: paneDataArray,
        domContext: this.domContext
      });
      if (idBefore == null || idAfter == null) return noop;
      const onKeydown = (e) => {
        if (e.defaultPrevented || e.key !== "Enter") return;
        e.preventDefault();
        const paneDataArray2 = this.panesArray;
        const index2 = paneDataArray2.findIndex((paneData2) => paneData2.opts.id.current === idBefore);
        if (index2 < 0) return;
        const paneData = paneDataArray2[index2];
        assert(paneData);
        const layout = this.layout;
        const size = layout[index2];
        const { collapsedSize = 0, collapsible, minSize = 0 } = paneData.constraints;
        if (!(size != null && collapsible)) return;
        const nextLayout = adjustLayoutByDelta({
          delta: areNumbersAlmostEqual(size, collapsedSize) ? minSize - size : collapsedSize - size,
          layout,
          paneConstraints: paneDataArray2.map((paneData2) => paneData2.constraints),
          pivotIndices: getPivotIndices({ groupId, dragHandleId: handleId, domContext: this.domContext }),
          trigger: "keyboard"
        });
        if (layout !== nextLayout) {
          this.layout = nextLayout;
        }
      };
      const unsubListener = addEventListener(handle, "keydown", onKeydown);
      return () => {
        unsubListener();
      };
    });
    return () => {
      for (const unsub of unsubHandlers) {
        unsub();
      }
    };
  };
  #props = derived(() => ({
    id: this.opts.id.current,
    "data-pane-group": "",
    "data-direction": this.opts.direction.current,
    "data-pane-group-id": this.opts.id.current,
    style: {
      display: "flex",
      flexDirection: this.opts.direction.current === "horizontal" ? "row" : "column",
      height: "100%",
      overflow: "hidden",
      width: "100%"
    },
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
const resizeKeys = [
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "End",
  "Home"
];
class PaneResizerState {
  static create(opts) {
    return new PaneResizerState(opts, PaneGroupContext.get());
  }
  opts;
  #group;
  attachment;
  domContext;
  #isDragging = derived(() => this.#group.dragState?.dragHandleId === this.opts.id.current);
  #isFocused = false;
  resizeHandler = null;
  constructor(opts, group) {
    this.opts = opts;
    this.#group = group;
    this.attachment = attachRef(this.opts.ref);
    this.domContext = new DOMContext(this.opts.ref);
  }
  #startDragging = (e) => {
    e.preventDefault();
    if (this.opts.disabled.current) return;
    this.#group.startDragging(this.opts.id.current, e);
    this.opts.onDraggingChange.current(true);
  };
  #stopDraggingAndBlur = () => {
    const node = this.opts.ref.current;
    if (!node) return;
    node.blur();
    this.#group.stopDragging();
    this.opts.onDraggingChange.current(false);
  };
  #onkeydown = (e) => {
    if (this.opts.disabled.current || !this.resizeHandler || e.defaultPrevented) return;
    if (resizeKeys.includes(e.key)) {
      e.preventDefault();
      this.resizeHandler(e);
      return;
    }
    if (e.key !== "F6") return;
    e.preventDefault();
    const handles = getResizeHandleElementsForGroup(this.#group.opts.id.current, this.domContext);
    const index2 = getResizeHandleElementIndex({
      groupId: this.#group.opts.id.current,
      id: this.opts.id.current,
      domContext: this.domContext
    });
    if (index2 === null) return;
    let nextIndex = 0;
    if (e.shiftKey) {
      if (index2 > 0) {
        nextIndex = index2 - 1;
      } else {
        nextIndex = handles.length - 1;
      }
    } else {
      if (index2 + 1 < handles.length) {
        nextIndex = index2 + 1;
      } else {
        nextIndex = 0;
      }
    }
    const nextHandle = handles[nextIndex];
    nextHandle.focus();
  };
  #onblur = () => {
    this.#isFocused = false;
  };
  #onfocus = () => {
    this.#isFocused = true;
  };
  #onmousedown = (e) => {
    this.#startDragging(e);
  };
  #onmouseup = () => {
    this.#stopDraggingAndBlur();
  };
  #ontouchcancel = () => {
    this.#stopDraggingAndBlur();
  };
  #ontouchend = () => {
    this.#stopDraggingAndBlur();
  };
  #ontouchstart = (e) => {
    this.#startDragging(e);
  };
  #props = derived(() => ({
    id: this.opts.id.current,
    role: "separator",
    "data-direction": this.#group.opts.direction.current,
    "data-pane-group-id": this.#group.opts.id.current,
    "data-active": this.#isDragging() ? "pointer" : this.#isFocused ? "keyboard" : void 0,
    "data-enabled": !this.opts.disabled.current,
    "data-pane-resizer-id": this.opts.id.current,
    "data-pane-resizer": "",
    tabIndex: this.opts.tabIndex.current,
    style: {
      cursor: getCursorStyle(this.#group.opts.direction.current),
      touchAction: "none",
      userSelect: "none",
      "-webkit-user-select": "none",
      "-webkit-touch-callout": "none"
    },
    onkeydown: this.#onkeydown,
    onblur: this.#onblur,
    onfocus: this.#onfocus,
    onmousedown: this.#onmousedown,
    onmouseup: this.#onmouseup,
    ontouchcancel: this.#ontouchcancel,
    ontouchend: this.#ontouchend,
    ontouchstart: this.#ontouchstart,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class PaneState {
  static create(opts) {
    return new PaneState(opts, PaneGroupContext.get());
  }
  opts;
  group;
  attachment;
  domContext;
  #paneTransitionState = "";
  #callbacks = derived(() => ({
    onCollapse: this.opts.onCollapse.current,
    onExpand: this.opts.onExpand.current,
    onResize: this.opts.onResize.current
  }));
  get callbacks() {
    return this.#callbacks();
  }
  set callbacks($$value) {
    return this.#callbacks($$value);
  }
  #constraints = derived(() => ({
    collapsedSize: this.opts.collapsedSize.current,
    collapsible: this.opts.collapsible.current,
    defaultSize: this.opts.defaultSize.current,
    maxSize: this.opts.maxSize.current,
    minSize: this.opts.minSize.current
  }));
  get constraints() {
    return this.#constraints();
  }
  set constraints($$value) {
    return this.#constraints($$value);
  }
  #handleTransition = (state) => {
    this.#paneTransitionState = state;
    afterTick(() => {
      if (this.opts.ref.current) {
        const element2 = this.opts.ref.current;
        const computedStyle = getComputedStyle(element2);
        const hasTransition = computedStyle.transitionDuration !== "0s";
        if (!hasTransition) {
          this.#paneTransitionState = "";
          return;
        }
        const handleTransitionEnd = (event) => {
          if (event.propertyName === "flex-grow") {
            this.#paneTransitionState = "";
            element2.removeEventListener("transitionend", handleTransitionEnd);
          }
        };
        element2.addEventListener("transitionend", handleTransitionEnd);
      } else {
        this.#paneTransitionState = "";
      }
    });
  };
  pane = {
    collapse: () => {
      this.#handleTransition("collapsing");
      this.group.collapsePane(this);
    },
    expand: () => {
      this.#handleTransition("expanding");
      this.group.expandPane(this);
    },
    getSize: () => this.group.getPaneSize(this),
    isCollapsed: () => this.group.isPaneCollapsed(this),
    isExpanded: () => this.group.isPaneExpanded(this),
    resize: (size) => this.group.resizePane(this, size),
    getId: () => this.opts.id.current
  };
  constructor(opts, group) {
    this.opts = opts;
    this.group = group;
    this.attachment = attachRef(this.opts.ref);
    this.domContext = new DOMContext(this.opts.ref);
    watch(() => snapshot(this.constraints), () => {
      this.group.panesArrayChanged = true;
    });
  }
  #isCollapsed = derived(() => this.group.isPaneCollapsed(this));
  #paneState = derived(() => this.#paneTransitionState !== "" ? this.#paneTransitionState : this.#isCollapsed() ? "collapsed" : "expanded");
  #props = derived(() => ({
    id: this.opts.id.current,
    style: this.group.getPaneStyle(this, this.opts.defaultSize.current),
    "data-pane": "",
    "data-pane-id": this.opts.id.current,
    "data-pane-group-id": this.group.opts.id.current,
    "data-collapsed": this.#isCollapsed() ? "" : void 0,
    "data-expanded": this.#isCollapsed() ? void 0 : "",
    "data-pane-state": this.#paneState(),
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
function Pane_group($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const uid = props_id($$renderer2);
    let {
      autoSaveId = null,
      direction,
      id = uid,
      keyboardResizeBy = null,
      onLayoutChange = noop,
      storage = defaultStorage,
      ref = null,
      child,
      children,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const paneGroupState = PaneGroupState.create({
      id: box.with(() => id ?? uid),
      ref: box.with(() => ref, (v) => ref = v),
      autoSaveId: box.with(() => autoSaveId),
      direction: box.with(() => direction),
      keyboardResizeBy: box.with(() => keyboardResizeBy),
      onLayout: box.with(() => onLayoutChange),
      storage: box.with(() => storage)
    });
    const getLayout = () => paneGroupState.layout;
    const setLayout = paneGroupState.setLayout;
    const getId = () => paneGroupState.opts.id.current;
    const mergedProps = mergeProps(restProps, paneGroupState.props);
    if (child) {
      $$renderer2.push("<!--[-->");
      child($$renderer2, { props: mergedProps });
      $$renderer2.push(`<!---->`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div${attributes({ ...mergedProps })}>`);
      children?.($$renderer2);
      $$renderer2.push(`<!----></div>`);
    }
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, { ref, getLayout, setLayout, getId });
  });
}
function Pane($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const uid = props_id($$renderer2);
    let {
      id = uid,
      ref = null,
      collapsedSize,
      collapsible,
      defaultSize,
      maxSize,
      minSize,
      onCollapse = noop,
      onExpand = noop,
      onResize = noop,
      order,
      child,
      children,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const paneState = PaneState.create({
      id: box.with(() => id),
      ref: box.with(() => ref, (v) => ref = v),
      collapsedSize: box.with(() => collapsedSize),
      collapsible: box.with(() => collapsible),
      defaultSize: box.with(() => defaultSize),
      maxSize: box.with(() => maxSize),
      minSize: box.with(() => minSize),
      onCollapse: box.with(() => onCollapse),
      onExpand: box.with(() => onExpand),
      onResize: box.with(() => onResize),
      order: box.with(() => order)
    });
    const collapse = paneState.pane.collapse;
    const expand = paneState.pane.expand;
    const getSize = paneState.pane.getSize;
    const isCollapsed = paneState.pane.isCollapsed;
    const isExpanded = paneState.pane.isExpanded;
    const resize = paneState.pane.resize;
    const getId = paneState.pane.getId;
    const mergedProps = mergeProps(restProps, paneState.props);
    if (child) {
      $$renderer2.push("<!--[-->");
      child($$renderer2, { props: mergedProps });
      $$renderer2.push(`<!---->`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div${attributes({ ...mergedProps })}>`);
      children?.($$renderer2);
      $$renderer2.push(`<!----></div>`);
    }
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, {
      ref,
      collapse,
      expand,
      getSize,
      isCollapsed,
      isExpanded,
      resize,
      getId
    });
  });
}
function Pane_resizer($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const uid = props_id($$renderer2);
    let {
      id = uid,
      ref = null,
      disabled = false,
      onDraggingChange = noop,
      tabindex = 0,
      child,
      children,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const resizerState = PaneResizerState.create({
      id: box.with(() => id),
      ref: box.with(() => ref, (v) => ref = v),
      disabled: box.with(() => disabled),
      onDraggingChange: box.with(() => onDraggingChange),
      tabIndex: box.with(() => tabindex)
    });
    const mergedProps = mergeProps(restProps, resizerState.props);
    if (child) {
      $$renderer2.push("<!--[-->");
      child($$renderer2, { props: mergedProps });
      $$renderer2.push(`<!---->`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div${attributes({ ...mergedProps })}>`);
      children?.($$renderer2);
      $$renderer2.push(`<!----></div>`);
    }
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, { ref });
  });
}
function Resizable_handle($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      withHandle = false,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<!---->`);
      Pane_resizer($$renderer3, spread_props([
        {
          "data-slot": "resizable-handle",
          class: cn("bg-border focus-visible:ring-ring focus-visible:outline-hidden relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-offset-1 data-[direction=vertical]:h-px data-[direction=vertical]:w-full data-[direction=vertical]:after:left-0 data-[direction=vertical]:after:h-1 data-[direction=vertical]:after:w-full data-[direction=vertical]:after:-translate-y-1/2 data-[direction=vertical]:after:translate-x-0 [&[data-direction=vertical]>div]:rotate-90", className)
        },
        restProps,
        {
          get ref() {
            return ref;
          },
          set ref($$value) {
            ref = $$value;
            $$settled = false;
          },
          children: ($$renderer4) => {
            if (withHandle) {
              $$renderer4.push("<!--[-->");
              $$renderer4.push(`<div class="bg-border rounded-xs z-10 flex h-4 w-3 items-center justify-center border">`);
              Grip_vertical($$renderer4, { class: "size-2.5" });
              $$renderer4.push(`<!----></div>`);
            } else {
              $$renderer4.push("<!--[!-->");
            }
            $$renderer4.push(`<!--]-->`);
          },
          $$slots: { default: true }
        }
      ]));
      $$renderer3.push(`<!---->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    bind_props($$props, { ref });
  });
}
function Resizable_pane_group($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      this: paneGroup = void 0,
      class: className,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    $$renderer2.push(`<!---->`);
    Pane_group($$renderer2, spread_props([
      {
        "data-slot": "resizable-pane-group",
        class: cn("flex h-full w-full data-[direction=vertical]:flex-col", className)
      },
      restProps
    ]));
    $$renderer2.push(`<!---->`);
    bind_props($$props, { ref, this: paneGroup });
  });
}
function Switch($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      checked = false,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<!---->`);
      Switch$1($$renderer3, spread_props([
        {
          "data-slot": "switch",
          class: cn("data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 shadow-xs peer inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent outline-none transition-all focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50", className)
        },
        restProps,
        {
          get ref() {
            return ref;
          },
          set ref($$value) {
            ref = $$value;
            $$settled = false;
          },
          get checked() {
            return checked;
          },
          set checked($$value) {
            checked = $$value;
            $$settled = false;
          },
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->`);
            Switch_thumb($$renderer4, {
              "data-slot": "switch-thumb",
              class: cn("bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0")
            });
            $$renderer4.push(`<!---->`);
          },
          $$slots: { default: true }
        }
      ]));
      $$renderer3.push(`<!---->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    bind_props($$props, { ref, checked });
  });
}
function Label($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<!---->`);
      Label$1($$renderer3, spread_props([
        {
          "data-slot": "label",
          class: cn("flex select-none items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50", className)
        },
        restProps,
        {
          get ref() {
            return ref;
          },
          set ref($$value) {
            ref = $$value;
            $$settled = false;
          }
        }
      ]));
      $$renderer3.push(`<!---->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    bind_props($$props, { ref });
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    let filesMap = {};
    let activeFilePath = null;
    let saveStatus = "saved";
    let iframeEl = null;
    let hotReloadEnabled = true;
    let isAdvancedMode = false;
    function openFile(path) {
      activeFilePath = path;
      fileTree.setActiveFile(path);
    }
    async function handleFileEditCompleted(path, newContent) {
      console.log("✅ [Client-Side Edit] Persisting to server:", path);
      if (newContent) {
        const file2 = filesMap[path];
        if (file2) {
          filesMap[path] = { ...file2, content: newContent };
        }
      }
      const file = filesMap[path];
      if (file) {
        try {
          const response = await fetch(`/api/projects/${data.project.id}/files`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path, content: file.content })
          });
          if (!response.ok) {
            throw new Error("Failed to save file");
          }
          filesMap[path] = { ...file, dirty: false };
          saveStatus = "saved";
          console.log("✅ [Client-Side Edit] Saved to server successfully");
        } catch (error) {
          console.error("❌ [Client-Side Edit] Failed to save:", error);
          saveStatus = "unsaved";
        }
      }
    }
    async function handleFileCreateRequest(path, content, approvalId, onApprove, onDeny) {
      const fileExists = path in filesMap;
      if (fileExists) {
        console.log("📝 File already exists, treating createFile as overwrite:", path);
      } else {
        console.log("📄 File creation requested:", path);
      }
      filesMap[path] = { content, dirty: false };
      if (!fileExists) {
        fileTree.buildTree(Object.keys(filesMap));
      }
      openFile(path);
      try {
        const method = fileExists ? "PUT" : "POST";
        const response = await fetch(`/api/projects/${data.project.id}/files`, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path, content })
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to save file to server");
        }
        if (fileExists) {
          console.log("✅ File overwritten and saved to server:", path);
        } else {
          console.log("✅ File created and saved to server:", path);
        }
        onApprove();
      } catch (error) {
        console.error("❌ Failed to save file to server:", error);
        alert(`File ${fileExists ? "overwrite" : "creation"} failed: ${error instanceof Error ? error.message : String(error)}`);
        onDeny();
      }
    }
    function handleSendErrorToAI(errorMessage) {
    }
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<div class="flex h-screen flex-col"><header class="flex items-center gap-4 border-b bg-background px-4 py-3"><a href="/dashboard" class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">`);
      Arrow_left($$renderer3, { class: "h-4 w-4" });
      $$renderer3.push(`<!----> Dashboard</a> <div class="h-4 w-px bg-border"></div> <h1 class="text-lg font-semibold">${escape_html(data.project.name)}</h1> <div class="ml-auto flex items-center gap-3"><div class="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5">`);
      Label($$renderer3, {
        for: "editor-mode",
        class: "cursor-pointer text-xs font-medium",
        children: ($$renderer4) => {
          $$renderer4.push(`<!---->${escape_html("Basic")}`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> `);
      Switch($$renderer3, {
        id: "editor-mode",
        get checked() {
          return isAdvancedMode;
        },
        set checked($$value) {
          isAdvancedMode = $$value;
          $$settled = false;
        }
      });
      $$renderer3.push(`<!----></div> <div class="h-6 w-px bg-border"></div> <span class="text-xs text-muted-foreground">`);
      if (saveStatus === "saving") {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`💾 Saving...`);
      } else {
        $$renderer3.push("<!--[!-->");
        if (saveStatus === "saved") {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`✓ Saved`);
        } else {
          $$renderer3.push("<!--[!-->");
          $$renderer3.push(`• Unsaved changes`);
        }
        $$renderer3.push(`<!--]-->`);
      }
      $$renderer3.push(`<!--]--></span> <button class="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">`);
      Play($$renderer3, { class: "h-4 w-4" });
      $$renderer3.push(`<!----> Run Game</button></div></header> `);
      {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<!---->`);
        Resizable_pane_group($$renderer3, {
          direction: "horizontal",
          class: "flex-1",
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->`);
            Pane($$renderer4, {
              defaultSize: 60,
              minSize: 40,
              maxSize: 80,
              children: ($$renderer5) => {
                $$renderer5.push(`<div class="h-full">`);
                GamePreview($$renderer5, {
                  projectId: data.project.id,
                  onRunGame: async () => {
                  },
                  onSendErrorToAI: handleSendErrorToAI,
                  get hotReloadEnabled() {
                    return hotReloadEnabled;
                  },
                  set hotReloadEnabled($$value) {
                    hotReloadEnabled = $$value;
                    $$settled = false;
                  },
                  get iframeEl() {
                    return iframeEl;
                  },
                  set iframeEl($$value) {
                    iframeEl = $$value;
                    $$settled = false;
                  }
                });
                $$renderer5.push(`<!----></div>`);
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!----> <!---->`);
            Resizable_handle($$renderer4, { withHandle: true });
            $$renderer4.push(`<!----> <!---->`);
            Pane($$renderer4, {
              defaultSize: 40,
              minSize: 20,
              maxSize: 60,
              children: ($$renderer5) => {
                AIChatPanel($$renderer5, {
                  projectId: data.project.id,
                  onFileEditCompleted: handleFileEditCompleted,
                  onFileCreateRequested: handleFileCreateRequest,
                  hideToggles: true
                });
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!---->`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!---->`);
      }
      $$renderer3.push(`<!--]--> <footer class="flex items-center gap-4 border-t bg-muted/30 px-4 py-1.5 text-xs text-muted-foreground"><span>CodeMirror 6</span> `);
      if (activeFilePath) {
        $$renderer3.push("<!--[-->");
        const file = filesMap[activeFilePath];
        $$renderer3.push(`<span>•</span> <span>${escape_html(activeFilePath)}</span> `);
        if (file) {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<span>•</span> <span>${escape_html(file.content.split("\n").length)} lines</span>`);
        } else {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]-->`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--></footer></div> `);
      {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> `);
      {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]-->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
  });
}
export {
  _page as default
};
