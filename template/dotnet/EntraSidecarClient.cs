using System.Net.Http.Headers;
using System.Text.Json;

namespace AgnosticAgentTemplate;

public sealed class EntraSidecarClient
{
    private readonly AppConfig _config;
    private readonly HttpClient _httpClient;

    public EntraSidecarClient(AppConfig config, HttpClient? httpClient = null)
    {
        _config = config;
        _httpClient = httpClient ?? new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
    }

    public async Task<string> GetAuthorizationHeaderAsync(
        string incomingAuthorizationHeader = "")
    {
        var mode = _config.EntraSidecarAuthMode.ToLowerInvariant();
        if (mode is not ("autonomous" or "obo"))
        {
            throw new InvalidOperationException(
                "ENTRA_SIDECAR_AUTH_MODE must be autonomous or obo.");
        }

        var endpoint = mode == "autonomous"
            ? "AuthorizationHeaderUnauthenticated"
            : "AuthorizationHeader";
        var url =
            $"{_config.EntraSidecarUrl.TrimEnd('/')}/{endpoint}/" +
            $"{Uri.EscapeDataString(_config.EntraSidecarServiceName)}" +
            $"?AgentIdentity={Uri.EscapeDataString(_config.EntraAgentClientId)}" +
            $"&optionsOverride.RequestAppToken={(mode == "autonomous" ? "true" : "false")}";

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        if (mode == "obo")
        {
            if (string.IsNullOrWhiteSpace(incomingAuthorizationHeader))
            {
                throw new InvalidOperationException(
                    "The current request authorization header is required in obo mode.");
            }
            request.Headers.TryAddWithoutValidation(
                "Authorization",
                NormalizeAuthorizationHeader(incomingAuthorizationHeader));
        }

        using var response = await _httpClient.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException(
                $"Entra sidecar token request failed: {(int)response.StatusCode}" +
                (string.IsNullOrWhiteSpace(body) ? "" : $" - {body}"));
        }

        using var document = JsonDocument.Parse(body);
        if (!document.RootElement.TryGetProperty("authorizationHeader", out var value))
        {
            throw new InvalidOperationException(
                "The Entra sidecar response did not include authorizationHeader.");
        }
        return NormalizeAuthorizationHeader(value.GetString() ?? "");
    }

    private static string NormalizeAuthorizationHeader(string value)
    {
        var header = value.Trim();
        if (string.IsNullOrEmpty(header))
        {
            throw new InvalidOperationException(
                "The Entra sidecar returned an empty authorizationHeader.");
        }
        return header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
            || header.StartsWith("PoP ", StringComparison.OrdinalIgnoreCase)
            ? header
            : $"Bearer {header}";
    }
}
