namespace AgnosticAgentTemplate;

public sealed class AppConfig
{
    public string TenantId { get; init; } = "";
    public string EntraClientId { get; init; } = "";
    public string EntraClientSecret { get; init; } = "";
    public bool EntraSidecarEnabled { get; init; }
    public string EntraSidecarUrl { get; init; } = "";
    public string EntraSidecarServiceName { get; init; } = "";
    public string EntraSidecarAuthMode { get; init; } = "";
    public string EntraAgentClientId { get; init; } = "";
    public string DefaultUserId { get; init; } = "";
    public string AgentName { get; init; } = "";
    public string HostSdk { get; init; } = "";

    public string M365AgentsBotAppId { get; init; } = "";
    public string M365AgentsBotAppPassword { get; init; } = "";
    public string M365AgentsTenantId { get; init; } = "";

    public string Agent365AppId { get; init; } = "";
    public string Agent365AppSecret { get; init; } = "";
    public string Agent365TenantId { get; init; } = "";
    public string Agent365ReportingEndpoint { get; init; } = "";

    public string PurviewGraphBaseUrl { get; init; } = "";
    public string PurviewAppLocationId { get; init; } = "";
    public string PurviewActivityTypes { get; init; } = "";
    public bool PurviewEnableAuditWhenNoScope { get; init; }
    public bool PurviewBlockOnError { get; init; }

    public string GraphAccessTokenPlaceholder { get; init; } = "";

    public static AppConfig Load()
    {
        static string Required(string name) =>
            Environment.GetEnvironmentVariable(name) switch
            {
                { Length: > 0 } value => value,
                _ => throw new InvalidOperationException($"Missing required environment variable: {name}")
            };

        static string Optional(string name, string fallback) =>
            Environment.GetEnvironmentVariable(name) is { Length: > 0 } value ? value : fallback;

        static bool AsBool(string name, string fallback) =>
            string.Equals(Optional(name, fallback), "true", StringComparison.OrdinalIgnoreCase);

        var sidecarEnabled = AsBool("ENTRA_SIDECAR_ENABLED", "true");
        return new AppConfig
        {
            TenantId = Required("TENANT_ID"),
            EntraClientId = Required("ENTRA_CLIENT_ID"),
            EntraClientSecret = Required("ENTRA_CLIENT_SECRET"),
            EntraSidecarEnabled = sidecarEnabled,
            EntraSidecarUrl = Optional("ENTRA_SIDECAR_URL", "http://localhost:5000"),
            EntraSidecarServiceName = Optional("ENTRA_SIDECAR_SERVICE_NAME", "Graph"),
            EntraSidecarAuthMode = Optional("ENTRA_SIDECAR_AUTH_MODE", "autonomous"),
            EntraAgentClientId = sidecarEnabled
                ? Required("AGENT_CLIENT_ID")
                : Optional("AGENT_CLIENT_ID", ""),
            DefaultUserId = Optional("DEFAULT_USER_ID", ""),
            AgentName = Optional("AGENT_NAME", "ContosoAgnosticAgent"),
            HostSdk = Optional("HOST_SDK", "agent-framework"),

            M365AgentsBotAppId = Required("M365_AGENTS_BOT_APP_ID"),
            M365AgentsBotAppPassword = Required("M365_AGENTS_BOT_APP_PASSWORD"),
            M365AgentsTenantId = Required("M365_AGENTS_TENANT_ID"),

            Agent365AppId = Required("AGENT365_APP_ID"),
            Agent365AppSecret = Required("AGENT365_APP_SECRET"),
            Agent365TenantId = Required("AGENT365_TENANT_ID"),
            Agent365ReportingEndpoint = Required("AGENT365_REPORTING_ENDPOINT"),

            PurviewGraphBaseUrl = Optional("PURVIEW_GRAPH_BASE_URL", "https://graph.microsoft.com/v1.0"),
            PurviewAppLocationId = Required("PURVIEW_APP_LOCATION_ID"),
            PurviewActivityTypes = Optional("PURVIEW_ACTIVITY_TYPES", "uploadText,downloadText"),
            PurviewEnableAuditWhenNoScope = AsBool("PURVIEW_ENABLE_AUDIT_WHEN_NO_SCOPE", "true"),
            PurviewBlockOnError = AsBool("PURVIEW_BLOCK_ON_ERROR", "true"),

            GraphAccessTokenPlaceholder = Optional("GRAPH_ACCESS_TOKEN_PLACEHOLDER", "")
        };
    }
}
