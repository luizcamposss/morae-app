using backend.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PermissionsController : ControllerBase
{
    [HttpGet]
    public ActionResult<IEnumerable<string>> GetAll()
    {
        return Ok(AppPermissions.All);
    }
}