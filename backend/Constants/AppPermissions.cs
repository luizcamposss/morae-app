namespace backend.Constants;

public static class AppPermissions
{
    public const string ResidentsView = "residents.view";
    public const string NewsCreate = "news.create";
    public const string NewsEdit = "news.edit";
    public const string ChargesCreate = "charges.create";
    public const string ChargesMarkAsPaid = "charges.mark_as_paid";
    public const string DelinquencyView = "delinquency.view";
    public const string OccurrencesManage = "occurrences.manage";
    public const string DocumentsManage = "documents.manage";
    public const string MaintenanceManage = "maintenance.manage";
    public const string VisitorsManage = "visitors.manage";

    // Any of these gives a syndic access to the condominium's charges and payments (the "Financeiro" area).
    public static readonly IReadOnlyList<string> FinanceAccess = [ChargesCreate, ChargesMarkAsPaid, DelinquencyView];

    public static readonly IReadOnlySet<string> All = new HashSet<string>
    {
        ResidentsView,
        NewsCreate,
        NewsEdit,
        ChargesCreate,
        ChargesMarkAsPaid,
        DelinquencyView,
        OccurrencesManage,
        DocumentsManage,
        MaintenanceManage,
        VisitorsManage
    };
}
