use crate::agent365_adapter::Agent365Adapter;
use crate::config::AppConfig;
use crate::models::{ModelResult, TurnContext};
use crate::purview_adapter::PurviewAdapter;

pub type NextFn = dyn Fn(&TurnContext) -> Result<ModelResult, String>;

pub fn run_governed_turn(
    input_context: &TurnContext,
    next: &NextFn,
    purview: &PurviewAdapter,
    agent365: &Agent365Adapter,
    config: &AppConfig,
) -> Result<ModelResult, String> {
    let mut context = input_context.clone();
    if context.user_id.trim().is_empty() {
        context.user_id = config.default_user_id.clone();
    }
    if context.user_id.trim().is_empty() {
        return Err("Missing user_id in context and DEFAULT_USER_ID in environment.".to_string());
    }

    agent365.report_turn_start(&context);
    let _scopes = purview.compute_protection_scopes(&context.user_id)?;

    let inbound = purview.evaluate_content(
        &context.user_id,
        "uploadText",
        &context.input_text,
        &context.turn_id,
    )?;
    let inbound_decision = purview.get_enforcement_decision(&inbound);
    agent365.report_purview_decision(&context, "pre-model", &inbound_decision);
    if inbound_decision.block {
        let blocked = ModelResult {
            blocked: true,
            reason: "Purview policy blocked inbound content.".to_string(),
            output_text: String::new(),
        };
        agent365.report_turn_end(&context, &blocked);
        return Ok(blocked);
    }

    let model_result = next(&context)?;

    let outbound = purview.evaluate_content(
        &context.user_id,
        "downloadText",
        &model_result.output_text,
        &context.turn_id,
    )?;
    let outbound_decision = purview.get_enforcement_decision(&outbound);
    agent365.report_purview_decision(&context, "post-model", &outbound_decision);

    if outbound_decision.block {
        let blocked = ModelResult {
            blocked: true,
            reason: "Purview policy blocked outbound content.".to_string(),
            output_text: String::new(),
        };
        agent365.report_turn_end(&context, &blocked);
        return Ok(blocked);
    }

    agent365.report_turn_end(&context, &model_result);
    Ok(model_result)
}
