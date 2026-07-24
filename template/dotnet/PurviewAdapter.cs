namespace AgnosticAgentTemplate;

public sealed class PurviewAdapter
{
    private readonly AppConfig _config;

    public PurviewAdapter(AppConfig config)
    {
        _config = config;
    }

    public Task<string> ComputeProtectionScopesAsync(string userId)
    {
        EnsureGraphToken();
        // TODO: Replace with real Graph call:
        // POST /users/{id}/dataSecurityAndGovernance/protectionScopes/compute
        return Task.FromResult($"scopes: evaluate uploadText/downloadText for user {userId}");
    }

    public Task<string> EvaluateContentAsync(string userId, string activity, string content, string contextId)
    {
        EnsureGraphToken();
        // TODO: Replace with real Graph call:
        // POST /users/{id}/dataSecurityAndGovernance/activities/contentActivities
        // This placeholder echoes inputs so beginners can trace the flow.
        return Task.FromResult($"activity={activity}; userId={userId}; contextId={contextId}; content={content}");
    }

    public Decision GetEnforcementDecision(string resultPayload)
    {
        return new Decision
        {
            Block = resultPayload.Contains("block", StringComparison.OrdinalIgnoreCase),
            Raw = resultPayload
        };
    }

    private void EnsureGraphToken()
    {
        if (string.IsNullOrWhiteSpace(_config.GraphAccessTokenPlaceholder))
        {
            throw new InvalidOperationException(
                "Missing GRAPH_ACCESS_TOKEN_PLACEHOLDER. Replace token acquisition TODO in PurviewAdapter.");
        }
    }
}
