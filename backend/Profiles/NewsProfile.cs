using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using backend.DTOs.News;
using backend.Models;

namespace backend.Profiles;

public class NewsProfile : Profile
{
    public NewsProfile()
    {
        CreateMap<CreateNewsDto, News>();
        CreateMap<UpdateNewsDto, News>();
        CreateMap<News, NewsResponseDto>();
    }
}