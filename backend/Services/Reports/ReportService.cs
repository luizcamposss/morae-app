using System.Globalization;
using backend.Constants;
using backend.Data;
using backend.Enums;
using backend.Exceptions;
using backend.Models;
using backend.Services.Charges;
using backend.Services.Permissions;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace backend.Services.Reports;

public class ReportService : IReportService
{
    private const string ExcelContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    private const string PdfContentType = "application/pdf";
    private readonly AppDbContext _context;
    private readonly IPermissionService _permissionService;

    public ReportService(AppDbContext context, IPermissionService permissionService)
    {
        _context = context;
        _permissionService = permissionService;
    }

    public async Task<ReportDownload> GenerateAsync(
        int userId,
        int condominiumId,
        string reportType,
        string? from,
        string? to,
        int? buildingId,
        string format)
    {
        var role = await _permissionService.GetCondominiumRoleAsync(userId, condominiumId);
        if (role is not (AppRoles.Admin or AppRoles.Syndic))
            throw new ForbiddenException("Só a gestão pode baixar relatórios financeiros.");

        var normalizedType = reportType.Trim().ToLowerInvariant();
        var normalizedFormat = format.Trim().ToLowerInvariant();
        if (normalizedFormat is not ("xlsx" or "pdf"))
            throw new BadRequestException("Escolha o formato Excel ou PDF.");

        await EnsureReportPermissionAsync(userId, condominiumId, role, normalizedType);

        // Expenses (and the balance, made of them) belong to a module the condominium may turn off.
        if (normalizedType is "expenses" or "balance")
            await _permissionService.EnsureModuleEnabledAsync(condominiumId, AppModules.Expenses);
        var (start, end) = ParsePeriod(from, to);
        var managedBuildingIds = await _permissionService.GetManagedBuildingIdsAsync(userId, condominiumId);
        await ValidateBuildingAsync(condominiumId, buildingId, managedBuildingIds);

        var report = normalizedType switch
        {
            "delinquency" => await BuildDelinquencyAsync(condominiumId, start, end, buildingId, managedBuildingIds),
            "receipts" => await BuildReceiptsAsync(condominiumId, start, end, buildingId, managedBuildingIds),
            "expenses" => await BuildExpensesAsync(condominiumId, start, end, buildingId, managedBuildingIds),
            "balance" => await BuildBalanceAsync(condominiumId, start, end, buildingId, managedBuildingIds),
            _ => throw new BadRequestException("Tipo de relatório não reconhecido.")
        };

        var bytes = normalizedFormat == "xlsx" ? RenderExcel(report) : RenderPdf(report);
        var extension = normalizedFormat == "xlsx" ? "xlsx" : "pdf";
        var fileName = $"morae-{normalizedType}-{start:yyyyMMdd}-{end:yyyyMMdd}.{extension}";
        return new ReportDownload(bytes, normalizedFormat == "xlsx" ? ExcelContentType : PdfContentType, fileName);
    }

    private async Task EnsureReportPermissionAsync(int userId, int condominiumId, string role, string reportType)
    {
        if (role == AppRoles.Admin)
            return;

        switch (reportType)
        {
            case "delinquency":
                await _permissionService.EnsureCondominiumPermissionAsync(userId, condominiumId, AppPermissions.DelinquencyView);
                break;
            case "receipts":
                await _permissionService.EnsureAnyCondominiumPermissionAsync(userId, condominiumId, AppPermissions.FinanceAccess);
                break;
            case "expenses":
                await _permissionService.EnsureCondominiumPermissionAsync(userId, condominiumId, AppPermissions.ExpensesManage);
                break;
            case "balance":
                await _permissionService.EnsureAnyCondominiumPermissionAsync(userId, condominiumId, AppPermissions.FinanceAccess);
                await _permissionService.EnsureCondominiumPermissionAsync(userId, condominiumId, AppPermissions.ExpensesManage);
                break;
            default:
                throw new BadRequestException("Tipo de relatório não reconhecido.");
        }
    }

