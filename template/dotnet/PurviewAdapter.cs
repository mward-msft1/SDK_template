namespace AgnosticAgentTemplate;

public sealed class PurviewAdapter
{
    private readonly AppConfig _config;
    private readonly EntraSidecarClient _entraSidecar;

    public PurviewAdapter(AppConfig config)
    {
        _config = config;
        _entraSidecar = new EntraSidecarClient(config);
    }

    public async Task<string> ComputeProtectionScopesAsync(
        string userId,
        string incomingAuthorizationHeader = "")
    {
        _ = await GetGraphAuthorizationHeaderAsync(incomingAuthorizationHeader);
        // TODO: Replace with real Graph call:
        // POST /users/{id}/dataSecurityAndGovernance/protectionScopes/compute
        return $"scopes: evaluate uploadText/downloadText for user {userId}";
    }

    public async Task<string> EvaluateContentAsync(
        string userId,
        string activity,
        string content,
        string contextId,
        string incomingAuthorizationHeader = "")
    {
        _ = await GetGraphAuthorizationHeaderAsync(incomingAuthorizationHeader);
        // TODO: Replace with real Graph call:
        // POST /users/{id}/dataSecurityAndGovernance/activities/contentActivities
        // This placeholder echoes inputs so beginners can trace the flow.
        return $"activity={activity}; userId={userId}; contextId={contextId}; content={content}";
    }

    public Decision GetEnforcementDecision(string resultPayload)
    {
        return new Decision
        {
            Block = resultPayload.Contains("block", StringComparison.OrdinalIgnoreCase),
            Raw = resultPayload
        };
    }

    private async Task<string> GetGraphAuthorizationHeaderAsync(
        string incomingAuthorizationHeader)
    {
        if (_config.EntraSidecarEnabled)
        {
            return await _entraSidecar.GetAuthorizationHeaderAsync(
                incomingAuthorizationHeader);
        }

        var token = _config.GraphAccessTokenPlaceholder.Trim();
        if (string.IsNullOrWhiteSpace(token))
        {
            throw new InvalidOperationException(
                "Enable the Entra sidecar or set GRAPH_ACCESS_TOKEN_PLACEHOLDER.");
        }
        return token.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
            ? token
            : $"Bearer {token}";
    }
}
