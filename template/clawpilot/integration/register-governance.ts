/**
 * Copy this file into a claw-pilot clone at:
 *   src/integrations/register-microsoft-governance.ts
 *
 * Copy this template's src/ directory into:
 *   src/integrations/microsoft-governance/
 *
 * This file intentionally imports claw-pilot internals, so it is excluded from
 * the standalone template build.
 */
import { registerMiddleware } from "../runtime/middleware/index.js";
import { registerPlugin } from "../runtime/plugin/index.js";
import {
  Agent365Telemetry,
  EntraSidecarClient,
  PurviewClient,
  createPurviewMiddleware,
  createPurviewToolPlugin,
  initializeAgent365,
  loadGovernanceConfig
} from "./microsoft-governance/index.js";

let registered = false;

export function registerMicrosoftGovernance(): void {
  if (registered) return;

  const config = loadGovernanceConfig();
  const sidecar = new EntraSidecarClient(
    config.entraSidecarUrl,
    config.agentClientId
  );
  const policy = new PurviewClient(config, sidecar);
  const telemetry = new Agent365Telemetry(config);

  initializeAgent365(config, sidecar);
  registerMiddleware(createPurviewMiddleware({ config, policy, telemetry }));
  registerPlugin(
    "microsoft-purview-tools",
    createPurviewToolPlugin({ config, policy, telemetry })
  );
  registered = true;
}
