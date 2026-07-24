#include "agent365_adapter.h"
#include "agent_middleware_template.h"
#include "config.h"
#include "host_adapters.h"
#include "purview_adapter.h"

#include <iostream>

int main() {
  try {
    const AppConfig config = loadConfig();
    const Agent365Adapter agent365(config);
    const PurviewAdapter purview(config);
    const GovernedMiddleware middleware = createGovernedAgentMiddleware(purview, agent365, config);

    ModelResult result;
    if (config.hostSdk == "m365-agents-sdk") {
      result = runWithM365AgentsSdk(middleware, config.defaultUserId);
    } else {
      result = runWithAgentFramework(middleware, config.defaultUserId);
    }

    std::cout << "{\n"
              << "  \"blocked\": " << (result.blocked ? "true" : "false") << ",\n"
              << "  \"reason\": \"" << result.reason << "\",\n"
              << "  \"outputText\": \"" << result.outputText << "\"\n"
              << "}\n";
    return 0;
  } catch (const std::exception& ex) {
    std::cerr << ex.what() << "\n";
    return 1;
  }
}
