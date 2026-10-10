using backend.Constants;
using backend.Data;
using backend.DTOs.Document;
using backend.Enums;
using backend.Exceptions;
using backend.Models;
using backend.Services.Notifications;
using backend.Services.Permissions;
using backend.Services.Storage;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Documents;

public class DocumentService : IDocumentService
{
    private readonly AppDbContext _context;
    private readonly IPermissionService _permissionService;
    private readonly IFileStorage _fileStorage;
    private readonly INotificationService _notificationService;
    private readonly ILogger<DocumentService> _logger;

    public DocumentService(
        AppDbContext context,
        IPermissionService permissionService,
        IFileStorage fileStorage,
        INotificationService notificationService,
        ILogger<DocumentService> logger)
    {
        _context = context;
        _permissionService = permissionService;
        _fileStorage = fileStorage;
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task<DocumentResponseDto> CreateAsync(int userId, int condominiumId, CreateDocumentDto dto)
    {
        await _permissionService.EnsureCondominiumPermissionAsync(userId, condominiumId, AppPermissions.DocumentsManage);

        ValidateDetails(dto.Title, dto.Description, dto.Category, dto.Visibility);

        if (dto.File is null || dto.File.Length == 0)
            throw new BadRequestException("Escolha o arquivo do documento.");

        if (dto.File.Length > UploadedFileInspector.MaxFileSizeBytes)
            throw new BadRequestException("O arquivo pode ter no máximo 20 MB.");

        await using var content = dto.File.OpenReadStream();

        var detected = UploadedFileInspector.Detect(content)
            ?? throw new BadRequestException(UploadedFileInspector.AcceptedTypesMessage);

        var document = new Document
        {
            CondominiumId = condominiumId,
            Title = dto.Title.Trim(),
            Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim(),
            Category = dto.Category,
            Visibility = dto.Visibility,
            OriginalFileName = UploadedFileInspector.BuildFileName(dto.File.FileName, detected, "documento"),
            ContentType = detected.ContentType,
            SizeBytes = dto.File.Length,
            StorageKey = $"documents/{condominiumId}/{Guid.NewGuid():N}",
            UploadedByUserId = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // File first, then the record: if saving the record fails, the file is removed again.
        await _fileStorage.SaveAsync(document.StorageKey, content);

        try
        {
            _context.Documents.Add(document);
            await _context.SaveChangesAsync();
        }
        catch
        {
            await _fileStorage.DeleteAsync(document.StorageKey);
            throw;
        }

        await NotifyNewDocumentAsync(document, userId);

        return await GetResponseAsync(document.Id);
    }

    public async Task<IEnumerable<DocumentResponseDto>> GetByCondominiumAsync(
        int userId,
        int condominiumId,
        DocumentCategory? category)
    {
        await _permissionService.EnsureCondominiumAccessAsync(userId, condominiumId);

        var seesManagementDocuments = await IsManagementAsync(userId, condominiumId);

        return await _context.Documents
            .AsNoTracking()
            .Where(document =>
                document.CondominiumId == condominiumId &&
                (category == null || document.Category == category) &&
                (seesManagementDocuments || document.Visibility == DocumentVisibility.Everyone))
            .OrderByDescending(document => document.CreatedAt)
            .Select(ToResponse())
            .ToListAsync();
    }

    public async Task<DocumentResponseDto> UpdateAsync(int userId, int documentId, UpdateDocumentDto dto)
    {
        var document = await _context.Documents.FirstOrDefaultAsync(item => item.Id == documentId)
            ?? throw new NotFoundException("Documento não encontrado.");

        await _permissionService.EnsureCondominiumPermissionAsync(
            userId, document.CondominiumId, AppPermissions.DocumentsManage);

        ValidateDetails(dto.Title, dto.Description, dto.Category, dto.Visibility);

        document.Title = dto.Title.Trim();
        document.Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim();
        document.Category = dto.Category;
        document.Visibility = dto.Visibility;
        document.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await GetResponseAsync(document.Id);
    }

    public async Task DeleteAsync(int userId, int documentId)
    {
        var document = await _context.Documents.FirstOrDefaultAsync(item => item.Id == documentId)
            ?? throw new NotFoundException("Documento não encontrado.");

        await _permissionService.EnsureCondominiumPermissionAsync(
            userId, document.CondominiumId, AppPermissions.DocumentsManage);

        _context.Documents.Remove(document);
        await _context.SaveChangesAsync();

        try
        {
            await _fileStorage.DeleteAsync(document.StorageKey);
        }
        catch (Exception exception)
        {
            // The document is already gone for users; a leftover file only takes disk space.
            _logger.LogError(exception, "Could not delete the file of document {DocumentId}.", documentId);
        }
    }

    public async Task<DocumentDownload> DownloadAsync(int userId, int documentId)
    {
        var document = await _context.Documents
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == documentId)
            ?? throw new NotFoundException("Documento não encontrado.");

        await _permissionService.EnsureCondominiumAccessAsync(userId, document.CondominiumId);

        // Same answer as a missing document: does not reveal that a management document exists.
        if (document.Visibility == DocumentVisibility.ManagementOnly &&
            !await IsManagementAsync(userId, document.CondominiumId))
            throw new NotFoundException("Documento não encontrado.");

        var content = await _fileStorage.OpenReadAsync(document.StorageKey);

        if (content is null)
        {
            _logger.LogError("File of document {DocumentId} is missing from storage.", documentId);
            throw new NotFoundException("O arquivo deste documento não está disponível. Avise a administração.");
        }

        return new DocumentDownload(content, document.ContentType, document.OriginalFileName);
    }

    private async Task<bool> IsManagementAsync(int userId, int condominiumId)
    {
        var role = await _permissionService.GetCondominiumRoleAsync(userId, condominiumId);
        return role is AppRoles.Admin or AppRoles.Syndic;
    }

    private async Task NotifyNewDocumentAsync(Document document, int uploaderId)
    {
        var recipients = await _context.UserCondominiums
            .AsNoTracking()
            .Where(link =>
                link.CondominiumId == document.CondominiumId &&
                link.Status == UserCondominiumStatus.Active &&
                link.UserId != uploaderId &&
                (document.Visibility == DocumentVisibility.Everyone ||
                 link.Role == AppRoles.Admin ||
                 link.Role == AppRoles.Syndic))
            .Select(link => new { link.UserId, link.Role })
            .ToListAsync();

        var message = $"{GetCategoryLabel(document.Category)}: \"{document.Title}\" está disponível para consulta.";

        // One link per role, since each role has its own documents page.
        foreach (var group in recipients.GroupBy(recipient => recipient.Role))
        {
            await _notificationService.CreateManyAsync(
                group.Select(recipient => recipient.UserId),
                NotificationType.News,
                "Novo documento",
                message,
                GetDocumentsLink(group.Key),
                document.CondominiumId);
        }
    }

    private static void ValidateDetails(
        string? title,
        string? description,
        DocumentCategory category,
        DocumentVisibility visibility)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new BadRequestException("Informe o título do documento.");

        if (title.Trim().Length > 150)
            throw new BadRequestException("O título pode ter no máximo 150 caracteres.");

        if (description?.Trim().Length > 1000)
            throw new BadRequestException("A descrição pode ter no máximo 1000 caracteres.");

        if (category == DocumentCategory.Undefined || !Enum.IsDefined(category))
            throw new BadRequestException("Escolha a categoria do documento.");

        if (visibility == DocumentVisibility.Undefined || !Enum.IsDefined(visibility))
            throw new BadRequestException("Escolha quem pode ver o documento.");
    }

