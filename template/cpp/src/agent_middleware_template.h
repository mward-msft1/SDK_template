#pragma once

#include "agent365_adapter.h"
#include "config.h"
#include "purview_adapter.h"
#include "types.h"

#include <functional>

using NextFunction = std::function<ModelResult(const Context&)>;
using GovernedMiddleware = std::function<ModelResult(const Context&, const NextFunction&)>;

GovernedMiddleware createGovernedAgentMiddleware(
    const PurviewAdapter& purview,
    const Agent365Adapter& agent365,
    const AppConfig& config);