    private async Task ValidateBuildingAsync(
        int condominiumId,
        int? buildingId,
        IReadOnlyCollection<int>? managedBuildingIds)
    {
        if (buildingId is null)
            return;

        var belongsToCondominium = await _context.Buildings
            .AsNoTracking()
            .AnyAsync(building => building.Id == buildingId && building.CondominiumId == condominiumId);
        if (!belongsToCondominium)
            throw new BadRequestException("Este prédio não pertence a este condomínio.");

        if (managedBuildingIds is not null && !managedBuildingIds.Contains(buildingId.Value))
            throw new ForbiddenException("Você não cuida deste prédio.");
    }

    private async Task<ReportTable> BuildDelinquencyAsync(
        int condominiumId,
        DateOnly start,
        DateOnly end,
        int? buildingId,
        IReadOnlyCollection<int>? managedBuildingIds)
    {
        var today = DateOnly.FromDateTime(AppTimeZone.Today);
        var dueDateFrom = start.ToDateTime(TimeOnly.MinValue);
        var dueDateUntil = end.AddDays(1).ToDateTime(TimeOnly.MinValue);
        var query = _context.Charges
            .AsNoTracking()
            .Where(charge => charge.Scope == ChargeScope.Condominium &&
                             charge.CondominiumId == condominiumId &&
                             charge.DueDate >= dueDateFrom &&
                             charge.DueDate < dueDateUntil &&
                             charge.DueDate.Date < today.ToDateTime(TimeOnly.MinValue) &&
                             (charge.Status == ChargeStatus.Pending || charge.Status == ChargeStatus.Overdue));

        if (buildingId.HasValue)
            query = query.Where(charge => charge.Unit != null && charge.Unit.BuildingId == buildingId.Value);
        else if (managedBuildingIds is not null)
            query = query.Where(charge => charge.Unit != null && managedBuildingIds.Contains(charge.Unit.BuildingId));

        var charges = await query
            .Include(charge => charge.Unit).ThenInclude(unit => unit!.Building)
            .Include(charge => charge.RecipientPerson)
            .Include(charge => charge.TargetUser)
            .OrderBy(charge => charge.DueDate)
            .ThenBy(charge => charge.Unit!.Building.Name)
            .ThenBy(charge => charge.Unit!.Number)
            .ToListAsync();

        var unitIds = charges.Where(charge => charge.UnitId.HasValue).Select(charge => charge.UnitId!.Value).Distinct().ToArray();
        var payersByUnit = await _context.PersonUnits
            .AsNoTracking()
            .Where(link => unitIds.Contains(link.UnitId))
            .Select(link => new { link.UnitId, link.Person.Name })
            .ToListAsync();
        var payerNamesByUnit = payersByUnit
            .GroupBy(link => link.UnitId)
            .ToDictionary(group => group.Key, group => group.Select(link => link.Name).Distinct().Order().ToArray());

        var rows = charges.Select(charge =>
        {
            var dueDate = DateOnly.FromDateTime(charge.DueDate);
            var payers = charge.RecipientPerson is not null
                ? charge.RecipientPerson.Name
                : charge.UnitId.HasValue && payerNamesByUnit.TryGetValue(charge.UnitId.Value, out var names) && names.Length > 0
                    ? string.Join(", ", names)
                    : charge.TargetUser?.UserName ?? "—";
            var lateFees = ChargeLateFees.Calculate(charge, AppTimeZone.Today);
            return (IReadOnlyList<object?>)[
                charge.Unit?.Building.Name ?? "—",
                charge.Unit?.Number ?? "—",
                payers,
                charge.Description,
                dueDate.ToDateTime(TimeOnly.MinValue),
                (today.ToDateTime(TimeOnly.MinValue) - dueDate.ToDateTime(TimeOnly.MinValue)).Days,
                charge.Value,
                lateFees.Fine,
                lateFees.Interest,
                lateFees.Total
            ];
        }).ToList();

        return new ReportTable(
            "Inadimplência",
            start,
            end,
            ["Prédio", "Unidade", "Pagador", "Cobrança", "Vencimento", "Dias de atraso", "Valor original", "Multa", "Juros", "Valor atualizado"],
            rows,
            ["Valor original", "Multa", "Juros", "Valor atualizado"]);
    }

