using AutoMapper;
using backend.DTOs.LandingContact;
using backend.Models;
using backend.Services.LandingContacts;

namespace backend.Profiles;

public class LandingContactProfile : Profile
{
    public LandingContactProfile()
    {
        CreateMap<LandingContact, LandingContactResponseDto>()
            .ForMember(dest => dest.PainLabel, opt => opt.MapFrom(src => LandingContactTexts.PainLabel(src.Pain)))
            .ForMember(dest => dest.WhatsAppUrl, opt => opt.MapFrom(src =>
                LandingContactTexts.BuildWhatsAppUrl(src.WhatsApp, src.Name, src.Pain)));
    }
}
