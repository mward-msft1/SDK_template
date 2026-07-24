# Go examples (beginner)

This folder is the Go version of the same template pipeline used in JavaScript (`template/src`), Python (`template/python`), C++ (`template/cpp`), C#/.NET (`template/dotnet`), and Rust (`template/rust`).

## Files

- `config.go` - reads required placeholders from environment variables.
- `models.go` - shared context/result models.
- `agent365_adapter.go` - TODO points for Agent365 SDK reporting hooks.
- `purview_adapter.go` - Purview Graph placeholder calls and decision parsing.
- `middleware.go` - pre/post model policy checks and block logic.
- `host_adapters.go` - where to wire Agent Framework or Microsoft 365 Agents SDK hosts.
- `main.go` - starter runner.

## Run

From `template/`:

```bash
cp .env.example .env
set -a && source .env && set +a
cd go
go run .
```

Before running, replace TODO placeholders in `agent365_adapter.go`, `purview_adapter.go`, and `host_adapters.go`.
