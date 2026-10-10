using backend.DTOs.Visit;
using backend.Enums;

namespace backend.Services.Visits;

public interface IVisitService
{
    Task<VisitResponseDto> CreateAsync(int userId, int condominiumId, SaveVisitDto dto);
    Task<IEnumerable<VisitResponseDto>> GetMineAsync(int userId, int condominiumId, bool includePast);
    Task<IEnumerable<VisitResponseDto>> GetAgendaAsync(
        int userId, int condominiumId, DateOnly? from, DateOnly? to,
        int? unitId, int? buildingId, VisitorType? visitorType, bool includeCanceled);
    Task<VisitResponseDto> UpdateAsync(int userId, int visitId, SaveVisitDto dto);
    Task<VisitResponseDto> CancelAsync(int userId, int visitId);
}
