use std::env;

#[derive(Clone, Debug)]
pub struct AppConfig {
    pub tenant_id: String,
    pub entra_client_id: String,
    pub entra_client_secret: String,
    pub entra_sidecar_enabled: bool,
    pub entra_sidecar_url: String,
    pub entra_sidecar_service_name: String,
    pub entra_sidecar_auth_mode: String,
    pub entra_agent_client_id: String,
    pub default_user_id: String,
    pub agent_name: String,
    pub host_sdk: String,
    pub m365_agents_bot_app_id: String,
    pub m365_agents_bot_app_password: String,
    pub m365_agents_tenant_id: String,
    pub agent365_app_id: String,
    pub agent365_app_secret: String,
    pub agent365_tenant_id: String,
    pub agent365_reporting_endpoint: String,
    pub purview_graph_base_url: String,
    pub purview_app_location_id: String,
    pub purview_activity_types: String,
    pub purview_enable_audit_when_no_scope: bool,
    pub purview_block_on_error: bool,
    pub graph_access_token_placeholder: String,
}

fn required(name: &str) -> Result<String, String> {
    match env::var(name) {
        Ok(v) if !v.trim().is_empty() => Ok(v),
        _ => Err(format!("Missing required environment variable: {name}")),
    }
}

fn optional(name: &str, fallback: &str) -> String {
    env::var(name)
        .ok()
        .filter(|v| !v.trim().is_empty())
        .unwrap_or_else(|| fallback.to_string())
}

fn as_bool(name: &str, fallback: &str) -> bool {
    optional(name, fallback).eq_ignore_ascii_case("true")
}

pub fn load_config() -> Result<AppConfig, String> {
    let sidecar_enabled = as_bool("ENTRA_SIDECAR_ENABLED", "true");
    Ok(AppConfig {
        tenant_id: required("TENANT_ID")?,
        entra_client_id: required("ENTRA_CLIENT_ID")?,
        entra_client_secret: required("ENTRA_CLIENT_SECRET")?,
        entra_sidecar_enabled: sidecar_enabled,
        entra_sidecar_url: optional("ENTRA_SIDECAR_URL", "http://localhost:5000"),
        entra_sidecar_service_name: optional("ENTRA_SIDECAR_SERVICE_NAME", "Graph"),
        entra_sidecar_auth_mode: optional("ENTRA_SIDECAR_AUTH_MODE", "autonomous"),
        entra_agent_client_id: if sidecar_enabled {
            required("AGENT_CLIENT_ID")?
        } else {
            optional("AGENT_CLIENT_ID", "")
        },
        default_user_id: optional("DEFAULT_USER_ID", ""),
        agent_name: optional("AGENT_NAME", "ContosoAgnosticAgent"),
        host_sdk: optional("HOST_SDK", "agent-framework"),
        m365_agents_bot_app_id: required("M365_AGENTS_BOT_APP_ID")?,
        m365_agents_bot_app_password: required("M365_AGENTS_BOT_APP_PASSWORD")?,
        m365_agents_tenant_id: required("M365_AGENTS_TENANT_ID")?,
        agent365_app_id: required("AGENT365_APP_ID")?,
        agent365_app_secret: required("AGENT365_APP_SECRET")?,
        agent365_tenant_id: required("AGENT365_TENANT_ID")?,
        agent365_reporting_endpoint: required("AGENT365_REPORTING_ENDPOINT")?,
        purview_graph_base_url: optional(
            "PURVIEW_GRAPH_BASE_URL",
            "https://graph.microsoft.com/v1.0",
        ),
        purview_app_location_id: required("PURVIEW_APP_LOCATION_ID")?,
        purview_activity_types: optional("PURVIEW_ACTIVITY_TYPES", "uploadText,downloadText"),
        purview_enable_audit_when_no_scope: as_bool("PURVIEW_ENABLE_AUDIT_WHEN_NO_SCOPE", "true"),
        purview_block_on_error: as_bool("PURVIEW_BLOCK_ON_ERROR", "true"),
        graph_access_token_placeholder: optional("GRAPH_ACCESS_TOKEN_PLACEHOLDER", ""),
    })
}