    private async Task<ReportTable> BuildReceiptsAsync(
        int condominiumId,
        DateOnly start,
        DateOnly end,
        int? buildingId,
        IReadOnlyCollection<int>? managedBuildingIds)
    {
        var startUtc = AppTimeZone.StartOfDayToUtc(start.ToDateTime(TimeOnly.MinValue));
        var endUtc = AppTimeZone.StartOfDayToUtc(end.AddDays(1).ToDateTime(TimeOnly.MinValue));
        var query = _context.Payments
            .AsNoTracking()
            .Where(payment => payment.Charge.Scope == ChargeScope.Condominium &&
                              payment.Charge.CondominiumId == condominiumId &&
                              payment.PaidAt >= startUtc && payment.PaidAt < endUtc);

        if (buildingId.HasValue)
            query = query.Where(payment => payment.Charge.Unit != null && payment.Charge.Unit.BuildingId == buildingId.Value);
        else if (managedBuildingIds is not null)
            query = query.Where(payment => payment.Charge.Unit != null && managedBuildingIds.Contains(payment.Charge.Unit.BuildingId));

        var payments = await query
            .Select(payment => new
            {
                payment.ChargeId,
                payment.AmountPaid,
                payment.PaymentMethod,
                payment.Charge.Category
            })
            .ToListAsync();

        // A monthly bill is split among its items' categories, in proportion to each item
        // (same rule as the monthly balance), so rent, water and light show up on their own.
        var billIds = payments.Where(payment => payment.Category == ChargeCategory.MonthlyBill).Select(payment => payment.ChargeId).Distinct().ToList();
        var billItems = billIds.Count == 0
            ? []
            : await _context.ChargeItems
                .AsNoTracking()
                .Where(item => billIds.Contains(item.ChargeId))
                .Select(item => new { item.ChargeId, item.Category, item.Amount })
                .ToListAsync();

        var shares = payments.SelectMany(payment =>
        {
            var items = billItems.Where(item => item.ChargeId == payment.ChargeId).ToList();
            var itemsTotal = items.Sum(item => item.Amount);

            if (payment.Category != ChargeCategory.MonthlyBill || itemsTotal <= 0)
                return new[] { (payment.ChargeId, payment.Category, payment.PaymentMethod, Amount: payment.AmountPaid) };

            var parts = items
                .GroupBy(item => item.Category)
                .Select(group => (payment.ChargeId, Category: group.Key, payment.PaymentMethod, Amount: Math.Round(payment.AmountPaid * group.Sum(item => item.Amount) / itemsTotal, 2)))
                .ToArray();
            // Rounding leftovers go to the largest part, so the parts add up to what was paid.
            var largest = Array.IndexOf(parts, parts.MaxBy(part => part.Amount));
            parts[largest].Amount += payment.AmountPaid - parts.Sum(part => part.Amount);
            return parts;
        });

        var grouped = shares
            .GroupBy(share => (share.Category, share.PaymentMethod))
            .OrderBy(group => group.Key.Category)
            .ThenBy(group => group.Key.PaymentMethod);
        var rows = grouped.Select(group => (IReadOnlyList<object?>)[
            ChargeCategoryLabel(group.Key.Category),
            PaymentMethodLabel(group.Key.PaymentMethod),
            group.Select(share => share.ChargeId).Distinct().Count(),
            group.Sum(share => share.Amount)
        ]).ToList();

        return new ReportTable("Recebimentos", start, end,
            ["Categoria", "Forma de pagamento", "Pagamentos", "Total recebido"], rows, ["Total recebido"]);
    }

