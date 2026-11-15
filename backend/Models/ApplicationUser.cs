using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using backend.Enums;
using Microsoft.AspNetCore.Identity;

namespace backend.Models;

public class ApplicationUser : IdentityUser<int>
{
    [Required]
    public int PersonId { get; set; }
    public Person Person { get; set; } = null!;
    public ICollection<UserCondominium> UserCondominiums { get; set; } = [];
    // In-app tutorial: the tours and screen tips already seen ("tour:admin,tip:finance"), and
    // whether the screen tips show at all.
    [MaxLength(2000)]
    public string? SeenGuides { get; set; }
    public bool ShowTips { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}