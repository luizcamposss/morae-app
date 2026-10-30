using System.Text.Json.Serialization;

namespace backend.DTOs.MercadoPago;

// Mirrors the formData the Mercado Pago Payment Brick sends in onSubmit. The amount is
// deliberately absent: the charge value always comes from the database.
public class MercadoPagoCreatePaymentDto
{
    [JsonPropertyName("payment_method_id")]
    public string PaymentMethodId { get; set; } = string.Empty;

    [JsonPropertyName("token")]
    public string? Token { get; set; }

    [JsonPropertyName("issuer_id")]
    public string? IssuerId { get; set; }

    [JsonPropertyName("payer")]
    public MercadoPagoPayerDto? Payer { get; set; }
}

public class MercadoPagoPayerDto
{
    [JsonPropertyName("email")]
    public string? Email { get; set; }

    [JsonPropertyName("first_name")]
    public string? FirstName { get; set; }

    [JsonPropertyName("last_name")]
    public string? LastName { get; set; }

    [JsonPropertyName("identification")]
    public MercadoPagoIdentificationDto? Identification { get; set; }

    [JsonPropertyName("address")]
    public MercadoPagoPayerAddressDto? Address { get; set; }
}

public class MercadoPagoIdentificationDto
{
    [JsonPropertyName("type")]
    public string? Type { get; set; }

    [JsonPropertyName("number")]
    public string? Number { get; set; }
}

public class MercadoPagoPayerAddressDto
{
    [JsonPropertyName("zip_code")]
    public string? ZipCode { get; set; }

    [JsonPropertyName("street_name")]
    public string? StreetName { get; set; }

    [JsonPropertyName("street_number")]
    public string? StreetNumber { get; set; }

    [JsonPropertyName("neighborhood")]
    public string? Neighborhood { get; set; }

    [JsonPropertyName("city")]
    public string? City { get; set; }

    [JsonPropertyName("federal_unit")]
    public string? FederalUnit { get; set; }
}
