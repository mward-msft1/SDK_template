# Rust examples (beginner)

This folder is the Rust version of the same template pipeline used in JavaScript (`template/src`), Python (`template/python`), C++ (`template/cpp`), and C#/.NET (`template/dotnet`).

## Files

- `src/config.rs` - reads required placeholders from environment variables.
- `src/models.rs` - shared context/result models.
- `src/agent365_adapter.rs` - TODO points for Agent365 SDK reporting hooks.
- `src/purview_adapter.rs` - Purview Graph placeholder calls and decision parsing.
- `src/middleware.rs` - pre/post model policy checks and block logic.
- `src/host_adapters.rs` - where to wire Agent Framework or Microsoft 365 Agents SDK hosts.
- `src/main.rs` - starter runner.

## Run

From `template/`:

```bash
cp .env.example .env
set -a && source .env && set +a
cargo run --manifest-path ./rust/Cargo.toml
```

Before running, replace TODO placeholders in `src/agent365_adapter.rs`, `src/purview_adapter.rs`, and `src/host_adapters.rs`.
