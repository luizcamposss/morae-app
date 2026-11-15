using System.Globalization;
using backend.Constants;
using backend.Data;
using backend.DTOs.Reservation;
using backend.Enums;
using backend.Exceptions;
using backend.Models;
using backend.Services.Charges;
using backend.Services.MercadoPago;
using backend.Services.Notifications;
using backend.Services.Permissions;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Reservations;

// Reservations of common areas. A unit's person books a free slot inside the area's rules; areas
// that require approval wait for the management (Admin, or syndic with "reservations.manage").
// The fee becomes a charge of the unit (category Reservation) once the reservation is approved,
// and is canceled with the reservation while unpaid (by the resident, only up to the deadline).
public class ReservationService : IReservationService
{
    private const int MaxListDays = 366;

    private readonly AppDbContext _context;
    private readonly IPermissionService _permissionService;
    private readonly IChargeService _chargeService;
    private readonly IMercadoPagoService _mercadoPagoService;
    private readonly INotificationService _notificationService;

    public ReservationService(
        AppDbContext context,
        IPermissionService permissionService,
        IChargeService chargeService,
        IMercadoPagoService mercadoPagoService,
        INotificationService notificationService)
    {
        _context = context;
        _permissionService = permissionService;
        _chargeService = chargeService;
        _mercadoPagoService = mercadoPagoService;
        _notificationService = notificationService;
    }

    public async Task<CommonAreaAvailabilityDto> GetAvailabilityAsync(int userId, int areaId, string? month, int? unitId)
    {
        var area = await _context.CommonAreas
            .AsNoTracking()
            .Include(item => item.Shifts.Where(shift => shift.IsActive))
            .FirstOrDefaultAsync(item => item.Id == areaId)
            ?? throw new NotFoundException("Área não encontrada.");

        await _permissionService.EnsureCondominiumAccessAsync(userId, area.CondominiumId);

        await _permissionService.EnsureModuleEnabledAsync(area.CondominiumId, AppModules.Reservations);

        var unit = await GetBookingUnitAsync(userId, area, unitId);
        var today = ReservationRules.Today();
        var first = ParseMonth(month) ?? new DateOnly(today.Year, today.Month, 1);
        var last = first.AddMonths(1).AddDays(-1);
        var windowStart = today.AddDays(area.MinAdvanceDays);
        var windowEnd = today.AddDays(area.MaxAdvanceDays);

        var taken = await _context.Reservations
            .AsNoTracking()
            .Where(reservation =>
                reservation.CommonAreaId == area.Id &&
                reservation.SlotKey != null &&
                reservation.Date >= first &&
                reservation.Date <= last)
            .Select(reservation => new { reservation.SlotKey, reservation.UnitId })
            .ToListAsync();

        var takenBy = taken.ToDictionary(item => item.SlotKey!, item => item.UnitId);
        var myUnitIds = (await ReservationRules.GetUserUnitsAsync(_context, userId, area.CondominiumId))
            .Select(item => item.UnitId)
            .ToHashSet();

        var slots = GetSlots(area);
        var result = new CommonAreaAvailabilityDto
        {
            CommonAreaId = area.Id,
            UnitId = unit.UnitId,
            FirstBookableDate = windowStart,
            LastBookableDate = windowEnd,
            MonthlyLimitPerUnit = area.MonthlyLimitPerUnit,
            UsedInMonth = taken.Count(item => item.UnitId == unit.UnitId)
        };

        for (var day = first; day <= last; day = day.AddDays(1))
        {
            result.Days.Add(new AvailabilityDayDto
            {
                Date = day,
                InWindow = day >= windowStart && day <= windowEnd,
                Slots = slots.Select(slot =>
                {
                    var isTaken = takenBy.TryGetValue(ReservationRules.SlotKey(day, slot.ShiftId), out var takenUnitId);

                    return new AvailabilitySlotDto
                    {
                        ShiftId = slot.ShiftId,
                        Name = slot.Name,
                        StartTime = slot.StartTime,
                        EndTime = slot.EndTime,
                        IsFree = !isTaken,
                        IsMine = isTaken && myUnitIds.Contains(takenUnitId)
                    };
                }).ToList()
            });
        }

        return result;
    }

