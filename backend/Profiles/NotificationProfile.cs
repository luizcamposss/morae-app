using AutoMapper;
using backend.DTOs.Notification;
using backend.Models;

namespace backend.Profiles;

public class NotificationProfile : Profile
{
    public NotificationProfile()
    {
        CreateMap<Notification, NotificationResponseDto>()
            .ForMember(dest => dest.Type, opt => opt.MapFrom(src => src.Type.ToString()))
            .ForMember(dest => dest.IsRead, opt => opt.MapFrom(src => src.ReadAt != null));
    }
}
