using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using backend.DTOs.PersonUnit;
using backend.Models;

namespace backend.Profiles;

public class PersonUnitProfile : Profile
{
    public PersonUnitProfile()
    {
        CreateMap<CreatePersonUnitDto, PersonUnit>();
        CreateMap<PersonUnit, PersonUnitResponseDto>()
            .ForMember(dest => dest.PersonName, opt => opt.MapFrom(src => src.Person.Name))
            .ForMember(dest => dest.UnitNumber, opt => opt.MapFrom(src => src.Unit.Number));
    }
}