using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using backend.DTOs.Building;
using backend.DTOs.Unit;
using backend.Models;

namespace backend.Profiles;

public class UnitProfile : Profile
{
    public UnitProfile()
    {
        CreateMap<CreateUnitDto, Unit>();
        CreateMap<UpdateUnitDto, Unit>();
        CreateMap<Unit, UnitResponseDto>();
    }
}