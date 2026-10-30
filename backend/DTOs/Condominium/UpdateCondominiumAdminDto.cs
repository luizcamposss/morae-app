using System.ComponentModel.DataAnnotations;

namespace backend.DTOs.Condominium;

public class UpdateCondominiumAdminDto
{
    [Required]
    public int AdminUserId { get; set; }
}
