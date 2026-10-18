using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Text;
using backend.Constants;
using backend.Data;
using backend.DTOs.Building;
using backend.DTOs.Charge;
using backend.DTOs.Import;
using backend.DTOs.Person;
using backend.DTOs.Unit;
using backend.Enums;
using backend.Exceptions;
using backend.Models;
using backend.Services.Charges;
using backend.Services.Permissions;
using backend.Services.Persons;
using backend.Services.PersonUnits;
using backend.Services.Storage;
using backend.Services.Validation;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Imports;

// Spreadsheet import (units, people, unit links and open charges), in two steps:
// preview reads and validates everything without writing; confirm runs the same analysis again
// on the same file and, only if no row has errors, saves everything in one transaction.
// Each row is one unit, optionally with one person and one open charge; repeated units, people,
// links and charges are created once. Field rules come from the same DTOs the regular screens use.
public class SpreadsheetImportService : ISpreadsheetImportService
{
    public const long MaxFileSizeBytes = 2 * 1024 * 1024;
    public const int MaxRows = 2000;

    private readonly AppDbContext _context;
    private readonly IPermissionService _permissionService;
    private readonly IChargeService _chargeService;

    public SpreadsheetImportService(AppDbContext context, IPermissionService permissionService, IChargeService chargeService)
    {
        _context = context;
        _permissionService = permissionService;
        _chargeService = chargeService;
    }

    // ---- Columns ----

    private enum Column { Building, Unit, UnitType, Rooms, Bathrooms, SquareMeters, Name, CPF, Phone, Email, Relationship, Value, DueDate, Description }

    // Header names are compared without accents, spaces, punctuation or case.
    private static readonly Dictionary<string, Column> HeaderAliases = BuildAliases(new()
    {
        [Column.Building] = ["predio", "bloco", "torre", "edificio", "codigopredio", "codigodopredio", "nomepredio", "nomedopredio"],
        [Column.Unit] = ["unidade", "apto", "ap", "apartamento", "numero", "numerounidade", "numerodaunidade", "unid"],
        [Column.UnitType] = ["tipo", "tipounidade", "tipodaunidade"],
        [Column.Rooms] = ["quartos", "dormitorios", "qtdquartos"],
        [Column.Bathrooms] = ["banheiros", "qtdbanheiros"],
        [Column.SquareMeters] = ["metragem", "area", "aream2", "m2", "metros", "metrosquadrados"],
        [Column.Name] = ["nome", "morador", "nomemorador", "nomedomorador", "nomecompleto", "pessoa", "nomepessoa"],
        [Column.CPF] = ["cpf", "cpfmorador", "cpfdomorador"],
        [Column.Phone] = ["telefone", "celular", "whatsapp", "fone", "tel", "telefonecelular"],
        [Column.Email] = ["email", "emailmorador", "emaildomorador"],
        [Column.Relationship] = ["vinculo", "relacao", "tipovinculo", "tipodevinculo", "tiporelacao", "relacionamento"],
        [Column.Value] = ["valor", "valorcobranca", "valordacobranca", "valoremaberto", "valorr", "debito"],
        [Column.DueDate] = ["vencimento", "datavencimento", "datadevencimento", "vence"],
        [Column.Description] = ["descricao", "descricaocobranca", "descricaodacobranca", "referencia", "historico"],
    });

    private static readonly Dictionary<Column, string> ColumnLabels = new()
    {
        [Column.Building] = "Prédio", [Column.Unit] = "Unidade", [Column.UnitType] = "Tipo da unidade",
        [Column.Rooms] = "Quartos", [Column.Bathrooms] = "Banheiros", [Column.SquareMeters] = "Metragem",
        [Column.Name] = "Nome", [Column.CPF] = "CPF", [Column.Phone] = "Telefone", [Column.Email] = "E-mail", [Column.Relationship] = "Vínculo",
        [Column.Value] = "Valor", [Column.DueDate] = "Vencimento", [Column.Description] = "Descrição",
    };

