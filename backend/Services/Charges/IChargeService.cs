using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.DTOs.Charge;

namespace backend.Services.Charges;

public interface IChargeService
{
    Task<ChargeResponseDto> CreateAsync(int userId, CreateChargeDto dto);
    Task<IEnumerable<ChargeResponseDto>> GetPlatformAsync(int userId);
    Task<IEnumerable<ChargeResponseDto>> GetByCondominiumAsync(int userId, int condominiumId);
    Task<IEnumerable<ChargeResponseDto>> GetMineAsync(int userId);
    Task<ChargeResponseDto?> GetByIdAsync(int userId, int id);
    Task<bool> CancelAsync(int userId, int id, CancelChargeDto dto);

    // Throws when the condominium has neither a Pix key nor a connected Mercado Pago account.
    Task EnsureCondominiumPaymentMethodAsync(int condominiumId);

    // The condominium's fine/interest rule to copy onto a new charge. (null, null) = rule off.
    Task<(decimal? FinePercent, decimal? MonthlyInterestPercent)> GetLateFeeRuleAsync(int condominiumId);

    Task<ChargeBatchResultDto> CreateBatchAsync(int userId, int condominiumId, CreateChargeBatchDto dto);

    // Creates one charge per unit with someone linked to it. No access check: callers check it.
    Task<ChargeBatchResultDto> GenerateForUnitsAsync(ChargeGenerationRequest request);

    // Validates the units and values of a batch/recurrence before anything is created.
    Task EnsureBatchTargetValidAsync(
        int userId,
        int condominiumId,
        int? buildingId,
        IEnumerable<ChargeUnitValueDto> unitValues);
}

public record ChargeGenerationRequest(
    int CondominiumId,
    int? BuildingId,
    IReadOnlyCollection<int>? AllowedBuildingIds,
    decimal Value,
    IReadOnlyDictionary<int, decimal> UnitValues,
    DateTime DueDate,
    string Description,
    int CreatedByUserId,
    int? RecurringChargeId = null,
    DateOnly? ReferenceMonth = null);
