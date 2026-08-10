import { loadConfig } from "./config.js";
import { Agent365Adapter } from "./integrations/agent365Adapter.js";
import { PurviewAdapter } from "./integrations/purviewAdapter.js";
import { BedrockAdapter } from "./integrations/bedrockAdapter.js";
import { createGovernedAgentMiddleware } from "./framework/agentMiddlewareTemplate.js";
import {
  runWithAgentFramework,
  runWithBedrock,
  runWithM365AgentsSdk
} from "./framework/hostAdapters.js";
import { randomUUID } from "node:crypto";

async function run() {
  const config = loadConfig();
  const agent365 = new Agent365Adapter(config);
  const purview = new PurviewAdapter(config);

  const middleware = createGovernedAgentMiddleware({ purview, agent365, config });
  const sharedMiddleware = async (context, next) =>
    middleware(
      {
        ...context,
        turnId: context.turnId || randomUUID(),
        userId: context.userId || process.env.DEFAULT_USER_ID
      },
      next
    );

  let result;
  if (config.hostSdk === "bedrock") {
    const bedrock = new BedrockAdapter(config);
    result = await runWithBedrock({
      middleware: sharedMiddleware,
      bedrock,
      config
    });
  } else if (config.hostSdk === "m365-agents-sdk") {
    result = await runWithM365AgentsSdk({ middleware: sharedMiddleware });
  } else {
    result = await runWithAgentFramework({ middleware: sharedMiddleware });
  }

  console.log(JSON.stringify(result, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
