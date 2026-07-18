using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using backend.DTOs.Invitation;

namespace backend.Profiles;

public class InvitationProfile : Profile
{
    public InvitationProfile()
    {
        CreateMap<CreateInvitationDto, Invitation>();

        CreateMap<Invitation, InvitationResponseDto>()
            .ForMember(
                dest => dest.PersonName,
                opt => opt.MapFrom(src => src.Person.Name))
            .ForMember(
                dest => dest.CondominiumName,
                opt => opt.MapFrom(src => src.Condominium.Name))
            .ForMember(
                dest => dest.RoleName,
                opt => opt.MapFrom(src => src.Role.ToString()))
            .ForMember(
                dest => dest.StatusName,
                opt => opt.MapFrom(src => src.InvitationStatus.ToString()));
    }
}
