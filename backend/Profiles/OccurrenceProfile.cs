using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using backend.DTOs.Occurrence;
using backend.Models;

namespace backend.Profiles;

public class OccurrenceProfile : Profile
{
    public OccurrenceProfile()
    {
        CreateMap<CreateOccurrenceDto, Occurrence>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedByUserId, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedByUser, opt => opt.Ignore())
            .ForMember(dest => dest.Condominium, opt => opt.Ignore())
            .ForMember(dest => dest.Unit, opt => opt.Ignore())
            .ForMember(dest => dest.Status, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.ResolvedAt, opt => opt.Ignore())
            .ForMember(dest => dest.ManagementResponse, opt => opt.Ignore())
            .ForMember(dest => dest.RespondedAt, opt => opt.Ignore())
            .ForMember(dest => dest.RespondedByUserId, opt => opt.Ignore())
            .ForMember(dest => dest.RespondedByUser, opt => opt.Ignore())
            .ForMember(dest => dest.Photos, opt => opt.Ignore());

        CreateMap<OccurrencePhoto, OccurrencePhotoDto>();

        // Navigation names come from the includes in OccurrenceService.
        CreateMap<Occurrence, OccurrenceResponseDto>()
            .ForMember(dest => dest.BuildingId, opt => opt.MapFrom(src => src.Unit.BuildingId))
            .ForMember(dest => dest.BuildingName, opt => opt.MapFrom(src => src.Unit.Building.Name))
            .ForMember(dest => dest.UnitNumber, opt => opt.MapFrom(src => src.Unit.Number))
            .ForMember(dest => dest.CreatedByName, opt => opt.MapFrom(src => src.CreatedByUser.Person.Name))
            .ForMember(dest => dest.RespondedByName, opt => opt.MapFrom(src =>
                src.RespondedByUser == null ? null : src.RespondedByUser.Person.Name))
            .ForMember(dest => dest.Photos, opt => opt.MapFrom(src => src.Photos.OrderBy(photo => photo.Id)));
    }
}