using LotteryBig.Api.Data;
using LotteryBig.Api.Dtos;
using LotteryBig.Api.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LotteryBig.Api.Controllers;

[ApiController]
[Route("api/categories")]
public class CategoriesController : ControllerBase
{
    private readonly AppDbContext _db;

    public CategoriesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CategoryWithGamesDto>>> GetCategories()
    {
        var categories = await _db.Categories
            .OrderBy(x => x.SortOrder)
            .ToListAsync();

        var games = await _db.Games
            .Include(x => x.Category)
            .Where(x => x.Status == GameStatus.Active)
            .OrderBy(x => x.SortOrder)
            .ToListAsync();

        var gamesByCategory = games
            .GroupBy(x => x.CategoryId)
            .ToDictionary(g => g.Key, g => g.Select(MapGame).ToList());

        var result = categories.Select(category =>
        {
            gamesByCategory.TryGetValue(category.Id, out var list);
            list ??= new List<GameDto>();
            return new CategoryWithGamesDto(category.Id, category.Name, category.SortOrder, list);
        });

        return result.ToList();
    }

    private static GameDto MapGame(Game game)
    {
        return new GameDto(
            game.Id,
            game.Name,
            game.ShortDescription,
            game.BannerUrl,
            game.CategoryId,
            game.Category?.Name ?? "",
            game.Status.ToString(),
            game.SortOrder
        );
    }
}
