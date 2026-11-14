using backend.DTOs.Reservation;

namespace backend.Services.Reservations;

public interface ICommonAreaService
{
    Task<IEnumerable<CommonAreaResponseDto>> GetForManagementAsync(int userId, int condominiumId);
    Task<IEnumerable<CommonAreaResponseDto>> GetBookableAsync(int userId, int condominiumId);
    Task<CommonAreaResponseDto> CreateAsync(int userId, int condominiumId, SaveCommonAreaDto dto);
    Task<CommonAreaResponseDto> UpdateAsync(int userId, int areaId, SaveCommonAreaDto dto);
    Task DeleteAsync(int userId, int areaId);
    Task<CommonAreaResponseDto> UploadPhotoAsync(int userId, int areaId, IFormFile? file);
    Task<CommonAreaResponseDto> DeletePhotoAsync(int userId, int areaId);
    Task<CommonAreaPhotoDownload> DownloadPhotoAsync(int userId, int areaId);
}
