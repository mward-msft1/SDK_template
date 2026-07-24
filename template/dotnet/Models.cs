namespace AgnosticAgentTemplate;

public sealed class TurnContext
{
    public string TurnId { get; set; } = "";
    public string UserId { get; set; } = "";
    public string InputText { get; set; } = "";
}

public sealed class ModelResult
{
    public bool Blocked { get; set; }
    public string Reason { get; set; } = "";
    public string OutputText { get; set; } = "";
}

public sealed class Decision
{
    public bool Block { get; set; }
    public string Raw { get; set; } = "";
}
