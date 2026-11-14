namespace backend.Enums;

public enum AgreementStatus
{
    Active = 1,     // Ativo: installments being paid
    Completed = 2,  // Quitado: every installment paid
    Broken = 3,     // Quebrado: an installment went too long unpaid
    Canceled = 4    // Cancelado by the management
}

// How the discount on the fine/interest of the original charges is given.
public enum AgreementDiscountType
{
    None = 0,
    Percent = 1,
    Amount = 2
}
