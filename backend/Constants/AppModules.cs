using backend.Enums;

namespace backend.Constants;

// Features a condominium can turn on and off. Finance, residents, units and notices are always on.
// A disabled module keeps its data: turning it on again brings everything back.
public static class AppModules
{
    public const string Occurrences = "occurrences";
    public const string Visitors = "visitors";
    public const string Maintenance = "maintenance";
    public const string Documents = "documents";
    public const string Assemblies = "assemblies";
    public const string Reservations = "reservations";
    public const string Agreements = "agreements";
    public const string Expenses = "expenses";
    public const string Rentals = "rentals";

    // Display order (Admin settings).
    public static readonly IReadOnlyList<string> All =
    [
        Occurrences,
        Visitors,
        Maintenance,
        Documents,
        Assemblies,
        Reservations,
        Agreements,
        Expenses,
        Rentals
    ];

    public static readonly IReadOnlyDictionary<string, string> Labels = new Dictionary<string, string>
    {
        [Occurrences] = "Ocorrências",
        [Visitors] = "Visitantes",
        [Maintenance] = "Manutenção preventiva",
        [Documents] = "Documentos",
        [Assemblies] = "Assembleias",
        [Reservations] = "Reservas de áreas comuns",
        [Agreements] = "Acordos de dívida",
        [Expenses] = "Despesas e prestação de contas",
        [Rentals] = "Aluguéis"
    };

    // A syndic permission only works while its module is enabled (for the Admin too).
    public static readonly IReadOnlyDictionary<string, string> ByPermission = new Dictionary<string, string>
    {
        [AppPermissions.OccurrencesManage] = Occurrences,
        [AppPermissions.VisitorsManage] = Visitors,
        [AppPermissions.MaintenanceManage] = Maintenance,
        [AppPermissions.DocumentsManage] = Documents,
        [AppPermissions.AssembliesManage] = Assemblies,
        [AppPermissions.ReservationsManage] = Reservations,
        [AppPermissions.ExpensesManage] = Expenses,
        [AppPermissions.RentalsManage] = Rentals
    };

    // Modules enabled when a condominium is created (or its type changes).
    public static IReadOnlyList<string> DefaultsFor(CondominiumType type) => type switch
    {
        // A building whose owner rents the units out: no assemblies.
        CondominiumType.Rental => All.Where(module => module != Assemblies).ToList(),
        CondominiumType.Mixed => All,
        // A regular condominium does not rent units out itself.
        _ => All.Where(module => module != Rentals).ToList()
    };

    public static string Serialize(IEnumerable<string> modules) =>
        string.Join(',', All.Where(modules.Contains));

    public static IReadOnlyList<string> Parse(string? value) =>
        string.IsNullOrWhiteSpace(value)
            ? []
            : All.Where(value.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries).Contains).ToList();
}
