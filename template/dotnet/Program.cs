using System.Text.Json;

namespace AgnosticAgentTemplate;

public static class Program
{
    public static async Task<int> Main()
    {
        try
        {
            var config = AppConfig.Load();
            var agent365 = new Agent365Adapter(config);
            var purview = new PurviewAdapter(config);
            var middleware = AgentMiddlewareTemplate.CreateGovernedMiddleware(purview, agent365, config);

            ModelResult result = config.HostSdk.Equals("m365-agents-sdk", StringComparison.OrdinalIgnoreCase)
                ? await HostAdapters.RunWithM365AgentsSdkAsync(middleware, config.DefaultUserId)
                : await HostAdapters.RunWithAgentFrameworkAsync(middleware, config.DefaultUserId);

            Console.WriteLine(JsonSerializer.Serialize(result, new JsonSerializerOptions
            {
                WriteIndented = true
            }));
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }
}
