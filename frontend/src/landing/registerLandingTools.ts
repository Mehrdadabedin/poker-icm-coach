/**
 * WebMCP registration for the landing page (A47), mirroring
 * src/webmcp/registerGameTools.ts: one AbortController scope per model
 * context, every registration awaited, failures kept silent, cleanup aborts.
 */
import type {
  GameToolRegistration,
  ModelContext,
  WebMcpDocument,
  WebMcpTool,
} from "../webmcp/webmcpTypes";
import type { LandingToolActions } from "./landingTools";
import { buildLandingTools } from "./landingTools";

const activeRegistrations = new WeakMap<ModelContext, AbortController>();

export function registerLandingTools(
  actions: LandingToolActions,
  target?: WebMcpDocument,
): GameToolRegistration | undefined {
  const page = target ?? (typeof document === "undefined" ? undefined : document as WebMcpDocument);
  const context = page?.modelContext;
  if (!context || typeof context.registerTool !== "function") return undefined;

  const existing = activeRegistrations.get(context);
  if (existing && !existing.signal.aborted) {
    return { ready: Promise.resolve(), cleanup: () => undefined };
  }

  const controller = new AbortController();
  activeRegistrations.set(context, controller);
  const settle = (tool: WebMcpTool) => {
    try {
      return Promise.resolve(context.registerTool(tool, { signal: controller.signal }));
    } catch (error) {
      return Promise.reject(error);
    }
  };
  const ready = Promise.allSettled(buildLandingTools(actions).map(settle)).then(() => undefined);

  const cleanup = () => {
    if (activeRegistrations.get(context) !== controller) return;
    activeRegistrations.delete(context);
    controller.abort();
  };

  return { ready, cleanup };
}
