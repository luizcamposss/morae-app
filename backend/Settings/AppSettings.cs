namespace backend.Settings;

public class AppSettings
{
    public string FrontendUrl { get; set; } = "http://localhost:5173";

    public string BuildFrontendUrl(string pathAndQuery)
    {
        return $"{FrontendUrl.TrimEnd('/')}/{pathAndQuery.TrimStart('/')}";
    }
}
