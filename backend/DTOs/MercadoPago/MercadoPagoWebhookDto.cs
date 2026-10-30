using System.Text.Json;
using System.Text.Json.Serialization;

namespace backend.DTOs.MercadoPago;

public class MercadoPagoWebhookDto
{
    public string? Action { get; set; }
    public string? Type { get; set; }

    [JsonPropertyName("user_id")]
    public long? UserId { get; set; }

    public MercadoPagoWebhookDataDto? Data { get; set; }
}

public class MercadoPagoWebhookDataDto
{
    public JsonElement Id { get; set; }

    public string? GetId()
    {
        return Id.ValueKind switch
        {
            JsonValueKind.String => Id.GetString(),
            JsonValueKind.Number => Id.GetRawText(),
            _ => null
        };
    }
}
