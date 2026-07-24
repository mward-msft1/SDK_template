namespace AgnosticAgentTemplate;

public sealed class Agent365Adapter
{
    private readonly AppConfig _config;

    public Agent365Adapter(AppConfig config)
    {
        _config = config;
        // TODO: Initialize the real Agent365 SDK client with tenant/app credentials.
    }

    public Task ReportTurnStartAsync(TurnContext context)
    {
        // TODO: Map this to Agent365 telemetry/reporting API.
        Console.WriteLine($"[Agent365] Turn started: {context.TurnId}");
        return Task.CompletedTask;
    }

    public Task ReportPurviewDecisionAsync(TurnContext context, string stage, Decision decision)
    {
        // TODO: Map this to Agent365 telemetry/reporting API.
        Console.WriteLine($"[Agent365] Stage={stage}, Turn={context.TurnId}, Block={decision.Block}");
        return Task.CompletedTask;
    }

    public Task ReportTurnEndAsync(TurnContext context, ModelResult result)
    {
        // TODO: Map this to Agent365 telemetry/reporting API.
        Console.WriteLine($"[Agent365] Turn ended: {context.TurnId}, Blocked={result.Blocked}");
        return Task.CompletedTask;
    }
}