    private async Task<ReportTable> BuildExpensesAsync(
        int condominiumId,
        DateOnly start,
        DateOnly end,
        int? buildingId,
        IReadOnlyCollection<int>? managedBuildingIds)
    {
        var query = _context.Expenses
            .AsNoTracking()
            .Where(expense => expense.CondominiumId == condominiumId && expense.PaidOn >= start && expense.PaidOn <= end);

        if (buildingId.HasValue)
            query = query.Where(expense => expense.BuildingId == buildingId.Value);
        else if (managedBuildingIds is not null)
            query = query.Where(expense => expense.BuildingId.HasValue && managedBuildingIds.Contains(expense.BuildingId.Value));

        var expenses = await query
            .OrderBy(expense => expense.Category.SortOrder)
            .ThenBy(expense => expense.PaidOn)
            .ThenBy(expense => expense.Id)
            .Select(expense => new
            {
                expense.PaidOn,
                Category = expense.Category.Name,
                expense.Supplier,
                Building = expense.Building == null ? "Condomínio" : expense.Building.Name,
                expense.Description,
                expense.Amount
            })
            .ToListAsync();

        var rows = expenses.Select(expense => (IReadOnlyList<object?>)[
            expense.PaidOn.ToDateTime(TimeOnly.MinValue), expense.Category, expense.Supplier ?? "—", expense.Building,
            expense.Description ?? "—", expense.Amount
        ]).ToList();

        return new ReportTable("Despesas", start, end,
            ["Data", "Categoria", "Fornecedor", "Prédio", "Descrição", "Valor pago"], rows, ["Valor pago"]);
    }

    private async Task<ReportTable> BuildBalanceAsync(
        int condominiumId,
        DateOnly start,
        DateOnly end,
        int? buildingId,
        IReadOnlyCollection<int>? managedBuildingIds)
    {
        var incomeStartUtc = AppTimeZone.StartOfDayToUtc(start.ToDateTime(TimeOnly.MinValue));
        var incomeEndUtc = AppTimeZone.StartOfDayToUtc(end.AddDays(1).ToDateTime(TimeOnly.MinValue));
        var incomeQuery = _context.Payments
            .AsNoTracking()
            .Where(payment => payment.Charge.Scope == ChargeScope.Condominium &&
                              payment.Charge.CondominiumId == condominiumId &&
                              payment.PaidAt >= incomeStartUtc && payment.PaidAt < incomeEndUtc);
        var expensesQuery = _context.Expenses.AsNoTracking()
            .Where(expense => expense.CondominiumId == condominiumId && expense.PaidOn >= start && expense.PaidOn <= end);

        if (buildingId.HasValue)
        {
            incomeQuery = incomeQuery.Where(payment => payment.Charge.Unit != null && payment.Charge.Unit.BuildingId == buildingId.Value);
            expensesQuery = expensesQuery.Where(expense => expense.BuildingId == buildingId.Value);
        }
        else if (managedBuildingIds is not null)
        {
            incomeQuery = incomeQuery.Where(payment => payment.Charge.Unit != null && managedBuildingIds.Contains(payment.Charge.Unit.BuildingId));
            expensesQuery = expensesQuery.Where(expense => expense.BuildingId.HasValue && managedBuildingIds.Contains(expense.BuildingId.Value));
        }

        var incomePayments = await incomeQuery
            .Select(payment => new { payment.PaidAt, payment.AmountPaid })
            .ToListAsync();
        var expensesByMonth = await expensesQuery
            .GroupBy(expense => new { expense.PaidOn.Year, expense.PaidOn.Month })
            .Select(group => new { group.Key.Year, group.Key.Month, Total = group.Sum(expense => expense.Amount) })
            .ToListAsync();

        var income = incomePayments
            .GroupBy(payment =>
            {
                var local = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(payment.PaidAt, DateTimeKind.Utc), AppTimeZone.SaoPaulo);
                return (local.Year, local.Month);
            })
            .ToDictionary(group => group.Key, group => group.Sum(payment => payment.AmountPaid));
        var outgoing = expensesByMonth.ToDictionary(item => (item.Year, item.Month), item => item.Total);
        var rows = new List<IReadOnlyList<object?>>();
        for (var month = new DateOnly(start.Year, start.Month, 1); month <= end; month = month.AddMonths(1))
        {
            var inTotal = income.GetValueOrDefault((month.Year, month.Month));
            var outTotal = outgoing.GetValueOrDefault((month.Year, month.Month));
            rows.Add([
                month.ToDateTime(TimeOnly.MinValue),
                inTotal,
                outTotal,
                inTotal - outTotal
            ]);
        }