    private static readonly Dictionary<string, UnitType> UnitTypeAliases = new()
    {
        ["apartamento"] = UnitType.Apartment, ["apto"] = UnitType.Apartment, ["ap"] = UnitType.Apartment,
        ["casa"] = UnitType.House,
        ["salacomercial"] = UnitType.CommercialRoom, ["sala"] = UnitType.CommercialRoom,
        ["loja"] = UnitType.Store,
        ["garagem"] = UnitType.Garage, ["vaga"] = UnitType.Garage,
        ["cobertura"] = UnitType.Penthouse,
    };

    private static readonly Dictionary<UnitType, string> UnitTypeLabels = new()
    {
        [UnitType.Apartment] = "Apartamento", [UnitType.House] = "Casa", [UnitType.CommercialRoom] = "Sala comercial",
        [UnitType.Store] = "Loja", [UnitType.Garage] = "Garagem", [UnitType.Penthouse] = "Cobertura",
    };

    private static readonly Dictionary<string, UnitRelationshipType> RelationshipAliases = new()
    {
        ["proprietario"] = UnitRelationshipType.Owner, ["proprietaria"] = UnitRelationshipType.Owner, ["dono"] = UnitRelationshipType.Owner,
        ["morador"] = UnitRelationshipType.Resident, ["moradora"] = UnitRelationshipType.Resident, ["residente"] = UnitRelationshipType.Resident,
        ["inquilino"] = UnitRelationshipType.Tenant, ["inquilina"] = UnitRelationshipType.Tenant, ["locatario"] = UnitRelationshipType.Tenant,
    };

    private static readonly Dictionary<UnitRelationshipType, string> RelationshipLabels = new()
    {
        [UnitRelationshipType.Owner] = "Proprietário", [UnitRelationshipType.Resident] = "Morador", [UnitRelationshipType.Tenant] = "Inquilino",
    };

    private static readonly string[] TemplateHeader =
        ["Prédio", "Unidade", "Tipo da unidade", "Quartos", "Banheiros", "Metragem", "Nome", "CPF", "Telefone", "E-mail", "Vínculo", "Valor", "Vencimento", "Descrição"];

    // ---- Public API ----

