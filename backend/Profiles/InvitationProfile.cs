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
                opt => opt.MapFrom(src => src.Person.Name));
    }
}