        return new ReportTable("Balanço mensal", start, end,
            ["Mês", "Entradas", "Saídas", "Saldo do período"], rows, ["Entradas", "Saídas", "Saldo do período"]);
    }

    private static (DateOnly Start, DateOnly End) ParsePeriod(string? from, string? to)
    {
        var today = DateOnly.FromDateTime(AppTimeZone.Today);
        var defaultStart = new DateOnly(today.Year, today.Month, 1);
        var defaultEnd = defaultStart.AddMonths(1).AddDays(-1);
        var start = ParseDate(from, defaultStart, "início");
        var end = ParseDate(to, defaultEnd, "fim");
        if (end < start)
            throw new BadRequestException("A data final precisa ser igual ou posterior à inicial.");
        if (end.DayNumber - start.DayNumber > 3660)
            throw new BadRequestException("O período do relatório não pode passar de 10 anos.");
        return (start, end);
    }

    private static DateOnly ParseDate(string? value, DateOnly fallback, string label)
    {
        if (string.IsNullOrWhiteSpace(value))
            return fallback;
        if (DateOnly.TryParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date) && date.Year >= 2000)
            return date;
        throw new BadRequestException($"Informe a data de {label} no formato AAAA-MM-DD.");
    }

    private static byte[] RenderExcel(ReportTable report)
    {
        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add("Relatório");
        sheet.Cell(1, 1).Value = "Moraê · " + report.Title;
        sheet.Cell(1, 1).Style.Font.Bold = true;
        sheet.Cell(1, 1).Style.Font.FontSize = 16;
        sheet.Cell(2, 1).Value = $"Período: {report.Start:dd/MM/yyyy} a {report.End:dd/MM/yyyy}";
        var headerRow = 4;
        for (var column = 0; column < report.Headers.Count; column++)
            sheet.Cell(headerRow, column + 1).Value = report.Headers[column];
        var header = sheet.Range(headerRow, 1, headerRow, report.Headers.Count);
        header.Style.Fill.BackgroundColor = XLColor.FromHtml("#0F3D3E");
        header.Style.Font.FontColor = XLColor.White;
        header.Style.Font.Bold = true;

        for (var rowIndex = 0; rowIndex < report.Rows.Count; rowIndex++)
        {
            var row = report.Rows[rowIndex];
            for (var column = 0; column < row.Count; column++)
            {
                var cell = sheet.Cell(headerRow + rowIndex + 1, column + 1);
                var value = row[column];
                if (value is DateTime date)
                {
                    cell.Value = date;
                    cell.Style.DateFormat.Format = "dd/mm/yyyy";
                }
                else if (value is decimal amount)
                {
                    cell.Value = amount;
                    if (report.CurrencyHeaders.Contains(report.Headers[column]))
                        cell.Style.NumberFormat.Format = "R$ #,##0.00";
                }
                else if (value is int integer)
                    cell.Value = integer;
                else
                    cell.Value = value?.ToString() ?? string.Empty;
            }
        }

        if (report.Rows.Count == 0)
        {
            var emptyRow = headerRow + 1;
            sheet.Range(emptyRow, 1, emptyRow, report.Headers.Count).Merge();
            sheet.Cell(emptyRow, 1).Value = "Nenhum registro neste período.";
            sheet.Cell(emptyRow, 1).Style.Font.FontColor = XLColor.FromHtml("#4A6563");
        }

        sheet.SheetView.FreezeRows(headerRow);
        sheet.Columns().AdjustToContents(8, 44);
        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    // The QuestPDF license is set once at startup (Program.cs).
    private static byte[] RenderPdf(ReportTable report)
    {
        var bytes = QuestPDF.Fluent.Document.Create(document =>
        {
            document.Page(page =>
            {
                page.Size(PageSizes.A4.Landscape());
                page.Margin(28);
                page.DefaultTextStyle(style => style.FontSize(8).FontColor("#0F3D3E"));
                page.Header().Column(column =>
                {
                    column.Item().Text("Moraê · " + report.Title).FontSize(18).Bold();
                    column.Item().PaddingTop(4).Text($"Período: {report.Start:dd/MM/yyyy} a {report.End:dd/MM/yyyy}").FontColor("#4A6563");
                });
                page.Content().PaddingTop(18).Table(table =>
                {
                    table.ColumnsDefinition(columns =>
                    {
                        foreach (var _ in report.Headers)
                            columns.RelativeColumn();
                    });
                    table.Header(header =>
                    {
                        foreach (var label in report.Headers)
                            header.Cell().Background("#0F3D3E").Padding(5).Text(label).FontColor(Colors.White).Bold();
                    });
                    foreach (var row in report.Rows)
                    {
                        foreach (var value in row)
                        {
                            var text = value switch
                            {
                                DateTime date => date.ToString("dd/MM/yyyy", CultureInfo.GetCultureInfo("pt-BR")),
                                decimal amount => amount.ToString("C", CultureInfo.GetCultureInfo("pt-BR")),
                                _ => Convert.ToString(value, CultureInfo.GetCultureInfo("pt-BR")) ?? "—"
                            };
                            table.Cell().BorderBottom(0.5f).BorderColor("#DCE2DA").Padding(5).Text(text);
                        }
                    }
                    if (report.Rows.Count == 0)
                        table.Cell().ColumnSpan((uint)report.Headers.Count).Padding(8).Text("Nenhum registro neste período.").FontColor("#4A6563");
                });
                page.Footer().AlignRight().DefaultTextStyle(style => style.FontSize(7).FontColor("#4A6563")).Text(text =>
                {
                    text.Span("Gerado pelo Moraê · ");
                    text.CurrentPageNumber();
                    text.Span(" / ");
                    text.TotalPages();
                });
            });
        }).GeneratePdf();
        return bytes;
    }

    private static string ChargeCategoryLabel(ChargeCategory category) => category switch
    {
        ChargeCategory.CondominiumFee => "Taxa de condomínio",
        ChargeCategory.Rent => "Aluguel",
        ChargeCategory.Water => "Água",
        ChargeCategory.Electricity => "Luz",
        ChargeCategory.Gas => "Gás",
        ChargeCategory.Apportionment => "Rateio",
        ChargeCategory.Fine => "Multa",
        ChargeCategory.Reservation => "Reserva",
        ChargeCategory.Agreement => "Acordo",
        ChargeCategory.Other => "Outros",
        ChargeCategory.MonthlyBill => "Conta do mês",
        _ => category.ToString()
    };

    private static string PaymentMethodLabel(PaymentMethod method) => method switch
    {
        PaymentMethod.Pix => "Pix",
        PaymentMethod.CreditCard => "Cartão de crédito",
        PaymentMethod.DebitCard => "Cartão de débito",
        PaymentMethod.BankSlip => "Boleto",
        PaymentMethod.BankTransfer => "Transferência bancária",
        PaymentMethod.AccountBalance => "Saldo em conta",
        PaymentMethod.PrepaidCard => "Cartão pré-pago",
        PaymentMethod.DigitalWallet => "Carteira digital",
        PaymentMethod.Other => "Outro",
        _ => "Não informada"
    };

    private record ReportTable(
        string Title,
        DateOnly Start,
        DateOnly End,
        IReadOnlyList<string> Headers,
        IReadOnlyList<IReadOnlyList<object?>> Rows,
        IReadOnlyList<string> CurrencyHeaders);
}