    private static string GetCategoryLabel(DocumentCategory category)
    {
        return category switch
        {
            DocumentCategory.Convention => "Convenção",
            DocumentCategory.InternalRules => "Regimento interno",
            DocumentCategory.Minutes => "Ata",
            DocumentCategory.Financial => "Prestação de contas",
            DocumentCategory.Contract => "Contrato",
            _ => "Documento"
        };
    }

    private static string GetDocumentsLink(string role)
    {
        return role switch
        {
            AppRoles.Admin => "/admin/documents",
            AppRoles.Syndic => "/syndic/documents",
            _ => "/resident/documents"
        };
    }

    private async Task<DocumentResponseDto> GetResponseAsync(int documentId)
    {
        return await _context.Documents
            .AsNoTracking()
            .Where(document => document.Id == documentId)
            .Select(ToResponse())
            .FirstAsync();
    }

    private static System.Linq.Expressions.Expression<Func<Document, DocumentResponseDto>> ToResponse()
    {
        return document => new DocumentResponseDto
        {
            Id = document.Id,
            CondominiumId = document.CondominiumId,
            Title = document.Title,
            Description = document.Description,
            Category = document.Category,
            Visibility = document.Visibility,
            FileName = document.OriginalFileName,
            ContentType = document.ContentType,
            SizeBytes = document.SizeBytes,
            UploadedByName = document.UploadedByUser.Person.Name,
            CreatedAt = document.CreatedAt,
            UpdatedAt = document.UpdatedAt
        };
    }
}