    public async Task<(byte[] Content, string ContentType, string FileName)> GetTemplateAsync(int userId, int condominiumId, string format)
    {
        await _permissionService.EnsureCondominiumAdminAsync(userId, condominiumId);

        var nextMonth = AppTimeZone.Today.AddMonths(1);
        var dueDate = new DateTime(nextMonth.Year, nextMonth.Month, 10).ToString("dd/MM/yyyy", CultureInfo.InvariantCulture);

        string[][] rows =
        [
            TemplateHeader,
            ["Bloco A", "101", "Apartamento", "2", "1", "58", "Maria da Silva", "123.456.789-09", "(11) 98888-7777", "maria@email.com", "Proprietário", "450,00", dueDate, "Taxa condominial"],
            ["Bloco A", "101", "Apartamento", "2", "1", "58", "João da Silva", "987.654.321-00", "", "", "Morador", "", "", ""],
            ["Bloco A", "102", "Apartamento", "3", "2", "72", "", "", "", "", "", "", "", ""],
        ];

        return format.Equals("xlsx", StringComparison.OrdinalIgnoreCase)
            ? (SpreadsheetReader.BuildXlsx(rows, "Importação"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "modelo-importacao-morae.xlsx")
            : (SpreadsheetReader.BuildCsv(rows), "text/csv; charset=utf-8", "modelo-importacao-morae.csv");
    }

    public async Task<ImportPreviewDto> PreviewAsync(int userId, int condominiumId, IFormFile? file)
    {
        var plan = await AnalyzeAsync(userId, condominiumId, file);
        return plan.Preview;
    }

    public async Task<ImportResultDto> ConfirmAsync(int userId, int condominiumId, IFormFile? file)
    {
        var plan = await AnalyzeAsync(userId, condominiumId, file);

        if (!plan.Preview.CanConfirm)
        {
            throw new BadRequestException(
                $"A planilha tem {plan.Preview.ErrorRows} linha(s) com erro. Corrija e envie de novo: nada foi importado.");
        }

        var now = DateTime.UtcNow;

        // Navigation properties tie new records together, so EF saves them in the right order.
        await using var transaction = await _context.Database.BeginTransactionAsync();

        foreach (var building in plan.NewBuildings)
        {
            building.CreatedAt = now;
            building.UpdatedAt = now;
        }

        _context.Buildings.AddRange(plan.NewBuildings);
        _context.Units.AddRange(plan.NewUnits);
        _context.Persons.AddRange(plan.NewPersons);
        _context.PersonCondominiums.AddRange(plan.NewPersons.Select(person => new PersonCondominium
        {
            Person = person,
            CondominiumId = condominiumId,
            CreatedAt = now
        }));
        _context.PersonUnits.AddRange(plan.NewLinks);
        // Imported charges follow the condominium's fine/interest rule, like charges created by hand.
        var (finePercent, monthlyInterestPercent) = await _chargeService.GetLateFeeRuleAsync(condominiumId);
        foreach (var charge in plan.NewCharges)
        {
            charge.FinePercent = finePercent;
            charge.MonthlyInterestPercent = monthlyInterestPercent;
        }
        _context.Charges.AddRange(plan.NewCharges);

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        // No e-mails, invitations or notifications: imported people are invited later, one by one.
        return new ImportResultDto
        {
            TotalRows = plan.Preview.TotalRows,
            Summary = plan.Preview.Summary
        };
    }

    // ---- Analysis ----

    private sealed class Plan
    {
        public ImportPreviewDto Preview { get; } = new();
        public List<Building> NewBuildings { get; } = [];
        public List<Unit> NewUnits { get; } = [];
        public List<Person> NewPersons { get; } = [];
        public List<PersonUnit> NewLinks { get; } = [];
        public List<Charge> NewCharges { get; } = [];
    }

    // A reference to an existing record (Id) or to one this import will create (New, numbered by Temp).
    private sealed record Ref<T>(int? Id, T? New, int Temp = 0) where T : class
    {
        public string Key => Id is not null ? $"e{Id}" : $"n{Temp}";
    }

    private sealed record ExistingPerson(int Id, bool InCondominium, bool LinkedElsewhere);

    private async Task<Plan> AnalyzeAsync(int userId, int condominiumId, IFormFile? file)
    {
        await _permissionService.EnsureCondominiumAdminAsync(userId, condominiumId);

        var table = ReadFile(file);
        var columns = MapColumns(table.Headers, out var recognized, out var ignored);

        var missing = new[] { Column.Building, Column.Unit }.Where(column => !columns.ContainsKey(column)).ToList();
        if (missing.Count > 0)
        {
            throw new BadRequestException(
                $"Não encontramos a(s) coluna(s) {string.Join(" e ", missing.Select(column => ColumnLabels[column]))} no cabeçalho. Use o modelo para baixar.");
        }

        var plan = new Plan();
        plan.Preview.FileName = Path.GetFileName(file!.FileName);
        plan.Preview.TotalRows = table.Rows.Count;
        plan.Preview.RecognizedColumns = recognized;
        plan.Preview.IgnoredColumns = ignored;

        // Everything the rows are matched against is loaded once.
        var buildings = await _context.Buildings
            .AsNoTracking()
            .Where(building => building.CondominiumId == condominiumId)
            .Select(building => new { building.Id, building.Name, building.Code })
            .ToListAsync();

        var buildingIds = buildings.Select(building => building.Id).ToList();

        var units = await _context.Units
            .AsNoTracking()
            .Where(unit => buildingIds.Contains(unit.BuildingId))
            .Select(unit => new { unit.Id, unit.BuildingId, unit.Number })
            .ToListAsync();

        var unitIds = units.Select(unit => unit.Id).ToList();

        var links = await _context.PersonUnits
            .AsNoTracking()
            .Where(link => unitIds.Contains(link.UnitId))
            .Select(link => new { link.PersonId, link.UnitId, link.RelationshipType })
            .ToListAsync();

        var charges = await _context.Charges
            .AsNoTracking()
            .Where(charge =>
                charge.CondominiumId == condominiumId &&
                charge.Scope == ChargeScope.Condominium &&
                (charge.Status == ChargeStatus.Pending || charge.Status == ChargeStatus.Overdue))
            .Select(charge => new { charge.UnitId, charge.Value, charge.DueDate, charge.Description })
            .ToListAsync();

        var fileCpfs = columns.TryGetValue(Column.CPF, out var cpfColumn)
            ? table.Rows.Select(row => DigitsOnly(Cell(row, cpfColumn))).Where(cpf => cpf.Length > 0).Distinct().ToList()
            : [];

        var existingPersons = await _context.Persons
            .AsNoTracking()
            .Where(person => fileCpfs.Contains(person.CPF))
            .Select(person => new
            {
                person.CPF,
                Info = new ExistingPerson(
                    person.Id,
                    _context.PersonCondominiums.Any(pc => pc.PersonId == person.Id && pc.CondominiumId == condominiumId),
                    _context.PersonUnits.Any(pu => pu.PersonId == person.Id && pu.Unit.Building.CondominiumId != condominiumId))
            })
            .ToDictionaryAsync(person => person.CPF, person => person.Info);

        // Lookup tables; rows already accepted add their new records to them.
        var buildingByName = new Dictionary<string, Ref<Building>>(StringComparer.OrdinalIgnoreCase);
        foreach (var building in buildings)
        {
            buildingByName.TryAdd(building.Code.Trim(), new Ref<Building>(building.Id, null));
            buildingByName.TryAdd(building.Name.Trim(), new Ref<Building>(building.Id, null));
        }

        var usedCodes = new HashSet<string>(buildings.Select(building => building.Code.Trim()), StringComparer.OrdinalIgnoreCase);
        var unitByKey = units.ToDictionary(
            unit => $"e{unit.BuildingId}|{unit.Number.Trim()}",
            unit => new Ref<Unit>(unit.Id, null),
            StringComparer.OrdinalIgnoreCase);
        var personByCpf = new Dictionary<string, Ref<Person>>();
        var existingLinkKeys = links.Select(link => $"e{link.PersonId}|e{link.UnitId}|{(int)link.RelationshipType}").ToHashSet();
        var newLinkKeys = new HashSet<string>();
        var newChargeKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var existingChargeKeys = charges
            .Where(charge => charge.UnitId is not null)
            .Select(charge => ChargeKey($"e{charge.UnitId}", charge.Value, charge.DueDate, charge.Description))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        // Records that already existed and were reused (counted once each, as "skipped").
        var reused = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var tempId = 0;
        string? paymentMethodError = null;
        var paymentMethodChecked = false;
        var summary = plan.Preview.Summary;

        foreach (var row in table.Rows)
        {
            var result = new ImportRowDto { Line = row.Line };
            var errors = result.Errors;
            string Get(Column column) => columns.TryGetValue(column, out var index) ? Cell(row, index).Trim() : string.Empty;

            // -- Building and unit (required) --
            var buildingName = Get(Column.Building);
            var unitNumber = Get(Column.Unit);
            result.Building = buildingName;
            result.Unit = unitNumber;

            if (buildingName.Length == 0)
                errors.Add("Preencha o prédio.");

            buildingByName.TryGetValue(buildingName, out var buildingRef);
            CreateBuildingDto? newBuildingDto = null;

            if (buildingName.Length > 0 && buildingRef is null)
            {
                newBuildingDto = new CreateBuildingDto { Name = buildingName, Code = BuildCode(buildingName, usedCodes) };
                Validate(newBuildingDto, errors);
            }

            var unitType = UnitType.Apartment;
            var unitTypeText = Get(Column.UnitType);
            if (unitTypeText.Length > 0 && UnitTypeAliases.TryGetValue(Normalize(unitTypeText), out var parsedUnitType))
                unitType = parsedUnitType;
            else if (unitTypeText.Length > 0)
                errors.Add("Tipo da unidade inválido. Use Apartamento, Casa, Sala comercial, Loja, Garagem ou Cobertura.");
            result.UnitTypeLabel = UnitTypeLabels.GetValueOrDefault(unitType);

            Ref<Unit>? unitRef = null;
            CreateUnitDto? newUnitDto = null;

            if (buildingRef is not null)
                unitByKey.TryGetValue($"{buildingRef.Key}|{unitNumber}", out unitRef);

            // A unit that already exists keeps its type; the label only shows a type the row sets.
            if (unitRef is not null && unitTypeText.Length == 0)
                result.UnitTypeLabel = null;

            if (unitRef is null)
            {
                newUnitDto = new CreateUnitDto
                {
                    Number = unitNumber,
                    UnitType = unitType,
                    Rooms = ParseInt(Get(Column.Rooms), "Quartos", errors),
                    Bathrooms = ParseInt(Get(Column.Bathrooms), "Banheiros", errors),
                    SquareMeters = (double)(ParseDecimal(Get(Column.SquareMeters), "Metragem", errors) ?? 0),
                };
                Validate(newUnitDto, errors);
            }

            // -- Person and link (optional) --
            var personName = Get(Column.Name);
            var cpf = DigitsOnly(Get(Column.CPF));
            var phone = DigitsOnly(Get(Column.Phone));
            var email = Get(Column.Email);
            var relationshipText = Get(Column.Relationship);
            var hasPerson = personName.Length > 0 || cpf.Length > 0 || phone.Length > 0 || email.Length > 0 || relationshipText.Length > 0;

            Ref<Person>? personRef = null;
            CreatePersonDto? newPersonDto = null;
            var relationship = UnitRelationshipType.Resident;

            if (hasPerson)
            {
                result.PersonName = personName;
                result.CPF = cpf;
                result.PhoneNumber = phone;
                result.Email = email.Length > 0 ? email : null;

                if (relationshipText.Length > 0 && RelationshipAliases.TryGetValue(Normalize(relationshipText), out var parsedRelationship))
                    relationship = parsedRelationship;
                else if (relationshipText.Length > 0)
                    errors.Add("Vínculo inválido. Use Proprietário, Morador ou Inquilino.");
                result.RelationshipLabel = RelationshipLabels.GetValueOrDefault(relationship);

                if (existingPersons.TryGetValue(cpf, out var existing))
                {
                    if (!existing.InCondominium)
                        errors.Add(PersonService.CpfTakenMessage);
                    else if (existing.LinkedElsewhere)
                        errors.Add(PersonUnitService.OtherCondominiumLinkMessage);
                    else
                        personRef = new Ref<Person>(existing.Id, null);
                }
                else if (!personByCpf.TryGetValue(cpf, out personRef))
                {
                    newPersonDto = new CreatePersonDto { Name = personName, CPF = cpf, PhoneNumber = phone.Length > 0 ? phone : null, Email = email.Length > 0 ? email : null };
                    Validate(newPersonDto, errors);
                }
            }

            // -- Open charge (optional) --
            var valueText = Get(Column.Value);
            var dueDateText = Get(Column.DueDate);
            var description = Get(Column.Description);
            var hasCharge = valueText.Length > 0 || dueDateText.Length > 0 || description.Length > 0;
            CreateChargeDto? chargeDto = null;

            if (hasCharge)
            {
                var value = ParseDecimal(valueText, "Valor", errors);
                var dueDate = ParseDate(dueDateText, errors);

                result.ChargeValue = value;
                result.ChargeDueDate = dueDate is null ? null : DateOnly.FromDateTime(dueDate.Value);
                result.ChargeDescription = description;

                if (valueText.Length == 0)
                    errors.Add("Preencha o valor da cobrança.");

                // Old debts may be imported: they are saved as pending and the hourly job marks them overdue.
                if (dueDate is not null && ChargeService.IsPastDueDate(dueDate.Value))
                    result.Warnings.Add($"Vencida em {dueDate.Value:dd/MM}.");

                if (!paymentMethodChecked)
                {
                    paymentMethodChecked = true;
                    try
                    {
                        await _chargeService.EnsureCondominiumPaymentMethodAsync(condominiumId);
                    }
                    catch (BadRequestException exception)
                    {
                        paymentMethodError = exception.Message;
                    }
                }

                if (paymentMethodError is not null)
                    errors.Add(paymentMethodError);

                chargeDto = new CreateChargeDto
                {
                    Scope = ChargeScope.Condominium,
                    CondominiumId = condominiumId,
                    Value = value ?? 0,
                    DueDate = dueDate ?? default,
                    Description = description
                };

                if (value is not null && dueDate is not null)
                    Validate(chargeDto, errors);
                else if (description.Length == 0)
                    errors.Add("Preencha a descrição da cobrança.");
            }

            plan.Preview.Rows.Add(result);

            if (errors.Count > 0)
            {
                result.Errors = errors.Distinct().ToList();
                continue;
            }

            // -- The row is valid: record what it creates or reuses --
            if (buildingRef is null)
            {
                var building = new Building { CondominiumId = condominiumId, Name = newBuildingDto!.Name, Code = newBuildingDto.Code };
                buildingRef = new Ref<Building>(null, building, ++tempId);
                buildingByName[building.Name] = buildingRef;
                usedCodes.Add(building.Code);
                plan.NewBuildings.Add(building);
                result.BuildingAction = ImportAction.Create;
                summary.Buildings.Created++;
            }
            else
            {
                result.BuildingAction = buildingRef.Id is null ? ImportAction.Create : ImportAction.Existing;
                if (buildingRef.Id is not null) reused.Add("b" + buildingRef.Key);
            }

            if (unitRef is null)
            {
                var unit = new Unit
                {
                    Number = newUnitDto!.Number,
                    UnitType = newUnitDto.UnitType,
                    Rooms = newUnitDto.Rooms,
                    Bathrooms = newUnitDto.Bathrooms,
                    SquareMeters = newUnitDto.SquareMeters,
                };
                SetBuilding(unit, buildingRef);
                unitRef = new Ref<Unit>(null, unit, ++tempId);
                unitByKey[$"{buildingRef.Key}|{unitNumber}"] = unitRef;
                plan.NewUnits.Add(unit);
                result.UnitAction = ImportAction.Create;
                summary.Units.Created++;
            }
            else
            {
                result.UnitAction = unitRef.Id is null ? ImportAction.Create : ImportAction.Existing;
                if (unitRef.Id is not null) reused.Add("u" + unitRef.Key);
            }

            if (hasPerson)
            {
                if (personRef is null)
                {
                    var person = new Person
                    {
                        Name = newPersonDto!.Name,
                        CPF = newPersonDto.CPF,
                        PhoneNumber = newPersonDto.PhoneNumber ?? string.Empty,
                        Email = newPersonDto.Email,
                        CreatedByUserId = userId,
                    };
                    personRef = new Ref<Person>(null, person, ++tempId);
                    personByCpf[cpf] = personRef;
                    plan.NewPersons.Add(person);
                    result.PersonAction = ImportAction.Create;
                    summary.Persons.Created++;
                }
                else
                {
                    result.PersonAction = personRef.Id is null ? ImportAction.Create : ImportAction.Existing;
                    if (personRef.Id is not null) reused.Add("p" + personRef.Key);
                }

                var linkKey = $"{personRef.Key}|{unitRef.Key}|{(int)relationship}";

                if (existingLinkKeys.Contains(linkKey))
                {
                    result.LinkAction = ImportAction.Existing;
                    reused.Add("l" + linkKey);
                }
                else if (newLinkKeys.Add(linkKey))
                {
                    var link = new PersonUnit { RelationshipType = relationship, CreatedAt = DateTime.UtcNow };
                    if (personRef.Id is not null) link.PersonId = personRef.Id.Value; else link.Person = personRef.New!;
                    if (unitRef.Id is not null) link.UnitId = unitRef.Id.Value; else link.Unit = unitRef.New!;
                    plan.NewLinks.Add(link);
                    result.LinkAction = ImportAction.Create;
                    summary.Links.Created++;
                }
                else
                {
                    // Repeats an earlier row of the file.
                    result.LinkAction = ImportAction.Create;
                }
            }

            if (chargeDto is not null)
            {
                var chargeKey = ChargeKey(unitRef.Key, chargeDto.Value, chargeDto.DueDate, chargeDto.Description);

                if (existingChargeKeys.Contains(chargeKey))
                {
                    result.ChargeAction = ImportAction.Existing;
                    reused.Add("c" + chargeKey);
                }
                else if (newChargeKeys.Add(chargeKey))
                {
                    // Same shape ChargeService.CreateAsync saves: calendar due date, pending, condominium scope.
                    var charge = new Charge
                    {
                        Scope = ChargeScope.Condominium,
                        CondominiumId = condominiumId,
                        CreatedByUserId = userId,
                        Value = chargeDto.Value,
                        DueDate = DateTime.SpecifyKind(chargeDto.DueDate.Date, DateTimeKind.Unspecified),
                        Description = chargeDto.Description,
                        Status = ChargeStatus.Pending,
                        CreatedAt = DateTime.UtcNow,
                    };
                    if (unitRef.Id is not null) charge.UnitId = unitRef.Id.Value; else charge.Unit = unitRef.New!;
                    plan.NewCharges.Add(charge);
                    result.ChargeAction = ImportAction.Create;
                    summary.Charges.Created++;
                }
                else
                {
                    result.ChargeAction = ImportAction.Create;
                }
            }
        }

        summary.Buildings.Skipped = reused.Count(key => key[0] == 'b');
        summary.Units.Skipped = reused.Count(key => key[0] == 'u');
        summary.Persons.Skipped = reused.Count(key => key[0] == 'p');
        summary.Links.Skipped = reused.Count(key => key[0] == 'l');
        summary.Charges.Skipped = reused.Count(key => key[0] == 'c');

        plan.Preview.ErrorRows = plan.Preview.Rows.Count(row => row.Errors.Count > 0);
        plan.Preview.CanConfirm = plan.Preview.ErrorRows == 0;

        return plan;
    }

    private static void SetBuilding(Unit unit, Ref<Building> building)
    {
        if (building.Id is not null)
            unit.BuildingId = building.Id.Value;
        else
            unit.Building = building.New!;
    }

    // ---- File and cells ----

    private static SpreadsheetReader.Table ReadFile(IFormFile? file)
    {
        if (file is null || file.Length == 0)
            throw new BadRequestException("Envie a planilha (CSV ou Excel .xlsx).");

        if (file.Length > MaxFileSizeBytes)
            throw new BadRequestException("A planilha passa de 2 MB. Divida o arquivo e envie em partes.");

        using var stream = new MemoryStream();
        file.CopyTo(stream);
        stream.Position = 0;

        // The real type comes from the content: an .xlsx is a ZIP with a workbook; anything else must be text.
        var detected = UploadedFileInspector.Detect(stream);
        var isXlsx = detected?.Extension == ".xlsx";

        if (detected is not null && !isXlsx)
            throw new BadRequestException("Tipo de arquivo não aceito. Envie uma planilha CSV ou Excel (.xlsx).");

        stream.Position = 0;
        return SpreadsheetReader.Read(stream, isXlsx, MaxRows);
    }

    private static Dictionary<Column, int> MapColumns(string[] headers, out List<string> recognized, out List<string> ignored)
    {
        var columns = new Dictionary<Column, int>();
        recognized = [];
        ignored = [];

        for (var index = 0; index < headers.Length; index++)
        {
            if (headers[index].Length == 0)
                continue;

            if (HeaderAliases.TryGetValue(Normalize(headers[index]), out var column) && columns.TryAdd(column, index))
                recognized.Add(headers[index]);
            else
                ignored.Add(headers[index]);
        }

        return columns;
    }

    private static Dictionary<string, Column> BuildAliases(Dictionary<Column, string[]> aliases)
    {
        return aliases
            .SelectMany(pair => pair.Value.Select(alias => (alias, column: pair.Key)))
            .ToDictionary(pair => pair.alias, pair => pair.column);
    }

    private static string Cell(SpreadsheetReader.Row row, int index)
    {
        return index < row.Cells.Length ? row.Cells[index] : string.Empty;
    }

    // "Tipo da Unidade" → "tipodaunidade"
    private static string Normalize(string text)
    {
        var decomposed = text.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(decomposed.Length);

        foreach (var character in decomposed)
        {
            if (char.IsLetterOrDigit(character) && CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark)
                builder.Append(char.ToLowerInvariant(character));
        }

        return builder.ToString();
    }

    private static string DigitsOnly(string text)
    {
        return new string(text.Where(char.IsAsciiDigit).ToArray());
    }

    // A new building's code is its name (up to 30 characters), made unique in the condominium.
    private static string BuildCode(string name, HashSet<string> usedCodes)
    {
        var baseCode = name.Length > 30 ? name[..30].Trim() : name;
        var code = baseCode;

        for (var suffix = 2; usedCodes.Contains(code); suffix++)
        {
            var tail = $"-{suffix}";
            code = (baseCode.Length + tail.Length > 30 ? baseCode[..(30 - tail.Length)] : baseCode) + tail;
        }

        return code;
    }

    private static string ChargeKey(string unitKey, decimal value, DateTime dueDate, string description)
    {
        return $"{unitKey}|{value.ToString("0.00", CultureInfo.InvariantCulture)}|{dueDate:yyyy-MM-dd}|{description.Trim()}";
    }

    private static int ParseInt(string text, string label, List<string> errors)
    {
        if (text.Length == 0)
            return 0;

        var value = ParseDecimal(text, label, errors, "2");

        if (value is not null && value != Math.Floor(value.Value))
        {
            errors.Add($"{label} precisa ser um número inteiro.");
            return 0;
        }

        return value is null ? 0 : (int)Math.Clamp(value.Value, int.MinValue, int.MaxValue);
    }

    // Accepts "R$ 1.234,56", "1234,56" and "1234.56" (Excel cells come with a dot).
    private static decimal? ParseDecimal(string text, string label, List<string> errors, string example = "1.234,56")
    {
        if (text.Length == 0)
            return null;

        var cleaned = text.Replace("R$", string.Empty).Replace(" ", string.Empty).Replace(" ", string.Empty);

        if (cleaned.Contains(','))
            cleaned = cleaned.Replace(".", string.Empty).Replace(',', '.');

        if (decimal.TryParse(cleaned, NumberStyles.AllowDecimalPoint | NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture, out var value))
            return Math.Round(value, 2);

        errors.Add($"{label} inválido: \"{text}\". Use, por exemplo, {example}.");
        return null;
    }

    private static readonly string[] DateFormats = ["dd/MM/yyyy", "d/M/yyyy", "dd/MM/yy", "d/M/yy", "yyyy-MM-dd", "dd-MM-yyyy", "dd.MM.yyyy"];

    private static DateTime? ParseDate(string text, List<string> errors)
    {
        if (text.Length == 0)
        {
            errors.Add("Preencha o vencimento da cobrança.");
            return null;
        }

        if (DateTime.TryParseExact(text, DateFormats, CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
            return date.Date;

        // Excel stores dates as a serial day number (cells formatted as date).
        if (double.TryParse(text, NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out var serial) &&
            serial is > 20000 and < 80000)
        {
            return DateTime.FromOADate(Math.Floor(serial)).Date;
        }

        errors.Add($"Vencimento inválido: \"{text}\". Use DD/MM/AAAA.");
        return null;
    }

    // Same DataAnnotations the regular create screens are validated with, in Portuguese.
    private static void Validate(object dto, List<string> errors)
    {
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(dto, new ValidationContext(dto), results, validateAllProperties: true);

        foreach (var result in results)
        {
            var member = result.MemberNames.FirstOrDefault() ?? string.Empty;
            errors.Add(ValidationMessageTranslator.Translate(member, result.ErrorMessage ?? string.Empty));
        }
    }
}