    public async Task<ReservationResponseDto> CreateAsync(int userId, int condominiumId, CreateReservationDto dto)
    {
        await _permissionService.EnsureCondominiumAccessAsync(userId, condominiumId);
        await _permissionService.EnsureModuleEnabledAsync(condominiumId, AppModules.Reservations);

        var area = await _context.CommonAreas
            .Include(item => item.Shifts.Where(shift => shift.IsActive))
            .FirstOrDefaultAsync(item => item.Id == dto.CommonAreaId && item.CondominiumId == condominiumId)
            ?? throw new NotFoundException("Área não encontrada.");

        var unit = await GetBookingUnitAsync(userId, area, dto.UnitId);

        if (dto.Date is null)
            throw new BadRequestException("Escolha a data da reserva.");

        var date = dto.Date.Value;
        var today = ReservationRules.Today();

        if (date < today.AddDays(area.MinAdvanceDays))
        {
            throw new BadRequestException(area.MinAdvanceDays == 0
                ? "A data da reserva não pode ser no passado."
                : $"Esta área precisa ser reservada com pelo menos {area.MinAdvanceDays} dia(s) de antecedência.");
        }

        if (date > today.AddDays(area.MaxAdvanceDays))
            throw new BadRequestException($"Esta área pode ser reservada com até {area.MaxAdvanceDays} dias de antecedência.");

        var slot = GetSlots(area).FirstOrDefault(item => item.ShiftId == (area.FullDay ? null : dto.ShiftId))
            ?? throw new BadRequestException("Escolha um dos turnos da área.");

        if (area.Terms is not null && !dto.AcceptTerms)
            throw new BadRequestException("Leia e aceite os termos de uso da área.");

        var notes = dto.Notes?.Trim();

        if (notes?.Length > 500)
            throw new BadRequestException("As observações podem ter no máximo 500 caracteres.");

        var slotKey = ReservationRules.SlotKey(date, slot.ShiftId);

        if (await _context.Reservations.AnyAsync(item => item.CommonAreaId == area.Id && item.SlotKey == slotKey))
            throw new ConflictException("Este horário já está reservado. Escolha outro dia ou turno.");

        if (area.MonthlyLimitPerUnit is not null)
        {
            var monthStart = new DateOnly(date.Year, date.Month, 1);
            var monthEnd = monthStart.AddMonths(1).AddDays(-1);

            var used = await _context.Reservations.CountAsync(item =>
                item.CommonAreaId == area.Id &&
                item.UnitId == unit.UnitId &&
                item.SlotKey != null &&
                item.Date >= monthStart &&
                item.Date <= monthEnd);

            if (used >= area.MonthlyLimitPerUnit)
            {
                throw new BadRequestException(
                    $"A unidade já tem {used} reserva(s) desta área neste mês, o limite é {area.MonthlyLimitPerUnit}.");
            }
        }

        var now = DateTime.UtcNow;
        var reservation = new Reservation
        {
            CondominiumId = condominiumId,
            CommonAreaId = area.Id,
            UnitId = unit.UnitId,
            Date = date,
            ShiftId = slot.ShiftId,
            ShiftName = slot.Name,
            StartTime = slot.StartTime,
            EndTime = slot.EndTime,
            Status = area.RequiresApproval ? ReservationStatus.Pending : ReservationStatus.Approved,
            SlotKey = slotKey,
            Notes = string.IsNullOrEmpty(notes) ? null : notes,
            Fee = area.Fee,
            RequestedByUserId = userId,
            TermsAcceptedAt = area.Terms is null ? null : now,
            DecidedAt = area.RequiresApproval ? null : now,
            CreatedAt = now,
            UpdatedAt = now
        };

        await using (var transaction = await _context.Database.BeginTransactionAsync())
        {
            _context.Reservations.Add(reservation);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                // The unique slot index: someone took it between the check and the save.
                if (await _context.Reservations.AsNoTracking().AnyAsync(item => item.CommonAreaId == area.Id && item.SlotKey == slotKey))
                    throw new ConflictException("Este horário acabou de ser reservado. Escolha outro dia ou turno.");

                throw;
            }

            if (reservation.Status == ReservationStatus.Approved)
                await CreateFeeChargeAsync(reservation, area.Name, userId);

            await transaction.CommitAsync();
        }

        var place = $"{area.Name} em {FormatDate(date)} ({slot.Name}), {unit.Label}";

