using AutoMapper;
using backend.DTOs.FinancialAccount;
using backend.Models;

namespace backend.Profiles;

public class FinancialAccountProfile : Profile
{
    public FinancialAccountProfile()
    {
        CreateMap<FinancialAccount, FinancialAccountResponseDto>()
            .ForMember(
                dest => dest.CondominiumName,
                opt => opt.MapFrom(src => src.Condominium != null ? src.Condominium.Name : null));
    }
}
