using System.ComponentModel.DataAnnotations;

namespace backend.DTOs.Occurrence;

public class RespondOccurrenceDto
{
    [Required(ErrorMessage = "Escreva a resposta.")]
    [StringLength(2000, ErrorMessage = "A resposta pode ter no máximo 2000 caracteres.")]
    public string Message { get; set; } = string.Empty;
}
