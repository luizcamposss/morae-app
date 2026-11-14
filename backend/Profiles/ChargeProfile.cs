using backend.Constants;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using backend.DTOs.Charge;
using backend.Enums;
using backend.Models;
using backend.Services.Charges;

namespace backend.Profiles;

public class ChargeProfile : Profile
{
    public ChargeProfile()
    {
        CreateMap<CreateChargeDto, Charge>()
            .ForMember(dest => dest.Category, opt => opt.MapFrom(src => src.Category ?? ChargeCategory.Other));
        CreateMap<ChargeItem, ChargeItemDto>();

        CreateMap<Charge, ChargeResponseDto>()
            .ForMember(
                dest => dest.Items,
                opt => opt.MapFrom(src => src.Items.OrderBy(item => item.Id)))
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
                dest => dest.RecipientName,
                opt => opt.MapFrom(src => src.RecipientPerson != null ? src.RecipientPerson.Name : null))
            .ForMember(
                dest => dest.Status,
                opt => opt.MapFrom(src =>
                    src.Status == ChargeStatus.Pending && src.DueDate.Date < AppTimeZone.Today
                        ? ChargeStatus.Overdue
                        : src.Status))
            .AfterMap((src, dest) =>
            {
                var lateFees = ChargeLateFees.Calculate(src, AppTimeZone.Today);
                dest.DaysLate = lateFees.DaysLate;
                dest.FineAmount = lateFees.Fine;
                dest.InterestAmount = lateFees.Interest;
                dest.UpdatedAmount = lateFees.Total;
            });

        CreateMap<RecurringCharge, RecurringChargeResponseDto>()
            .ForMember(
                dest => dest.BuildingName,
                opt => opt.MapFrom(src => src.Building != null ? src.Building.Name : null))
            .ForMember(
                dest => dest.UnitNumber,
                opt => opt.MapFrom(src => src.Unit != null ? src.Unit.Number : null))
            .ForMember(
                dest => dest.RecipientName,
                opt => opt.MapFrom(src => src.RecipientPerson != null ? src.RecipientPerson.Name : null))
            .ForMember(
                dest => dest.EffectiveDueDay,
                opt => opt.MapFrom(src => src.DueDay ?? src.Condominium.BillingDueDay))
            .ForMember(dest => dest.Generation, opt => opt.Ignore());

        CreateMap<RecurringChargeUnitValue, RecurringChargeUnitValueDto>()
            .ForMember(dest => dest.UnitNumber, opt => opt.MapFrom(src => src.Unit.Number));
    }
}
