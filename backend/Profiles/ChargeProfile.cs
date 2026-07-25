using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using backend.DTOs.Charge;
using backend.Enums;
using backend.Models;

namespace backend.Profiles;

public class ChargeProfile : Profile
{
    public ChargeProfile()
    {
        CreateMap<CreateChargeDto, Charge>();
        CreateMap<Charge, ChargeResponseDto>()
            .ForMember(
                dest => dest.CondominiumName,
                opt => opt.MapFrom(src => src.Condominium.Name))
            .ForMember(
                dest => dest.UnitNumber,
                opt => opt.MapFrom(src => src.Unit != null ? src.Unit.Number : null))
            .ForMember(
                dest => dest.BuildingName,
                opt => opt.MapFrom(src => src.Unit != null ? src.Unit.Building.Name : null))
            .ForMember(
                dest => dest.Status,
                opt => opt.MapFrom(src =>
                    src.Status == ChargeStatus.Pending && src.DueDate.Date < DateTime.UtcNow.Date
                        ? ChargeStatus.Overdue
                        : src.Status));
    }
}
