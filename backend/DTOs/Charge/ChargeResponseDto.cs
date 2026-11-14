using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Enums;

namespace backend.DTOs.Charge;

public class ChargeResponseDto
{
    public int Id { get; set; }
    public ChargeScope Scope { get; set; }
    public int CreatedByUserId { get; set; }
    public int? TargetUserId { get; set; }
    public int CondominiumId { get; set; }
    public string CondominiumName { get; set; } = string.Empty;
    public int? UnitId { get; set; }
    public string? UnitNumber { get; set; }
    public string? BuildingName { get; set; }
    public decimal Value { get; set; }
    public DateTime DueDate { get; set; }
    public string Description { get; set; } = string.Empty;
    public ChargeCategory Category { get; set; }
    // Null = billed to everyone linked to the unit.
    public int? RecipientPersonId { get; set; }
    public string? RecipientName { get; set; }
    public string? CancelReason { get; set; }
    public ChargeStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CanceledAt { get; set; }

    // When the scheduled job e-mailed the "due soon" and "overdue" reminders (null = not sent).
    public DateTime? DueSoonReminderSentAt { get; set; }
    public DateTime? OverdueReminderSentAt { get; set; }

    // Late fee rule of this charge (null = no fine/interest) and the amounts as of today
    // (São Paulo). UpdatedAmount is what the payer pays now; for paid/canceled charges it is Value.
    public decimal? FinePercent { get; set; }
    public decimal? MonthlyInterestPercent { get; set; }
    public int DaysLate { get; set; }
    public decimal FineAmount { get; set; }
    public decimal InterestAmount { get; set; }
    public decimal UpdatedAmount { get; set; }

    public int? RecurringChargeId { get; set; }
    public DateOnly? ReferenceMonth { get; set; }

    // True when the receiver (the condominium, or the platform for MORAÊ invoices) has Mercado Pago
    // connected; otherwise the payer transfers by Pix and sends a receipt.
    public bool OnlinePaymentAvailable { get; set; }

    // Pix receipts sent by the payer: how many wait for the management and the latest one's result.
    public int PendingProofCount { get; set; }
    public PaymentProofStatus? LatestProofStatus { get; set; }
    public string? LatestProofRejectionReason { get; set; }
}
