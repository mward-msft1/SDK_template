#pragma once

#include "agent_middleware_template.h"
#include "types.h"

ModelResult runWithAgentFramework(const GovernedMiddleware& middleware, const std::string& defaultUserId);
ModelResult runWithM365AgentsSdk(const GovernedMiddleware& middleware, const std::string& defaultUserId);
