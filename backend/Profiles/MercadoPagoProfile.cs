using AutoMapper;
using backend.DTOs.MercadoPago;
using backend.Models;

namespace backend.Profiles;

public class MercadoPagoProfile : Profile
{
    public MercadoPagoProfile() 
    {
        // Timestamps are stored in UTC but read back without a kind; marking them as UTC makes
        // the JSON carry the offset, so the browser shows them in the viewer's local time.
        CreateMap<MercadoPagoAccount, MercadoPagoConnectionStatusDto>()
            .ForMember(dest => dest.IsConnected, opt => opt.MapFrom(src => src.AccessToken != string.Empty))
            .ForMember(dest => dest.ExpiresAt, opt => opt.MapFrom(src => DateTime.SpecifyKind(src.ExpiresAt, DateTimeKind.Utc)))
            .ForMember(dest => dest.ConnectedAt, opt => opt.MapFrom(src => DateTime.SpecifyKind(src.ConnectedAt, DateTimeKind.Utc)))
            .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(src => DateTime.SpecifyKind(src.UpdatedAt, DateTimeKind.Utc)));
    }
}
