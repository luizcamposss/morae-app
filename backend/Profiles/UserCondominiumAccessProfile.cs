using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using backend.DTOs.UserCondominiumAccess;
using backend.Models;

namespace backend.Profiles;

public class UserCondominiumAccessProfile : Profile
{
    public UserCondominiumAccessProfile()
    {
        CreateMap<UserCondominium, UserCondominiumAccessResponseDto>();
    }
}