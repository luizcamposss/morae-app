using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using backend.DTOs.Charge;
using backend.Models;

namespace backend.Profiles;

public class ChargeProfile : Profile
{
    public ChargeProfile()
    {
        CreateMap<CreateChargeDto, Charge>();
        CreateMap<Charge, ChargeResponseDto>();
    }
}