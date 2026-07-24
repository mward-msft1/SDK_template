use crate::agent365_adapter::Agent365Adapter;
use crate::config::AppConfig;
use crate::middleware::run_governed_turn;
use crate::models::{ModelResult, TurnContext};
use crate::purview_adapter::PurviewAdapter;

pub fn run_with_agent_framework(
    purview: &PurviewAdapter,
    agent365: &Agent365Adapter,
    config: &AppConfig,
) -> Result<ModelResult, String> {
    // TODO: Replace with your real Agent Framework turn/context objects.
    let context = TurnContext {
        turn_id: "replace-with-runtime-turn-id".to_string(),
        user_id: config.default_user_id.clone(),
        input_text: "Hello from Agent Framework host".to_string(),
    };

    // TODO: Replace with your real model/agent invoke function.
    let next = |_ctx: &TurnContext| -> Result<ModelResult, String> {
        Ok(ModelResult {
            blocked: false,
            reason: String::new(),
            output_text: "Agent Framework model output placeholder".to_string(),
        })
    };

    run_governed_turn(&context, &next, purview, agent365, config)
}

pub fn run_with_m365_agents_sdk(
    purview: &PurviewAdapter,
    agent365: &Agent365Adapter,
    config: &AppConfig,
) -> Result<ModelResult, String> {
    // TODO: Replace with your real Microsoft 365 Agents SDK activity handler.
    let context = TurnContext {
        turn_id: "replace-with-activity-id".to_string(),
        user_id: config.default_user_id.clone(),
        input_text: "Hello from Microsoft 365 Agents SDK host".to_string(),
    };

    // TODO: Replace with your AI invocation (OpenAI/Azure OpenAI/other).
    let next = |_ctx: &TurnContext| -> Result<ModelResult, String> {
        Ok(ModelResult {
            blocked: false,
            reason: String::new(),
            output_text: "Microsoft 365 Agents SDK model output placeholder".to_string(),
        })
    };

    run_governed_turn(&context, &next, purview, agent365, config)
}
