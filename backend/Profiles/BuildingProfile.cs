using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using backend.DTOs.Building;
using backend.Models;

namespace backend.Profiles;

public class BuildingProfile : Profile
{
    public BuildingProfile()
    {
        CreateMap<CreateBuildingDto, Building>();
        CreateMap<UpdateBuildingDto, Building>();
        CreateMap<Building, BuildingResponseDto>();
    }
}