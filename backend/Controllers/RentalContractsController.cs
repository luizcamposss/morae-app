using System.Security.Claims;
using backend.DTOs.Rental;
using backend.Services.Rentals;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

// Rental contracts of units (module "Aluguéis"): the rent goes into the tenant's monthly bill.
[ApiController]
[Authorize]
public class RentalContractsController : ControllerBase
{
    private readonly IRentalContractService _rentalService;

    public RentalContractsController(IRentalContractService rentalService)
    {
        _rentalService = rentalService;
    }

    [HttpGet("api/condominiums/{condominiumId}/rental-contracts")]
    public async Task<IActionResult> GetByCondominium([FromRoute] int condominiumId) =>
        Ok(await _rentalService.GetByCondominiumAsync(GetUserId(), condominiumId));

    [HttpPost("api/condominiums/{condominiumId}/rental-contracts")]
    public async Task<IActionResult> Create([FromRoute] int condominiumId, [FromBody] SaveRentalContractDto dto) =>
        Ok(await _rentalService.CreateAsync(GetUserId(), condominiumId, dto));

    [HttpPut("api/rental-contracts/{id}")]
    public async Task<IActionResult> Update([FromRoute] int id, [FromBody] SaveRentalContractDto dto) =>
        Ok(await _rentalService.UpdateAsync(GetUserId(), id, dto));

    [HttpPost("api/rental-contracts/{id}/adjust")]
    public async Task<IActionResult> Adjust([FromRoute] int id, [FromBody] AdjustRentDto dto) =>
        Ok(await _rentalService.AdjustAsync(GetUserId(), id, dto));

    [HttpPost("api/rental-contracts/{id}/end")]
    public async Task<IActionResult> End([FromRoute] int id, [FromBody] EndRentalContractDto dto) =>
        Ok(await _rentalService.EndAsync(GetUserId(), id, dto));

    [HttpGet("api/my/rental-contracts")]
    public async Task<IActionResult> GetMine() => Ok(await _rentalService.GetMineAsync(GetUserId()));

    private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
