using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using backend.DTOs.Person;
using backend.Models;

namespace backend.Profiles;

public class PersonProfile : Profile
{
    public PersonProfile()
    {
        CreateMap<CreatePersonDto, Person>();
        CreateMap<UpdatePersonDto, Person>();
        CreateMap<Person, PersonResponseDto>();
    }
}