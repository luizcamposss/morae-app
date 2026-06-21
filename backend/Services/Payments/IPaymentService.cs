using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.DTOs.Payment;

namespace backend.Services.Payments;

public interface IPaymentService
{
    Task<PaymentResponseDto> CreateManualAsync(int userId, int chargeId, CreateManualPaymentDto dto);
    Task<IEnumerable<PaymentResponseDto>> GetByChargeAsync(int userId, int chargeId);
}