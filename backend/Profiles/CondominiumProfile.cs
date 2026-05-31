using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using backend.DTOs.Condominium;
using backend.Models;

namespace backend.Profiles;

public class CondominiumProfile : Profile
{
    public CondominiumProfile()
    {
        CreateMap<CreateCondominiumDto, Condominium>();
        CreateMap<UpdateCondominiumDto, Condominium>();
        CreateMap<Condominium, CondominiumResponseDto>();
    }
}