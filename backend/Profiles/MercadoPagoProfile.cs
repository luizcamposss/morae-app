using AutoMapper;
using backend.DTOs.MercadoPago;
using backend.Models;

namespace backend.Profiles;

public class MercadoPagoProfile : Profile
{
    public MercadoPagoProfile() 
    {
        CreateMap<MercadoPagoAccount, MercadoPagoConnectionStatusDto>()
            .ForMember(dest => dest.IsConnected, opt => opt.MapFrom(_ => true));
    }
}