using System.Security.Claims;
using backend.DTOs.News;
using backend.Services.News;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class NewsController : ControllerBase
{
    private readonly INewsService _newsService;

    public NewsController(INewsService newsService)
    {
        _newsService = newsService;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateNewsDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var news = await _newsService.CreateAsync(userId, dto);

        return CreatedAtAction(
            nameof(GetById),
            new { id = news.Id },
            news
        );
    }

    [HttpGet("platform")]
    public async Task<IActionResult> GetPlatform()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var news = await _newsService.GetPlatformAsync(userId);

        return Ok(news);
    }

    [HttpGet("/api/condominiums/{condominiumId}/news")]
    public async Task<IActionResult> GetByCondominium([FromRoute] int condominiumId)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var news = await _newsService.GetByCondominiumAsync(userId, condominiumId);

        if (news is null)
            return NotFound();

        return Ok(news);
    }
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById([FromRoute] int id)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var news = await _newsService.GetByIdAsync(userId, id);

        if (news is null)
            return NotFound();

        return Ok(news);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(
        [FromRoute] int id,
        [FromBody] UpdateNewsDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var updated = await _newsService.UpdateAsync(userId, id, dto);

        if (!updated)
            return NotFound();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete([FromRoute] int id)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var deleted = await _newsService.DeleteAsync(userId, id);

        if (!deleted)
            return NotFound();

        return NoContent();
    }
}