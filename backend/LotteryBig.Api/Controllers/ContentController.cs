using LotteryBig.Api.Data;
using LotteryBig.Api.Dtos;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LotteryBig.Api.Controllers;

[ApiController]
[Route("api/content")]
public class ContentController : ControllerBase
{
    private readonly AppDbContext _db;

    public ContentController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("home")]
    public async Task<ActionResult<HomeContentDto>> GetHome()
    {
        var banners = await _db.Banners.OrderBy(x => x.SortOrder).ToListAsync();
        var games = await _db.Games.OrderBy(x => x.SortOrder).Take(6).ToListAsync();
        var pages = await _db.ContentPages.OrderByDescending(x => x.UpdatedAtUtc).Take(4).ToListAsync();

        return new HomeContentDto(
            banners.Select(x => new BannerDto(x.Headline, x.Subheadline, x.ImageUrl, x.CtaText, x.CtaLink, x.SortOrder)),
            games.Select(x => new GameDto(x.Id, x.Name, x.ShortDescription, x.BannerUrl, x.Status.ToString(), x.SortOrder)),
            pages.Select(x => new ContentPageDto(x.Slug, x.Title, x.Body))
        );
    }
}
