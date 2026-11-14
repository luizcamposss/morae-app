using backend.DTOs.Reservation;
using backend.Enums;

namespace backend.Services.Reservations;

public interface IReservationService
{
    Task<CommonAreaAvailabilityDto> GetAvailabilityAsync(int userId, int areaId, string? month, int? unitId);
    Task<ReservationResponseDto> CreateAsync(int userId, int condominiumId, CreateReservationDto dto);
    Task<IEnumerable<ReservationResponseDto>> GetMineAsync(int userId, int condominiumId, bool includePast);
    Task<IEnumerable<ReservationResponseDto>> GetForManagementAsync(
        int userId, int condominiumId, DateOnly? from, DateOnly? to, ReservationStatus? status, int? commonAreaId);
    Task<ReservationResponseDto> ApproveAsync(int userId, int reservationId);
    Task<ReservationResponseDto> RejectAsync(int userId, int reservationId, RejectReservationDto dto);
    Task<ReservationResponseDto> CancelAsync(int userId, int reservationId, CancelReservationDto dto);
}
