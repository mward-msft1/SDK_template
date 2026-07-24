use crate::config::AppConfig;
use crate::models::{Decision, ModelResult, TurnContext};

#[derive(Clone, Debug)]
pub struct Agent365Adapter {
    #[allow(dead_code)]
    config: AppConfig,
}

impl Agent365Adapter {
    pub fn new(config: AppConfig) -> Self {
        // TODO: Initialize the real Agent365 SDK client with tenant/app credentials.
        Self { config }
    }

    pub fn report_turn_start(&self, context: &TurnContext) {
        // TODO: Map this to Agent365 telemetry/reporting API.
        println!("[Agent365] Turn started: {}", context.turn_id);
    }

    pub fn report_purview_decision(&self, context: &TurnContext, stage: &str, decision: &Decision) {
        // TODO: Map this to Agent365 telemetry/reporting API.
        println!(
            "[Agent365] Stage={}, Turn={}, Block={}",
            stage, context.turn_id, decision.block
        );
    }

    pub fn report_turn_end(&self, context: &TurnContext, result: &ModelResult) {
        // TODO: Map this to Agent365 telemetry/reporting API.
        println!(
            "[Agent365] Turn ended: {}, Blocked={}",
            context.turn_id, result.blocked
        );
    }
}
