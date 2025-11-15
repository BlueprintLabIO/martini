import { get_request_store, with_request_store } from "@sveltejs/kit/internal/server";
import { error, json } from "@sveltejs/kit";
import { j as stringify_remote_arg, k as parse, h as stringify, f as create_remote_cache_key } from "./chunks/shared.js";
import { b as base, c as app_dir, B as BROWSER, p as prerendering } from "./chunks/environment.js";
function create_validator(validate_or_fn, maybe_fn) {
  if (!maybe_fn) {
    return (arg) => {
      if (arg !== void 0) {
        error(400, "Bad Request");
      }
    };
  }
  if (validate_or_fn === "unchecked") {
    return (arg) => arg;
  }
  if ("~standard" in validate_or_fn) {
    return async (arg) => {
      const { event, state } = get_request_store();
      const validate = validate_or_fn["~standard"].validate;
      const result = await validate(arg);
      if (result.issues) {
        error(
          400,
          await state.handleValidationError({
            issues: result.issues,
            event
          })
        );
      }
      return result.value;
    };
  }
  throw new Error(
    'Invalid validator passed to remote function. Expected "unchecked" or a Standard Schema (https://standardschema.dev)'
  );
}
async function get_response(info, arg, state, get_result) {
  await 0;
  const cache = get_cache(info, state);
  return cache[stringify_remote_arg(arg, state.transport)] ??= get_result();
}
function parse_remote_response(data, transport) {
  const revivers = {};
  for (const key in transport) {
    revivers[key] = transport[key].decode;
  }
  return parse(data, revivers);
}
async function run_remote_function(event, state, allow_cookies, arg, validate, fn) {
  const store = {
    event: {
      ...event,
      setHeaders: () => {
        throw new Error("setHeaders is not allowed in remote functions");
      },
      cookies: {
        ...event.cookies,
        set: (name, value, opts) => {
          if (!allow_cookies) {
            throw new Error("Cannot set cookies in `query` or `prerender` functions");
          }
          if (opts.path && !opts.path.startsWith("/")) {
            throw new Error("Cookies set in remote functions must have an absolute path");
          }
          return event.cookies.set(name, value, opts);
        },
        delete: (name, opts) => {
          if (!allow_cookies) {
            throw new Error("Cannot delete cookies in `query` or `prerender` functions");
          }
          if (opts.path && !opts.path.startsWith("/")) {
            throw new Error("Cookies deleted in remote functions must have an absolute path");
          }
          return event.cookies.delete(name, opts);
        }
      }
    },
    state: {
      ...state,
      is_in_remote_function: true
    }
  };
  const validated = await with_request_store(store, () => validate(arg));
  return with_request_store(store, () => fn(validated));
}
function get_cache(info, state = get_request_store().state) {
  let cache = state.remote_data?.get(info);
  if (cache === void 0) {
    cache = {};
    (state.remote_data ??= /* @__PURE__ */ new Map()).set(info, cache);
  }
  return cache;
}
// @__NO_SIDE_EFFECTS__
function command(validate_or_fn, maybe_fn) {
  const fn = maybe_fn ?? validate_or_fn;
  const validate = create_validator(validate_or_fn, maybe_fn);
  const __ = { type: "command", id: "", name: "" };
  const wrapper = (arg) => {
    const { event, state } = get_request_store();
    if (state.is_endpoint_request) {
      if (!["POST", "PUT", "PATCH", "DELETE"].includes(event.request.method)) {
        throw new Error(
          `Cannot call a command (\`${__.name}(${maybe_fn ? "..." : ""})\`) from a ${event.request.method} handler`
        );
      }
    } else if (!event.isRemoteRequest) {
      throw new Error(
        `Cannot call a command (\`${__.name}(${maybe_fn ? "..." : ""})\`) during server-side rendering`
      );
    }
    state.refreshes ??= {};
    const promise = Promise.resolve(run_remote_function(event, state, true, arg, validate, fn));
    promise.updates = () => {
      throw new Error(`Cannot call '${__.name}(...).updates(...)' on the server`);
    };
    return (
      /** @type {ReturnType<RemoteCommand<Input, Output>>} */
      promise
    );
  };
  Object.defineProperty(wrapper, "__", { value: __ });
  Object.defineProperty(wrapper, "pending", {
    get: () => 0
  });
  return wrapper;
}
function set_nested_value(object, path_string, value) {
  if (path_string.startsWith("n:")) {
    path_string = path_string.slice(2);
    value = value === "" ? void 0 : parseFloat(value);
  } else if (path_string.startsWith("b:")) {
    path_string = path_string.slice(2);
    value = value === "on";
  }
  deep_set(object, split_path(path_string), value);
}
function convert_formdata(data) {
  const result = {};
  for (let key of data.keys()) {
    if (key.startsWith("sveltekit:")) {
      continue;
    }
    const is_array = key.endsWith("[]");
    let values = data.getAll(key);
    if (is_array) key = key.slice(0, -2);
    if (values.length > 1 && !is_array) {
      throw new Error(`Form cannot contain duplicated keys — "${key}" has ${values.length} values`);
    }
    values = values.filter(
      (entry) => typeof entry === "string" || entry.name !== "" || entry.size > 0
    );
    if (key.startsWith("n:")) {
      key = key.slice(2);
      values = values.map((v) => v === "" ? void 0 : parseFloat(
        /** @type {string} */
        v
      ));
    } else if (key.startsWith("b:")) {
      key = key.slice(2);
      values = values.map((v) => v === "on");
    }
    set_nested_value(result, key, is_array ? values : values[0]);
  }
  return result;
}
const path_regex = /^[a-zA-Z_$]\w*(\.[a-zA-Z_$]\w*|\[\d+\])*$/;
function split_path(path) {
  if (!path_regex.test(path)) {
    throw new Error(`Invalid path ${path}`);
  }
  return path.split(/\.|\[|\]/).filter(Boolean);
}
function check_prototype_pollution(key) {
  if (key === "__proto__" || key === "constructor" || key === "prototype") {
    throw new Error(
      `Invalid key "${key}"`
    );
  }
}
function deep_set(object, keys, value) {
  let current = object;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const key = keys[i];
    check_prototype_pollution(key);
    const is_array = /^\d+$/.test(keys[i + 1]);
    const exists = key in current;
    const inner = current[key];
    if (exists && is_array !== Array.isArray(inner)) {
      throw new Error(`Invalid array key ${keys[i + 1]}`);
    }
    if (!exists) {
      current[key] = is_array ? [] : {};
    }
    current = current[key];
  }
  const final_key = keys[keys.length - 1];
  check_prototype_pollution(final_key);
  current[final_key] = value;
}
function normalize_issue(issue, server = false) {
  const normalized = { name: "", path: [], message: issue.message, server };
  if (issue.path !== void 0) {
    let name = "";
    for (const segment of issue.path) {
      const key = (
        /** @type {string | number} */
        typeof segment === "object" ? segment.key : segment
      );
      normalized.path.push(key);
      if (typeof key === "number") {
        name += `[${key}]`;
      } else if (typeof key === "string") {
        name += name === "" ? key : "." + key;
      }
    }
    normalized.name = name;
  }
  return normalized;
}
function flatten_issues(issues) {
  const result = {};
  for (const issue of issues) {
    (result.$ ??= []).push(issue);
    let name = "";
    if (issue.path !== void 0) {
      for (const key of issue.path) {
        if (typeof key === "number") {
          name += `[${key}]`;
        } else if (typeof key === "string") {
          name += name === "" ? key : "." + key;
        }
        (result[name] ??= []).push(issue);
      }
    }
  }
  return result;
}
function deep_get(object, path) {
  let current = object;
  for (const key of path) {
    if (current == null || typeof current !== "object") {
      return current;
    }
    current = current[key];
  }
  return current;
}
function create_field_proxy(target, get_input, set_input, get_issues, path = []) {
  const get_value = () => {
    return deep_get(get_input(), path);
  };
  return new Proxy(target, {
    get(target2, prop) {
      if (typeof prop === "symbol") return target2[prop];
      if (/^\d+$/.test(prop)) {
        return create_field_proxy({}, get_input, set_input, get_issues, [
          ...path,
          parseInt(prop, 10)
        ]);
      }
      const key = build_path_string(path);
      if (prop === "set") {
        const set_func = function(newValue) {
          set_input(path, newValue);
          return newValue;
        };
        return create_field_proxy(set_func, get_input, set_input, get_issues, [...path, prop]);
      }
      if (prop === "value") {
        return create_field_proxy(get_value, get_input, set_input, get_issues, [...path, prop]);
      }
      if (prop === "issues" || prop === "allIssues") {
        const issues_func = () => {
          const all_issues = get_issues()[key === "" ? "$" : key];
          if (prop === "allIssues") {
            return all_issues?.map((issue) => ({
              path: issue.path,
              message: issue.message
            }));
          }
          return all_issues?.filter((issue) => issue.name === key)?.map((issue) => ({
            message: issue.message
          }));
        };
        return create_field_proxy(issues_func, get_input, set_input, get_issues, [...path, prop]);
      }
      if (prop === "as") {
        const as_func = (type, input_value) => {
          const is_array = type === "file multiple" || type === "select multiple" || type === "checkbox" && typeof input_value === "string";
          const prefix = type === "number" || type === "range" ? "n:" : type === "checkbox" && !is_array ? "b:" : "";
          const base_props = {
            name: prefix + key + (is_array ? "[]" : ""),
            get "aria-invalid"() {
              const issues = get_issues();
              return key in issues ? "true" : void 0;
            }
          };
          if (type !== "text" && type !== "select" && type !== "select multiple") {
            base_props.type = type === "file multiple" ? "file" : type;
          }
          if (type === "submit" || type === "hidden") {
            return Object.defineProperties(base_props, {
              value: { value: input_value, enumerable: true }
            });
          }
          if (type === "select" || type === "select multiple") {
            return Object.defineProperties(base_props, {
              multiple: { value: is_array, enumerable: true },
              value: {
                enumerable: true,
                get() {
                  return get_value();
                }
              }
            });
          }
          if (type === "checkbox" || type === "radio") {
            return Object.defineProperties(base_props, {
              value: { value: input_value ?? "on", enumerable: true },
              checked: {
                enumerable: true,
                get() {
                  const value = get_value();
                  if (type === "radio") {
                    return value === input_value;
                  }
                  if (is_array) {
                    return (value ?? []).includes(input_value);
                  }
                  return value;
                }
              }
            });
          }
          if (type === "file" || type === "file multiple") {
            return Object.defineProperties(base_props, {
              multiple: { value: is_array, enumerable: true },
              files: {
                enumerable: true,
                get() {
                  const value = get_value();
                  if (value instanceof File) {
                    if (typeof DataTransfer !== "undefined") {
                      const fileList = new DataTransfer();
                      fileList.items.add(value);
                      return fileList.files;
                    }
                    return { 0: value, length: 1 };
                  }
                  if (Array.isArray(value) && value.every((f) => f instanceof File)) {
                    if (typeof DataTransfer !== "undefined") {
                      const fileList = new DataTransfer();
                      value.forEach((file) => fileList.items.add(file));
                      return fileList.files;
                    }
                    const fileListLike = { length: value.length };
                    value.forEach((file, index) => {
                      fileListLike[index] = file;
                    });
                    return fileListLike;
                  }
                  return null;
                }
              }
            });
          }
          return Object.defineProperties(base_props, {
            value: {
              enumerable: true,
              get() {
                const value = get_value();
                return value != null ? String(value) : "";
              }
            }
          });
        };
        return create_field_proxy(as_func, get_input, set_input, get_issues, [...path, "as"]);
      }
      return create_field_proxy({}, get_input, set_input, get_issues, [...path, prop]);
    }
  });
}
function build_path_string(path) {
  let result = "";
  for (const segment of path) {
    if (typeof segment === "number") {
      result += `[${segment}]`;
    } else {
      result += result === "" ? segment : "." + segment;
    }
  }
  return result;
}
// @__NO_SIDE_EFFECTS__
function form(validate_or_fn, maybe_fn) {
  const fn = maybe_fn ?? validate_or_fn;
  const schema = !maybe_fn || validate_or_fn === "unchecked" ? null : (
    /** @type {any} */
    validate_or_fn
  );
  function create_instance(key) {
    const instance = {};
    instance.method = "POST";
    Object.defineProperty(instance, "enhance", {
      value: () => {
        return { action: instance.action, method: instance.method };
      }
    });
    const button_props = {
      type: "submit",
      onclick: () => {
      }
    };
    Object.defineProperty(button_props, "enhance", {
      value: () => {
        return { type: "submit", formaction: instance.buttonProps.formaction, onclick: () => {
        } };
      }
    });
    Object.defineProperty(instance, "buttonProps", {
      value: button_props
    });
    const __ = {
      type: "form",
      name: "",
      id: "",
      /** @param {FormData} form_data */
      fn: async (form_data) => {
        const validate_only = form_data.get("sveltekit:validate_only") === "true";
        let data = maybe_fn ? convert_formdata(form_data) : void 0;
        if (data && data.id === void 0) {
          const id = form_data.get("sveltekit:id");
          if (typeof id === "string") {
            data.id = JSON.parse(id);
          }
        }
        const output = {};
        output.submission = true;
        const { event, state } = get_request_store();
        const validated = await schema?.["~standard"].validate(data);
        if (validate_only) {
          return validated?.issues?.map((issue) => normalize_issue(issue, true)) ?? [];
        }
        if (validated?.issues !== void 0) {
          handle_issues(output, validated.issues, event.isRemoteRequest, form_data);
        } else {
          if (validated !== void 0) {
            data = validated.value;
          }
          state.refreshes ??= {};
          const invalid = create_invalid();
          try {
            output.result = await run_remote_function(
              event,
              state,
              true,
              data,
              (d) => d,
              (data2) => !maybe_fn ? fn(invalid) : fn(data2, invalid)
            );
          } catch (e) {
            if (e instanceof ValidationError) {
              handle_issues(output, e.issues, event.isRemoteRequest, form_data);
            } else {
              throw e;
            }
          }
        }
        if (!event.isRemoteRequest) {
          get_cache(__, state)[""] ??= output;
        }
        return output;
      }
    };
    Object.defineProperty(instance, "__", { value: __ });
    Object.defineProperty(instance, "action", {
      get: () => `?/remote=${__.id}`,
      enumerable: true
    });
    Object.defineProperty(button_props, "formaction", {
      get: () => `?/remote=${__.id}`,
      enumerable: true
    });
    Object.defineProperty(instance, "fields", {
      get() {
        const data = get_cache(__)?.[""];
        const issues = flatten_issues(data?.issues ?? []);
        return create_field_proxy(
          {},
          () => data?.input ?? {},
          (path, value) => {
            if (data?.submission) {
              return;
            }
            const input = path.length === 0 ? value : deep_set(data?.input ?? {}, path.map(String), value);
            (get_cache(__)[""] ??= {}).input = input;
          },
          () => issues
        );
      }
    });
    Object.defineProperty(instance, "result", {
      get() {
        try {
          return get_cache(__)?.[""]?.result;
        } catch {
          return void 0;
        }
      }
    });
    Object.defineProperty(instance, "pending", {
      get: () => 0
    });
    Object.defineProperty(button_props, "pending", {
      get: () => 0
    });
    Object.defineProperty(instance, "preflight", {
      // preflight is a noop on the server
      value: () => instance
    });
    Object.defineProperty(instance, "validate", {
      value: () => {
        throw new Error("Cannot call validate() on the server");
      }
    });
    if (key == void 0) {
      Object.defineProperty(instance, "for", {
        /** @type {RemoteForm<any, any>['for']} */
        value: (key2) => {
          const { state } = get_request_store();
          const cache_key = __.id + "|" + JSON.stringify(key2);
          let instance2 = (state.form_instances ??= /* @__PURE__ */ new Map()).get(cache_key);
          if (!instance2) {
            instance2 = create_instance(key2);
            instance2.__.id = `${__.id}/${encodeURIComponent(JSON.stringify(key2))}`;
            instance2.__.name = __.name;
            state.form_instances.set(cache_key, instance2);
          }
          return instance2;
        }
      });
    }
    return instance;
  }
  return create_instance();
}
function handle_issues(output, issues, is_remote_request, form_data) {
  output.issues = issues.map((issue) => normalize_issue(issue, true));
  if (!is_remote_request) {
    output.input = {};
    for (let key of form_data.keys()) {
      if (/^[.\]]?_/.test(key)) continue;
      const is_array = key.endsWith("[]");
      const values = form_data.getAll(key).filter((value) => typeof value === "string");
      if (is_array) key = key.slice(0, -2);
      set_nested_value(
        /** @type {Record<string, any>} */
        output.input,
        key,
        is_array ? values : values[0]
      );
    }
  }
}
function create_invalid() {
  function invalid(...issues) {
    throw new ValidationError(
      issues.map((issue) => {
        if (typeof issue === "string") {
          return {
            path: [],
            message: issue
          };
        }
        return issue;
      })
    );
  }
  return (
    /** @type {import('@sveltejs/kit').Invalid} */
    new Proxy(invalid, {
      get(target, prop) {
        if (typeof prop === "symbol") return (
          /** @type {any} */
          target[prop]
        );
        const create_issue = (message, path = []) => ({
          message,
          path
        });
        return create_issue_proxy(prop, create_issue, []);
      }
    })
  );
}
class ValidationError extends Error {
  /**
   * @param {StandardSchemaV1.Issue[]} issues
   */
  constructor(issues) {
    super("Validation failed");
    this.name = "ValidationError";
    this.issues = issues;
  }
}
function create_issue_proxy(key, create_issue, path) {
  const new_path = [...path, key];
  const issue_func = (message) => create_issue(message, new_path);
  return new Proxy(issue_func, {
    get(target, prop) {
      if (typeof prop === "symbol") return (
        /** @type {any} */
        target[prop]
      );
      if (/^\d+$/.test(prop)) {
        return create_issue_proxy(parseInt(prop, 10), create_issue, new_path);
      }
      return create_issue_proxy(prop, create_issue, new_path);
    }
  });
}
// @__NO_SIDE_EFFECTS__
function prerender(validate_or_fn, fn_or_options, maybe_options) {
  const maybe_fn = typeof fn_or_options === "function" ? fn_or_options : void 0;
  const options = maybe_options ?? (maybe_fn ? void 0 : fn_or_options);
  const fn = maybe_fn ?? validate_or_fn;
  const validate = create_validator(validate_or_fn, maybe_fn);
  const __ = {
    type: "prerender",
    id: "",
    name: "",
    has_arg: !!maybe_fn,
    inputs: options?.inputs,
    dynamic: options?.dynamic
  };
  const wrapper = (arg) => {
    const promise = (async () => {
      const { event, state } = get_request_store();
      const payload = stringify_remote_arg(arg, state.transport);
      const id = __.id;
      const url = `${base}/${app_dir}/remote/${id}${payload ? `/${payload}` : ""}`;
      if (!state.prerendering && !BROWSER && !event.isRemoteRequest) {
        try {
          return await get_response(__, arg, state, async () => {
            const key = stringify_remote_arg(arg, state.transport);
            const cache = get_cache(__, state);
            const promise3 = cache[key] ??= fetch(new URL(url, event.url.origin).href).then(
              async (response) => {
                if (!response.ok) {
                  throw new Error("Prerendered response not found");
                }
                const prerendered = await response.json();
                if (prerendered.type === "error") {
                  error(prerendered.status, prerendered.error);
                }
                return prerendered.result;
              }
            );
            return parse_remote_response(await promise3, state.transport);
          });
        } catch {
        }
      }
      if (state.prerendering?.remote_responses.has(url)) {
        return (
          /** @type {Promise<any>} */
          state.prerendering.remote_responses.get(url)
        );
      }
      const promise2 = get_response(
        __,
        arg,
        state,
        () => run_remote_function(event, state, false, arg, validate, fn)
      );
      if (state.prerendering) {
        state.prerendering.remote_responses.set(url, promise2);
      }
      const result = await promise2;
      if (state.prerendering) {
        const body = { type: "result", result: stringify(result, state.transport) };
        state.prerendering.dependencies.set(url, {
          body: JSON.stringify(body),
          response: json(body)
        });
      }
      return result;
    })();
    promise.catch(() => {
    });
    return (
      /** @type {RemoteResource<Output>} */
      promise
    );
  };
  Object.defineProperty(wrapper, "__", { value: __ });
  return wrapper;
}
// @__NO_SIDE_EFFECTS__
function query(validate_or_fn, maybe_fn) {
  const fn = maybe_fn ?? validate_or_fn;
  const validate = create_validator(validate_or_fn, maybe_fn);
  const __ = { type: "query", id: "", name: "" };
  const wrapper = (arg) => {
    if (prerendering) {
      throw new Error(
        `Cannot call query '${__.name}' while prerendering, as prerendered pages need static data. Use 'prerender' from $app/server instead`
      );
    }
    const { event, state } = get_request_store();
    const promise = get_response(
      __,
      arg,
      state,
      () => run_remote_function(event, state, false, arg, validate, fn)
    );
    promise.catch(() => {
    });
    promise.set = (value) => {
      const { state: state2 } = get_request_store();
      const refreshes = state2.refreshes;
      if (!refreshes) {
        throw new Error(
          `Cannot call set on query '${__.name}' because it is not executed in the context of a command/form remote function`
        );
      }
      if (__.id) {
        const cache = get_cache(__, state2);
        const key = stringify_remote_arg(arg, state2.transport);
        refreshes[create_remote_cache_key(__.id, key)] = cache[key] = Promise.resolve(value);
      }
    };
    promise.refresh = () => {
      const { state: state2 } = get_request_store();
      const refreshes = state2.refreshes;
      if (!refreshes) {
        throw new Error(
          `Cannot call refresh on query '${__.name}' because it is not executed in the context of a command/form remote function`
        );
      }
      const cache_key = create_remote_cache_key(__.id, stringify_remote_arg(arg, state2.transport));
      refreshes[cache_key] = promise;
      return promise.then(() => {
      });
    };
    promise.withOverride = () => {
      throw new Error(`Cannot call '${__.name}.withOverride()' on the server`);
    };
    return (
      /** @type {RemoteQuery<Output>} */
      promise
    );
  };
  Object.defineProperty(wrapper, "__", { value: __ });
  return wrapper;
}
// @__NO_SIDE_EFFECTS__
function batch(validate_or_fn, maybe_fn) {
  const fn = maybe_fn ?? validate_or_fn;
  const validate = create_validator(validate_or_fn, maybe_fn);
  const __ = {
    type: "query_batch",
    id: "",
    name: "",
    run: (args) => {
      const { event, state } = get_request_store();
      return run_remote_function(
        event,
        state,
        false,
        args,
        (array) => Promise.all(array.map(validate)),
        fn
      );
    }
  };
  let batching = { args: [], resolvers: [] };
  const wrapper = (arg) => {
    if (prerendering) {
      throw new Error(
        `Cannot call query.batch '${__.name}' while prerendering, as prerendered pages need static data. Use 'prerender' from $app/server instead`
      );
    }
    const { event, state } = get_request_store();
    const promise = get_response(__, arg, state, () => {
      return new Promise((resolve, reject) => {
        batching.args.push(arg);
        batching.resolvers.push({ resolve, reject });
        if (batching.args.length > 1) return;
        setTimeout(async () => {
          const batched = batching;
          batching = { args: [], resolvers: [] };
          try {
            const get_result = await run_remote_function(
              event,
              state,
              false,
              batched.args,
              (array) => Promise.all(array.map(validate)),
              fn
            );
            for (let i = 0; i < batched.resolvers.length; i++) {
              try {
                batched.resolvers[i].resolve(get_result(batched.args[i], i));
              } catch (error2) {
                batched.resolvers[i].reject(error2);
              }
            }
          } catch (error2) {
            for (const resolver of batched.resolvers) {
              resolver.reject(error2);
            }
          }
        }, 0);
      });
    });
    promise.catch(() => {
    });
    promise.refresh = async () => {
      const { state: state2 } = get_request_store();
      const refreshes = state2.refreshes;
      if (!refreshes) {
        throw new Error(
          `Cannot call refresh on query.batch '${__.name}' because it is not executed in the context of a command/form remote function`
        );
      }
      const cache_key = create_remote_cache_key(__.id, stringify_remote_arg(arg, state2.transport));
      refreshes[cache_key] = await /** @type {Promise<any>} */
      promise;
    };
    promise.withOverride = () => {
      throw new Error(`Cannot call '${__.name}.withOverride()' on the server`);
    };
    return (
      /** @type {RemoteQuery<Output>} */
      promise
    );
  };
  Object.defineProperty(wrapper, "__", { value: __ });
  return wrapper;
}
Object.defineProperty(query, "batch", { value: batch, enumerable: true });
export {
  command,
  form,
  prerender,
  query
};
