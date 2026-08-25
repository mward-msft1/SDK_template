import { loadAgent365Config } from "./config.js";
import { EntraSidecarClient } from "./entra-sidecar.js";
import {
  Agent365Observer,
  initializeAgent365,
  shutdownAgent365
} from "./observability.js";

const config = loadAgent365Config();
const sidecar = config.exportEnabled
  ? new EntraSidecarClient(config.sidecarUrl, config.agentId)
  : undefined;

initializeAgent365(config, sidecar);
const observer = new Agent365Observer(config);

try {
  const result = await observer.runTurn(
    "Explain where the Agent 365 blueprint ID belongs.",
    async () => ({
      text: "Store the blueprint ID in trusted host configuration and include it in Agent 365 metadata.",
      inputTokens: 9,
      outputTokens: 18
    })
  );
  console.log(result.text);
} finally {
  await shutdownAgent365();
}
