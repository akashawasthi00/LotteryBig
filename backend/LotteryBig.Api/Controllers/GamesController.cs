using LotteryBig.Api.Data;
using LotteryBig.Api.Dtos;
using LotteryBig.Api.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LotteryBig.Api.Controllers;

[ApiController]
[Route("api/games")]
public class GamesController : ControllerBase
{
    private readonly AppDbContext _db;

    public GamesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<GameDto>>> GetGames()
    {
        var games = await _db.Games
            .Where(x => x.Status == GameStatus.Active)
            .OrderBy(x => x.SortOrder)
            .ToListAsync();

        return games.Select(MapGame).ToList();
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<GameDto>> GetGame(Guid id)
    {
        var game = await _db.Games.FindAsync(id);
        if (game == null)
        {
            return NotFound();
        }

        return MapGame(game);
    }

    private static GameDto MapGame(Game game)
    {
        return new GameDto(
            game.Id,
            game.Name,
            game.ShortDescription,
            game.BannerUrl,
            game.Status.ToString(),
            game.SortOrder
        );
    }
}
