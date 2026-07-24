# C++ examples (beginner)

This folder is the C++ version of the same template pipeline used in `template/src` (JavaScript) and `template/python`.

## Files

- `src/config.*` - reads required placeholders from environment variables.
- `src/agent365_adapter.*` - TODO points for Agent365 SDK reporting hooks.
- `src/purview_adapter.*` - Purview Graph placeholder calls and decision parsing.
- `src/agent_middleware_template.*` - pre/post model policy checks and block logic.
- `src/host_adapters.*` - where to wire Agent Framework or Microsoft 365 Agents SDK hosts.
- `src/example_runner.cpp` - starter runner.

## Run

From `template/`:

```bash
cp .env.example .env
set -a && source .env && set +a
/usr/bin/c++ -std=c++17 cpp/src/*.cpp -o ./cpp/example_runner
./cpp/example_runner
```

Before running, replace TODO placeholders in `src/agent365_adapter.cpp`, `src/purview_adapter.cpp`, and `src/host_adapters.cpp`.
