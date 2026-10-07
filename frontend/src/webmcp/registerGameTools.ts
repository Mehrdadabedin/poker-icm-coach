/** WebMCP tool registration for the live table (A46: split modules, no
 * console logging; every touched file stays within the 200-line cap). */
import type {
  GameToolRegistration,
  ModelContext,
  WebMcpDocument,
  WebMcpTool,
} from "./webmcpTypes";
import { buildTools } from "./webmcpTools";

export type { GameToolActions, HandHistoryEntry } from "./webmcpTypes";

const activeRegistrations = new WeakMap<ModelContext, Map<string, AbortController>>();

export function registerGameTools(
  actions: Parameters<typeof buildTools>[0],
  target?: WebMcpDocument,
): GameToolRegistration | undefined {
  const page = target ?? (typeof document === "undefined" ? undefined : document as WebMcpDocument);
  const context = page?.modelContext;
  if (!context || typeof context.registerTool !== "function") return undefined;

  let scopes = activeRegistrations.get(context);
  if (!scopes) {
    scopes = new Map();
    activeRegistrations.set(context, scopes);
  }
  const existing = scopes.get(actions.tableId);
  if (existing && !existing.signal.aborted) {
    return { ready: Promise.resolve(), cleanup: () => undefined };
  }

  const controller = new AbortController();
  scopes.set(actions.tableId, controller);
  // A46: failed registrations are deliberately silent (no console.error).
  const settle = (tool: WebMcpTool) => {
    try {
      return Promise.resolve(context.registerTool(tool, { signal: controller.signal }));
    } catch (error) {
      return Promise.reject(error);
    }
  };
  const ready = Promise.allSettled(buildTools(actions).map(settle)).then(() => undefined);

  const cleanup = () => {
    if (scopes?.get(actions.tableId) !== controller) return;
    scopes.delete(actions.tableId);
    controller.abort();
  };

  return { ready, cleanup };
}
