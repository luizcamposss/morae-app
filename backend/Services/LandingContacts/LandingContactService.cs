using AutoMapper;
using backend.Constants;
using backend.Data;
using backend.DTOs.LandingContact;
using backend.Enums;
using backend.Exceptions;
using backend.Models;
using backend.Services.Email;
using backend.Services.Permissions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.LandingContacts;

// Leads from the public landing page. Every new contact e-mails the Masters, who follow up on
// WhatsApp and move the contact's status on their screen.
public class LandingContactService : ILandingContactService
{
    private const int NameMinLength = 2;
    private const int NameMaxLength = 120;
    private const int MaxUnitCount = 10_000;
    // The same WhatsApp within this window updates the previous contact instead of creating another.
    private static readonly TimeSpan RepeatWindow = TimeSpan.FromHours(24);
    // The per-IP limit doesn't stop a bot using many IPs; past this many new contacts in the last
    // hour the contacts are still saved, but the Masters stop getting one e-mail each.
    private const int MaxEmailedContactsPerHour = 30;

    private readonly AppDbContext _context;
    private readonly IMapper _mapper;
    private readonly IPermissionService _permissionService;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IEmailQueue _emailQueue;
    private readonly ILogger<LandingContactService> _logger;

    public LandingContactService(
        AppDbContext context,
        IMapper mapper,
        IPermissionService permissionService,
        UserManager<ApplicationUser> userManager,
        IEmailQueue emailQueue,
        ILogger<LandingContactService> logger)
    {
        _context = context;
        _mapper = mapper;
        _permissionService = permissionService;
        _userManager = userManager;
        _emailQueue = emailQueue;
        _logger = logger;
    }

    public async Task CreateAsync(CreateLandingContactDto dto)
    {
        var name = NormalizeName(dto.Name);
        var whatsApp = NormalizeWhatsApp(dto.WhatsApp);
        var pain = NormalizePain(dto.Pain);

        if (dto.UnitCount < 1 || dto.UnitCount > MaxUnitCount)
            throw new BadRequestException("Informe o número de unidades do condomínio (de 1 a 10.000).");

        if (dto.Profile == LandingContactProfileType.Undefined || !Enum.IsDefined(dto.Profile))
            throw new BadRequestException("Diga se você é administrador(a) ou síndico(a).");

        var now = DateTime.UtcNow;
        var repeatSince = now - RepeatWindow;

        // A second submit (double click, coming back to the page) refreshes the same lead quietly:
        // the visitor sees the same success and the Master gets no second e-mail.
        var recent = await _context.LandingContacts
            .Where(contact => contact.WhatsApp == whatsApp && contact.CreatedAt >= repeatSince)
            .OrderByDescending(contact => contact.CreatedAt)
            .FirstOrDefaultAsync();

        if (recent is not null)
        {
            recent.Name = name;
            recent.UnitCount = dto.UnitCount;
            recent.Profile = dto.Profile;
            recent.Pain = pain ?? recent.Pain;
            recent.UpdatedAt = now;

            await _context.SaveChangesAsync();
            return;
        }

        var contact = new LandingContact
        {
            Name = name,
            WhatsApp = whatsApp,
            UnitCount = dto.UnitCount,
            Profile = dto.Profile,
            Pain = pain,
            Status = LandingContactStatus.New,
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.LandingContacts.Add(contact);
        await _context.SaveChangesAsync();

        var contactsLastHour = await _context.LandingContacts.CountAsync(item => item.CreatedAt >= now.AddHours(-1));

        if (contactsLastHour > MaxEmailedContactsPerHour)
        {
            _logger.LogWarning(
                "Landing contact {ContactId} saved without e-mail: {Count} new contacts in the last hour (limit {Limit}).",
                contact.Id, contactsLastHour, MaxEmailedContactsPerHour);
            return;
        }

        await QueueMasterEmailsAsync(contact);
    }

    public async Task<IEnumerable<LandingContactResponseDto>> GetAllAsync(int userId, LandingContactStatus? status)
    {
        await _permissionService.EnsureMasterAsync(userId);

        if (status is not null)
            EnsureValidStatus(status.Value);

        var query = _context.LandingContacts.AsNoTracking();

        if (status is not null)
            query = query.Where(contact => contact.Status == status.Value);

        var contacts = await query
            .OrderByDescending(contact => contact.CreatedAt)
            .ThenByDescending(contact => contact.Id)
            .ToListAsync();

        return _mapper.Map<List<LandingContactResponseDto>>(contacts);
    }

    public async Task<LandingContactResponseDto> UpdateStatusAsync(int userId, int id, UpdateLandingContactStatusDto dto)
    {
        await _permissionService.EnsureMasterAsync(userId);

        EnsureValidStatus(dto.Status);

        var contact = await _context.LandingContacts.FirstOrDefaultAsync(item => item.Id == id)
            ?? throw new NotFoundException("Contato não encontrado.");

        if (contact.Status != dto.Status)
        {
            contact.Status = dto.Status;
            contact.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        return _mapper.Map<LandingContactResponseDto>(contact);
    }

    private async Task QueueMasterEmailsAsync(LandingContact contact)
    {
        var masters = await _userManager.GetUsersInRoleAsync(AppRoles.Master);
        var email = LandingContactEmails.NewContact(contact);

        foreach (var address in masters
                     .Select(master => master.Email)
                     .Where(address => !string.IsNullOrWhiteSpace(address))
                     .Distinct(StringComparer.OrdinalIgnoreCase))
        {
            _emailQueue.Enqueue(email.ToMessage(address!));
        }
    }

    private static void EnsureValidStatus(LandingContactStatus status)
    {
        if (status == LandingContactStatus.Undefined || !Enum.IsDefined(status))
            throw new BadRequestException("Status de contato inválido.");
    }

    private static string NormalizeName(string? value)
    {
        // Collapses repeated spaces so "  Ana   Souza " is stored as "Ana Souza".
        var name = string.Join(' ', (value ?? string.Empty)
            .Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));

        if (name.Length < NameMinLength)
            throw new BadRequestException("Informe seu nome.");

        if (name.Length > NameMaxLength)
            throw new BadRequestException($"O nome pode ter no máximo {NameMaxLength} caracteres.");

        return name;
    }

    // Keeps only the digits. Brazilian numbers typed without the country code (DDD + number,
    // 10 or 11 digits) get the 55 in front, so the same phone is always stored the same way.
    private static string NormalizeWhatsApp(string? value)
    {
        var digits = new string((value ?? string.Empty).Where(char.IsAsciiDigit).ToArray());

        if (digits.Length < 10 || digits.Length > 13)
            throw new BadRequestException("Informe um WhatsApp válido, com DDD.");

        if (digits.Length is 10 or 11)
            digits = "55" + digits;

        return digits;
    }

    private static string? NormalizePain(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var pain = value.Trim().ToLowerInvariant();

        if (!LandingContactTexts.IsKnownPain(pain))
            throw new BadRequestException("Opção escolhida inválida.");

        return pain;
    }
}
