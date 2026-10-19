using AutoMapper;
using backend.DTOs.FinancialAccount;
using backend.Models;
using backend.Services.Validation;

namespace backend.Profiles;

public class FinancialAccountProfile : Profile
{
    public FinancialAccountProfile()
    {
        CreateMap<FinancialAccount, FinancialAccountResponseDto>()
            .ForMember(
                dest => dest.CondominiumName,
                opt => opt.MapFrom(src => src.Condominium != null ? src.Condominium.Name : null))
            .ForMember(
                dest => dest.PixKeyType,
                opt => opt.MapFrom(src => PixKeyValidator.ResolveType(src.PixKeyType, src.PixKey)));
    }
}
