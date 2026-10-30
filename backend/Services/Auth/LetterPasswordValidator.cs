using backend.Models;
using Microsoft.AspNetCore.Identity;

namespace backend.Services.Auth;

// Identity can require a lowercase or an uppercase letter, but not "any letter".
public class LetterPasswordValidator : IPasswordValidator<ApplicationUser>
{
    public Task<IdentityResult> ValidateAsync(
        UserManager<ApplicationUser> manager,
        ApplicationUser user,
        string? password)
    {
        if (!string.IsNullOrEmpty(password) && password.Any(char.IsLetter))
            return Task.FromResult(IdentityResult.Success);

        return Task.FromResult(IdentityResult.Failed(new IdentityError
        {
            Code = "PasswordRequiresLetter",
            Description = "A senha precisa ter pelo menos uma letra."
        }));
    }
}
