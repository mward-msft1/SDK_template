import os


def required(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise ValueError(f"Missing required environment variable: {name}")
    return value


def as_bool(name: str, default: str = "true") -> bool:
    return os.getenv(name, default).strip().lower() == "true"


def load_config() -> dict:
    return {
        "tenant_id": required("TENANT_ID"),
        "entra_client_id": required("ENTRA_CLIENT_ID"),
        "entra_client_secret": required("ENTRA_CLIENT_SECRET"),
        "default_user_id": os.getenv("DEFAULT_USER_ID", ""),
        "agent_name": os.getenv("AGENT_NAME", "ContosoAgnosticAgent"),
        "agent_runtime": os.getenv("AGENT_RUNTIME", "agent-framework"),
        "agent_environment": os.getenv("AGENT_ENVIRONMENT", "dev"),
        "host_sdk": os.getenv("HOST_SDK", "agent-framework"),
        "m365_agents_bot_app_id": required("M365_AGENTS_BOT_APP_ID"),
        "m365_agents_bot_app_password": required("M365_AGENTS_BOT_APP_PASSWORD"),
        "m365_agents_tenant_id": required("M365_AGENTS_TENANT_ID"),
        "agent365_app_id": required("AGENT365_APP_ID"),
        "agent365_app_secret": required("AGENT365_APP_SECRET"),
        "agent365_tenant_id": required("AGENT365_TENANT_ID"),
        "agent365_reporting_endpoint": required("AGENT365_REPORTING_ENDPOINT"),
        "purview_graph_base_url": os.getenv("PURVIEW_GRAPH_BASE_URL", "https://graph.microsoft.com/v1.0"),
        "purview_graph_scope": os.getenv("PURVIEW_GRAPH_SCOPE", "https://graph.microsoft.com/.default"),
        "purview_app_location_id": required("PURVIEW_APP_LOCATION_ID"),
        "purview_activity_types": os.getenv("PURVIEW_ACTIVITY_TYPES", "uploadText,downloadText"),
        "purview_enable_audit_when_no_scope": as_bool("PURVIEW_ENABLE_AUDIT_WHEN_NO_SCOPE", "true"),
        "purview_block_on_error": as_bool("PURVIEW_BLOCK_ON_ERROR", "true"),
        # Placeholder until replaced with MSAL / managed identity.
        "graph_access_token_placeholder": os.getenv("GRAPH_ACCESS_TOKEN_PLACEHOLDER", ""),
    }
