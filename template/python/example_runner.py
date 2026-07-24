import asyncio
import uuid

from config import load_config
from agent365_adapter import Agent365Adapter
from purview_adapter import PurviewAdapter
from agent_middleware_template import create_governed_agent_middleware
from host_adapters import run_with_agent_framework, run_with_m365_agents_sdk


async def run():
    config = load_config()
    agent365 = Agent365Adapter(config)
    purview = PurviewAdapter(config)

    middleware = create_governed_agent_middleware(purview, agent365, config)

    async def shared_middleware(context, next_fn):
        context = dict(context)
        context["turn_id"] = context.get("turn_id") or str(uuid.uuid4())
        context["user_id"] = context.get("user_id") or config.get("default_user_id")
        return await middleware(context, next_fn)

    if config["host_sdk"] == "m365-agents-sdk":
        result = await run_with_m365_agents_sdk(shared_middleware)
    else:
        result = await run_with_agent_framework(shared_middleware)

    print(result)


if __name__ == "__main__":
    asyncio.run(run())
