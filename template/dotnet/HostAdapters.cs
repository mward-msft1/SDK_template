namespace AgnosticAgentTemplate;

public static class HostAdapters
{
    public static Task<ModelResult> RunWithAgentFrameworkAsync(
        Func<TurnContext, Func<TurnContext, Task<ModelResult>>, Task<ModelResult>> middleware,
        string defaultUserId)
    {
        // TODO: Replace with your real Agent Framework turn/context objects.
        var context = new TurnContext
        {
            TurnId = "replace-with-runtime-turn-id",
            UserId = defaultUserId,
            InputText = "Hello from Agent Framework host",
            AuthorizationHeader = ""
        };

        // TODO: Replace with your real model/agent invoke function.
        return middleware(context, _ =>
            Task.FromResult(new ModelResult
            {
                OutputText = "Agent Framework model output placeholder"
            }));
    }

    public static Task<ModelResult> RunWithM365AgentsSdkAsync(
        Func<TurnContext, Func<TurnContext, Task<ModelResult>>, Task<ModelResult>> middleware,
        string defaultUserId)
    {
        // TODO: Replace with your real Microsoft 365 Agents SDK activity handler.
        var context = new TurnContext
        {
            TurnId = "replace-with-activity-id",
            UserId = defaultUserId,
            InputText = "Hello from Microsoft 365 Agents SDK host",
            AuthorizationHeader = "replace-with-current-request-authorization-header"
        };

        // TODO: Replace with your AI invocation (OpenAI/Azure OpenAI/other).
        return middleware(context, _ =>
            Task.FromResult(new ModelResult
            {
                OutputText = "Microsoft 365 Agents SDK model output placeholder"
            }));
    }
}
