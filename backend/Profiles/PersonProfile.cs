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
        // Phone is stored as an empty string when missing; a blank e-mail is stored as null.
        CreateMap<CreatePersonDto, Person>()
            .ForMember(person => person.PhoneNumber, options => options.MapFrom(dto => dto.PhoneNumber ?? string.Empty))
            .ForMember(person => person.Email, options => options.MapFrom(dto => string.IsNullOrWhiteSpace(dto.Email) ? null : dto.Email.Trim()));
        CreateMap<UpdatePersonDto, Person>()
            .ForMember(person => person.PhoneNumber, options => options.MapFrom(dto => dto.PhoneNumber ?? string.Empty))
            .ForMember(person => person.Email, options => options.MapFrom(dto => string.IsNullOrWhiteSpace(dto.Email) ? null : dto.Email.Trim()));
        CreateMap<Person, PersonResponseDto>();
    }
}