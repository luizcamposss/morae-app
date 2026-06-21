using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using backend.DTOs.Payment;
using backend.Models;

namespace backend.Profiles;

public class PaymentProfile : Profile
{
    public PaymentProfile()
    {
        CreateMap<CreateManualPaymentDto, Payment>()
            .ForMember(dest => dest.PaidAt, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.ChargeId, opt => opt.Ignore())
            .ForMember(dest => dest.Charge, opt => opt.Ignore())
            .ForMember(dest => dest.RegisteredByUserId, opt => opt.Ignore())
            .ForMember(dest => dest.RegisteredByUser, opt => opt.Ignore());

        CreateMap<Payment, PaymentResponseDto>();
    }
}