        await NotifyManagersAsync(
            area,
            area.RequiresApproval ? "Novo pedido de reserva" : "Nova reserva",
            area.RequiresApproval ? $"{place}. Aprove ou recuse em Reservas." : $"{place}.");

        return await GetResponseAsync(reservation.Id);
    }

    public async Task<IEnumerable<ReservationResponseDto>> GetMineAsync(int userId, int condominiumId, bool includePast)
    {
        await _permissionService.EnsureCondominiumAccessAsync(userId, condominiumId);
        await _permissionService.EnsureModuleEnabledAsync(condominiumId, AppModules.Reservations);

        var unitIds = (await ReservationRules.GetUserUnitsAsync(_context, userId, condominiumId))
            .Select(unit => unit.UnitId)
            .ToList();
        var today = ReservationRules.Today();

        var query = _context.Reservations.Where(reservation =>
            reservation.CondominiumId == condominiumId &&
            unitIds.Contains(reservation.UnitId) &&
            (includePast || reservation.Date >= today));

        return (await ToResponsesAsync(query))
            .OrderBy(reservation => reservation.Date)
            .ThenBy(reservation => reservation.StartTime)
            .ToList();
    }

    public async Task<IEnumerable<ReservationResponseDto>> GetForManagementAsync(
        int userId,
        int condominiumId,
        DateOnly? from,
        DateOnly? to,
        ReservationStatus? status,
        int? commonAreaId)
    {
        await _permissionService.EnsureCondominiumPermissionAsync(userId, condominiumId, AppPermissions.ReservationsManage);

        var start = from ?? ReservationRules.Today();
        var end = to ?? start.AddDays(MaxListDays - 1);

        if (end < start)
            throw new BadRequestException("A data final precisa ser igual ou depois da inicial.");

        if (end.DayNumber - start.DayNumber + 1 > MaxListDays)
            throw new BadRequestException("Consulte no máximo 1 ano por vez.");

        var managed = await _permissionService.GetManagedBuildingIdsAsync(userId, condominiumId);

        var query = _context.Reservations.Where(reservation =>
            reservation.CondominiumId == condominiumId &&
            reservation.Date >= start &&
            reservation.Date <= end &&
            (status == null || reservation.Status == status) &&
            (commonAreaId == null || reservation.CommonAreaId == commonAreaId) &&
            (managed == null || reservation.CommonArea.BuildingId == null || managed.Contains(reservation.CommonArea.BuildingId.Value)));

        return (await ToResponsesAsync(query))
            .OrderBy(reservation => reservation.Date)
            .ThenBy(reservation => reservation.StartTime)
            .ThenBy(reservation => reservation.CommonAreaName)
            .ToList();
    }

    public async Task<ReservationResponseDto> ApproveAsync(int userId, int reservationId)
    {
        var reservation = await FindManagedAsync(userId, reservationId);

        if (reservation.Status != ReservationStatus.Pending)
            throw new BadRequestException("Só pedidos pendentes podem ser aprovados.");

        if (reservation.Date < ReservationRules.Today())
            throw new BadRequestException("A data desta reserva já passou.");

        await using (var transaction = await _context.Database.BeginTransactionAsync())
        {
            reservation.Status = ReservationStatus.Approved;
            reservation.DecidedByUserId = userId;
            reservation.DecidedAt = DateTime.UtcNow;
            reservation.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await CreateFeeChargeAsync(reservation, reservation.CommonArea.Name, userId);
            await transaction.CommitAsync();
        }

        var fee = reservation.ChargeId is null ? string.Empty : $" A taxa de {FormatMoney(reservation.Fee!.Value)} já está nos seus boletos.";

        await NotifyRequesterAsync(
            reservation,
            "Reserva aprovada",
            $"{Describe(reservation)} foi aprovada.{fee}");

        return await GetResponseAsync(reservation.Id);
    }

    public async Task<ReservationResponseDto> RejectAsync(int userId, int reservationId, RejectReservationDto dto)
    {
        var reservation = await FindManagedAsync(userId, reservationId);
        var reason = dto.Reason?.Trim() ?? string.Empty;

        if (reservation.Status != ReservationStatus.Pending)
            throw new BadRequestException("Só pedidos pendentes podem ser recusados.");

        if (reason.Length < 3)
            throw new BadRequestException("Conte ao morador o motivo da recusa.");

        if (reason.Length > 500)
            throw new BadRequestException("O motivo pode ter no máximo 500 caracteres.");

        reservation.Status = ReservationStatus.Rejected;
        reservation.SlotKey = null;
        reservation.RejectionReason = reason;
        reservation.DecidedByUserId = userId;
        reservation.DecidedAt = DateTime.UtcNow;
        reservation.UpdatedAt = DateTime.UtcNow;

        var canceledChargeId = CancelChargeIfOpen(reservation, "Reserva recusada.");
        await _context.SaveChangesAsync();

        if (canceledChargeId is not null)
            await _mercadoPagoService.CancelOpenPaymentAsync(canceledChargeId.Value);

        await NotifyRequesterAsync(reservation, "Reserva recusada", $"{Describe(reservation)} foi recusada. Motivo: {reason}");

        return await GetResponseAsync(reservation.Id);
    }

    // The management cancels any upcoming reservation (and its unpaid fee); the unit's people
    // cancel their own, and the fee is canceled only up to the free cancellation deadline.
    public async Task<ReservationResponseDto> CancelAsync(int userId, int reservationId, CancelReservationDto dto)
    {
        var reservation = await _context.Reservations
            .Include(item => item.CommonArea)
            .Include(item => item.Charge)
            .FirstOrDefaultAsync(item => item.Id == reservationId)
            ?? throw new NotFoundException("Reserva não encontrada.");

        await _permissionService.EnsureCondominiumAccessAsync(userId, reservation.CondominiumId);

        await _permissionService.EnsureModuleEnabledAsync(reservation.CondominiumId, AppModules.Reservations);

        var byManager = await CanManageAsync(userId, reservation.CommonArea);

        if (!byManager)
        {
            var units = await ReservationRules.GetUserUnitsAsync(_context, userId, reservation.CondominiumId);

            if (units.All(unit => unit.UnitId != reservation.UnitId))
                throw new NotFoundException("Reserva não encontrada.");
        }

        if (reservation.Status is not (ReservationStatus.Pending or ReservationStatus.Approved))
            throw new BadRequestException("Esta reserva já foi encerrada.");

        if (reservation.Date < ReservationRules.Today())
            throw new BadRequestException("A data desta reserva já passou.");

        var reason = dto.Reason?.Trim();

        if (reason?.Length > 500)
            throw new BadRequestException("O motivo pode ter no máximo 500 caracteres.");

        var wasApproved = reservation.Status == ReservationStatus.Approved;
        var freeUntil = GetFreeCancellationUntil(reservation.Date, reservation.Fee, reservation.CommonArea.FreeCancellationDays);
        var waiveFee = byManager || freeUntil is null || ReservationRules.Today() <= freeUntil;

        reservation.Status = ReservationStatus.Canceled;
        reservation.SlotKey = null;
        reservation.CancelReason = string.IsNullOrEmpty(reason) ? null : reason;
        reservation.CanceledByUserId = userId;
        reservation.CanceledAt = DateTime.UtcNow;
        reservation.UpdatedAt = DateTime.UtcNow;

        var canceledChargeId = waiveFee ? CancelChargeIfOpen(reservation, "Reserva cancelada.") : null;
        await _context.SaveChangesAsync();

        if (canceledChargeId is not null)
            await _mercadoPagoService.CancelOpenPaymentAsync(canceledChargeId.Value);

        if (byManager && reservation.RequestedByUserId != userId)
        {
            var why = reservation.CancelReason is null ? string.Empty : $" Motivo: {reservation.CancelReason}";
            await NotifyRequesterAsync(reservation, "Reserva cancelada", $"{Describe(reservation)} foi cancelada pela administração.{why}");
        }
        else if (!byManager && wasApproved)
        {
            await NotifyManagersAsync(reservation.CommonArea, "Reserva cancelada", $"{Describe(reservation)} foi cancelada pelo morador.");
        }

        return await GetResponseAsync(reservation.Id);
    }

    // Creates the fee charge of an approved reservation, inside the caller's transaction.
    private async Task CreateFeeChargeAsync(Reservation reservation, string areaName, int createdByUserId)
    {
        if (reservation.Fee is not > 0)
            return;

        var description = $"Reserva: {areaName} em {FormatDate(reservation.Date)} ({reservation.ShiftName})";

        var result = await _chargeService.GenerateForUnitsAsync(new ChargeGenerationRequest(
            reservation.CondominiumId,
            BuildingId: null,
            AllowedBuildingIds: null,
            reservation.Fee.Value,
            new Dictionary<int, decimal>(),
            // Due on the day of the reservation.
            reservation.Date.ToDateTime(TimeOnly.MinValue),
            description.Length > 255 ? description[..255] : description,
            createdByUserId,
            ChargeCategory.Reservation,
            UnitIds: [reservation.UnitId]));

        if (result.CreatedCount == 0)
            throw new BadRequestException("Não foi possível gerar a taxa: a unidade não tem ninguém vinculado.");

        reservation.ChargeId = result.Charges[0].Id;
        await _context.SaveChangesAsync();
    }

    // Marks the reservation's unpaid charge as canceled; returns its id so the caller can void the
    // open Pix/boleto after saving.
    private static int? CancelChargeIfOpen(Reservation reservation, string reason)
    {
        var charge = reservation.Charge;

        if (charge is null || charge.Status is not (ChargeStatus.Pending or ChargeStatus.Overdue))
            return null;

        charge.Status = ChargeStatus.Canceled;
        charge.CanceledAt = DateTime.UtcNow;
        charge.CancelReason = reason;

        return charge.Id;
    }

    private async Task<Reservation> FindManagedAsync(int userId, int reservationId)
    {
        var reservation = await _context.Reservations
            .Include(item => item.CommonArea)
            .Include(item => item.Charge)
            .FirstOrDefaultAsync(item => item.Id == reservationId)
            ?? throw new NotFoundException("Reserva não encontrada.");

        await _permissionService.EnsureCondominiumPermissionAsync(userId, reservation.CondominiumId, AppPermissions.ReservationsManage);

        if (!await CanManageAsync(userId, reservation.CommonArea))
            throw new NotFoundException("Reserva não encontrada.");

        return reservation;
    }

    private async Task<bool> CanManageAsync(int userId, CommonArea area)
    {
        if (!await _permissionService.HasCondominiumPermissionAsync(userId, area.CondominiumId, AppPermissions.ReservationsManage))
            return false;

        var managed = await _permissionService.GetManagedBuildingIdsAsync(userId, area.CondominiumId);

        return managed is null || area.BuildingId is null || managed.Contains(area.BuildingId.Value);
    }

    // The unit the user books for: the one asked (must be his and allowed by the area) or, without
    // one, his first allowed unit.
    private async Task<ReservationRules.UserUnit> GetBookingUnitAsync(int userId, CommonArea area, int? unitId)
    {
        var units = (await ReservationRules.GetUserUnitsAsync(_context, userId, area.CondominiumId))
            .Where(unit => area.BuildingId is null || unit.BuildingId == area.BuildingId)
            .OrderBy(unit => unit.Label)
            .ToList();

        if (!area.IsActive || units.Count == 0)
            throw new NotFoundException("Área não encontrada.");

        if (unitId is null or 0)
            return units[0];

        return units.FirstOrDefault(unit => unit.UnitId == unitId)
            ?? throw new ForbiddenException("Você só pode reservar para a sua unidade.");
    }

    private record Slot(int? ShiftId, string Name, TimeOnly? StartTime, TimeOnly? EndTime);

    private static List<Slot> GetSlots(CommonArea area)
    {
        if (area.FullDay)
            return [new Slot(null, ReservationRules.WholeDayName, null, null)];

        return area.Shifts
            .Where(shift => shift.IsActive)
            .OrderBy(shift => shift.SortOrder)
            .Select(shift => new Slot(shift.Id, shift.Name, shift.StartTime, shift.EndTime))
            .ToList();
    }

    private static DateOnly? ParseMonth(string? month)
    {
        if (string.IsNullOrWhiteSpace(month))
            return null;

        if (!DateOnly.TryParseExact(month + "-01", "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var first))
            throw new BadRequestException("Mês inválido. Use o formato AAAA-MM.");

        return first;
    }

    private static DateOnly? GetFreeCancellationUntil(DateOnly date, decimal? fee, int? freeCancellationDays)
    {
        return fee is > 0 && freeCancellationDays is not null ? date.AddDays(-freeCancellationDays.Value) : null;
    }

    private async Task NotifyManagersAsync(CommonArea area, string title, string message)
    {
        var managers = await _context.UserCondominiums
            .AsNoTracking()
            .Where(link =>
                link.CondominiumId == area.CondominiumId &&
                link.Status == UserCondominiumStatus.Active &&
                (link.Role == AppRoles.Admin ||
                 (link.Role == AppRoles.Syndic &&
                  link.Permissions.Any(permission => permission.PermissionKey == AppPermissions.ReservationsManage) &&
                  (link.ManagesAllBuildings || area.BuildingId == null || link.Buildings.Any(building => building.BuildingId == area.BuildingId)))))
            .Select(link => new { link.UserId, link.Role })
            .ToListAsync();

        await _notificationService.CreateManyAsync(
            managers.Where(item => item.Role == AppRoles.Admin).Select(item => item.UserId),
            NotificationType.Reservation,
            title,
            message,
            "/admin/reservations",
            area.CondominiumId);

        await _notificationService.CreateManyAsync(
            managers.Where(item => item.Role == AppRoles.Syndic).Select(item => item.UserId),
            NotificationType.Reservation,
            title,
            message,
            "/syndic/reservations",
            area.CondominiumId);
    }

    private async Task NotifyRequesterAsync(Reservation reservation, string title, string message)
    {
        var role = await _permissionService.GetCondominiumRoleAsync(reservation.RequestedByUserId, reservation.CondominiumId);

        await _notificationService.CreateAsync(
            reservation.RequestedByUserId,
            NotificationType.Reservation,
            title,
            message,
            role == AppRoles.Resident ? "/resident/reservations" : null,
            reservation.CondominiumId);
    }

    // "A reserva de Salão de festas em 20/11/2026 (Noite)".
    private static string Describe(Reservation reservation)
    {
        return $"A reserva de {reservation.CommonArea.Name} em {FormatDate(reservation.Date)} ({reservation.ShiftName})";
    }

    private static string FormatDate(DateOnly date) => date.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture);

    private static string FormatMoney(decimal value) => value.ToString("C", CultureInfo.GetCultureInfo("pt-BR"));

    private async Task<ReservationResponseDto> GetResponseAsync(int reservationId)
    {
        return (await ToResponsesAsync(_context.Reservations.Where(item => item.Id == reservationId))).First();
    }

    private async Task<List<ReservationResponseDto>> ToResponsesAsync(IQueryable<Reservation> query)
    {
        var rows = await query
            .AsNoTracking()
            .Select(reservation => new
            {
                Dto = new ReservationResponseDto
                {
                    Id = reservation.Id,
                    CondominiumId = reservation.CondominiumId,
                    CommonAreaId = reservation.CommonAreaId,
                    CommonAreaName = reservation.CommonArea.Name,
                    UnitId = reservation.UnitId,
                    UnitLabel = reservation.Unit.Building.Name + ", unidade " + reservation.Unit.Number,
                    BuildingId = reservation.Unit.BuildingId,
                    Date = reservation.Date,
                    ShiftId = reservation.ShiftId,
                    ShiftName = reservation.ShiftName,
                    StartTime = reservation.StartTime,
                    EndTime = reservation.EndTime,
                    Status = reservation.Status,
                    Notes = reservation.Notes,
                    Fee = reservation.Fee,
                    ChargeId = reservation.ChargeId,
                    ChargeStatus = reservation.Charge != null ? reservation.Charge.Status : null,
                    RequestedByName = reservation.RequestedByUser.Person.Name,
                    CreatedAt = reservation.CreatedAt,
                    DecidedAt = reservation.DecidedAt,
                    RejectionReason = reservation.RejectionReason,
                    CanceledAt = reservation.CanceledAt,
                    CancelReason = reservation.CancelReason
                },
                reservation.CommonArea.FreeCancellationDays
            })
            .ToListAsync();

        var today = ReservationRules.Today();

        foreach (var row in rows)
        {
            row.Dto.FreeCancellationUntil = GetFreeCancellationUntil(row.Dto.Date, row.Dto.Fee, row.FreeCancellationDays);
            row.Dto.CanCancel = row.Dto.Date >= today &&
                row.Dto.Status is ReservationStatus.Pending or ReservationStatus.Approved;
        }

        return rows.Select(row => row.Dto).ToList();
    }
}
