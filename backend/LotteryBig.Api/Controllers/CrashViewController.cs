using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LotteryBig.Api.Controllers;

[Authorize]
public class CrashViewController : Controller
{
    [HttpGet("/crash/view")]
    public IActionResult Index()
    {
        return View();
    }
}
