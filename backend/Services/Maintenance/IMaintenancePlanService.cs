using backend.DTOs.Maintenance;
using backend.Enums;

namespace backend.Services.Maintenance;

public interface IMaintenancePlanService
{
    Task<MaintenancePlanResponseDto> CreateAsync(int userId, int condominiumId, SaveMaintenancePlanDto dto);
    Task<IEnumerable<MaintenancePlanResponseDto>> GetByCondominiumAsync(
        int userId, int condominiumId, MaintenanceStatus? status, int? buildingId);
    Task<MaintenancePlanResponseDto> GetByIdAsync(int userId, int planId);
    Task<MaintenancePlanResponseDto> UpdateAsync(int userId, int planId, SaveMaintenancePlanDto dto);
    Task DeleteAsync(int userId, int planId);

    Task<MaintenanceRecordResponseDto> CreateRecordAsync(int userId, int planId, CreateMaintenanceRecordDto dto);
    Task<IEnumerable<MaintenanceRecordResponseDto>> GetRecordsAsync(int userId, int planId);
    Task<MaintenanceAttachmentDownload> DownloadAttachmentAsync(int userId, int recordId);
    Task DeleteRecordAsync(int userId, int recordId);
}
