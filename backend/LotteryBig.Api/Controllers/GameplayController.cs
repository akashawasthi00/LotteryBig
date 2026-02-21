using System.Security.Claims;
using LotteryBig.Api.Data;
using LotteryBig.Api.Dtos;
using LotteryBig.Api.Entities;
using LotteryBig.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LotteryBig.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/gameplay")]
public class GameplayController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly WalletService _walletService;
    private readonly GameEngineService _gameEngineService;
    private readonly AuditService _auditService;

    public GameplayController(
        AppDbContext db,
        WalletService walletService,
        GameEngineService gameEngineService,
        AuditService auditService)
    {
        _db = db;
        _walletService = walletService;
        _gameEngineService = gameEngineService;
        _auditService = auditService;
    }

    [HttpPost("play")]
    public async Task<ActionResult<PlayGameResponse>> Play(PlayGameRequest request)
    {
        if (request.BetAmount <= 0)
        {
            return BadRequest("Bet amount must be positive.");
        }

        var game = await _db.Games.FirstOrDefaultAsync(x => x.Id == request.GameId && x.Status == GameStatus.Active);
        if (game == null)
        {
            return NotFound("Game not found or inactive.");
        }

        var userId = GetUserId();
        var debit = await _walletService.DebitAsync(userId, request.BetAmount, $"{game.Name} Bet", "gameplay");
        if (debit == null)
        {
            return BadRequest("Insufficient balance.");
        }

        var result = _gameEngineService.Resolve(game.Name, request.Choice, request.CashoutAt, request.TargetMultiplier);
        var payout = result.Won ? Math.Round(request.BetAmount * result.Multiplier, 2) : 0m;
        if (payout > 0)
        {
            await _walletService.CreditAsync(userId, payout, $"{game.Name} Win", "gameplay");
        }

        var wallet = await _walletService.GetWalletAsync(userId);
        var profit = payout - request.BetAmount;

        await _auditService.LogAsync(
            userId,
            "game.play",
            $"{game.Name} | bet={request.BetAmount} | payout={payout} | outcome={result.Outcome}");

        return new PlayGameResponse(
            result.Won,
            payout,
            profit,
            wallet.Balance,
            result.Multiplier,
            result.Outcome
        );
    }

    private Guid GetUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.Parse(sub ?? throw new InvalidOperationException("Missing user id."));
    }
}
