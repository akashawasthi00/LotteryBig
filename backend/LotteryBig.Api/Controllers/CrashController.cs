using System.Data;
using System.Security.Claims;
using LotteryBig.Api.Data;
using LotteryBig.Api.Dtos;
using LotteryBig.Api.Entities;
using LotteryBig.Api.Services;
using LotteryBig.Api.Hubs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;

namespace LotteryBig.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/crash")]
public class CrashController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly CrashState _state;
    private readonly IHubContext<CrashHub> _hub;

    public CrashController(AppDbContext db, CrashState state, IHubContext<CrashHub> hub)
    {
        _db = db;
        _state = state;
        _hub = hub;
    }

    [HttpGet("state")]
    public ActionResult<CrashStateDto> GetState()
    {
        lock (_state.SyncRoot)
        {
            return new CrashStateDto(
                _state.RoundId,
                _state.RoundNumber,
                _state.Phase,
                _state.IsEnabled,
                _state.CurrentMultiplier,
                _state.RoundStartedAtUtc,
                _state.NextRoundAtUtc
            );
        }
    }

    [HttpGet("history")]
    public async Task<ActionResult<IEnumerable<CrashHistoryItemDto>>> GetHistory()
    {
        var history = await _db.CrashGameRounds
            .Where(x => x.Status == CrashRoundStatus.Crashed)
            .OrderByDescending(x => x.EndedAtUtc)
            .Take(10)
            .Select(x => new CrashHistoryItemDto(x.Id, x.CrashMultiplier, x.EndedAtUtc ?? x.CreatedAtUtc))
            .ToListAsync();

        return history;
    }

    [HttpGet("bets/current")]
    public async Task<ActionResult<IEnumerable<CrashBetListItemDto>>> GetCurrentBets()
    {
        Guid roundId;
        lock (_state.SyncRoot)
        {
            roundId = _state.RoundId;
        }

        if (roundId == Guid.Empty)
        {
            return Array.Empty<CrashBetListItemDto>();
        }

        var userId = GetUserId();
        var items = await (
                from bet in _db.CrashBets
                join user in _db.Users on bet.UserId equals user.Id into users
                from user in users.DefaultIfEmpty()
                where bet.RoundId == roundId
                orderby bet.CreatedAtUtc descending
                select new CrashBetListItemDto(
                    bet.Id,
                    bet.RoundId,
                    CrashLabel.Mask(user),
                    bet.BetAmount,
                    bet.TargetMultiplier,
                    bet.CashoutMultiplier,
                    bet.WinAmount,
                    bet.Status.ToString(),
                    bet.UserId == userId
                )
            ).ToListAsync();

        return items;
    }

    [HttpPost("bet")]
    public async Task<ActionResult<CrashBetResponse>> PlaceBet(CrashBetRequest request)
    {
        if (request.BetAmount <= 0)
        {
            return BadRequest("Bet amount must be positive.");
        }

        if (request.AutoCashoutMultiplier is not null && request.AutoCashoutMultiplier <= 1m)
        {
            return BadRequest("Auto cashout must be greater than 1.00x.");
        }

        Guid roundId;
        string phase;
        lock (_state.SyncRoot)
        {
            roundId = _state.RoundId;
            phase = _state.Phase;
        }

        if (roundId == Guid.Empty || !string.Equals(phase, "Waiting", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest("Bets are closed for the current round.");
        }

        var userId = GetUserId();

        await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);

        var round = await _db.CrashGameRounds.FirstOrDefaultAsync(x => x.Id == roundId);
        if (round == null || round.Status != CrashRoundStatus.Waiting)
        {
            return BadRequest("Round is not open for betting.");
        }

        var gameEnabled = await _db.Games.AnyAsync(x => x.Name == "Crash Multiplier" && x.Status == GameStatus.Active);
        if (!gameEnabled)
        {
            return BadRequest("Crash game is currently disabled.");
        }

        var existingCount = await _db.CrashBets.CountAsync(x => x.RoundId == roundId && x.UserId == userId);
        if (existingCount >= 2)
        {
            return BadRequest("You can place at most 2 bets per round.");
        }

        var wallet = await _db.Wallets.FirstOrDefaultAsync(x => x.UserId == userId);
        if (wallet == null)
        {
            wallet = new Wallet { UserId = userId };
            _db.Wallets.Add(wallet);
            await _db.SaveChangesAsync();
        }

        if (wallet.Balance < request.BetAmount)
        {
            return BadRequest("Insufficient balance.");
        }

        wallet.Balance -= request.BetAmount;

        _db.WalletTransactions.Add(new WalletTransaction
        {
            WalletId = wallet.Id,
            Type = WalletTransactionType.Debit,
            Amount = request.BetAmount,
            Reason = "Crash bet",
            Reference = "crash"
        });

        var bet = new CrashBet
        {
            RoundId = roundId,
            UserId = userId,
            BetAmount = request.BetAmount,
            TargetMultiplier = request.AutoCashoutMultiplier,
            Status = CrashBetStatus.Active
        };

        _db.CrashBets.Add(bet);
        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        var user = await _db.Users.FirstOrDefaultAsync(x => x.Id == userId);
        await _hub.Clients.All.SendAsync("betPlaced", new
        {
            betId = bet.Id,
            roundId,
            userId,
            userLabel = CrashLabel.Mask(user),
            betAmount = bet.BetAmount,
            targetMultiplier = bet.TargetMultiplier,
            status = bet.Status.ToString()
        });

        return new CrashBetResponse(bet.Id, roundId, request.BetAmount, request.AutoCashoutMultiplier, wallet.Balance, bet.Status.ToString());
    }

    [HttpPost("cashout")]
    public async Task<ActionResult<CrashCashoutResponse>> Cashout(CrashCashoutRequest request)
    {
        Guid roundId;
        string phase;
        decimal multiplier;

        lock (_state.SyncRoot)
        {
            roundId = _state.RoundId;
            phase = _state.Phase;
            multiplier = _state.CurrentMultiplier;
        }

        if (roundId == Guid.Empty || !string.Equals(phase, "InProgress", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest("Round is not in progress.");
        }

        var userId = GetUserId();
        await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);

        var round = await _db.CrashGameRounds.FirstOrDefaultAsync(x => x.Id == roundId);
        if (round == null || round.Status != CrashRoundStatus.InProgress)
        {
            return BadRequest("Round is no longer active.");
        }

        var bet = await _db.CrashBets.FirstOrDefaultAsync(x => x.Id == request.BetId && x.RoundId == roundId && x.UserId == userId && x.Status == CrashBetStatus.Active);
        if (bet == null)
        {
            return BadRequest("No active bet for this round.");
        }

        var wallet = await _db.Wallets.FirstOrDefaultAsync(x => x.UserId == userId);
        if (wallet == null)
        {
            return BadRequest("Wallet not found.");
        }

        var winAmount = Math.Round(bet.BetAmount * multiplier, 2, MidpointRounding.AwayFromZero);

        bet.Status = CrashBetStatus.CashedOut;
        bet.CashoutMultiplier = multiplier;
        bet.WinAmount = winAmount;
        bet.CashedOutAtUtc = DateTime.UtcNow;

        wallet.Balance += winAmount;

        _db.WalletTransactions.Add(new WalletTransaction
        {
            WalletId = wallet.Id,
            Type = WalletTransactionType.Credit,
            Amount = winAmount,
            Reason = "Crash cashout",
            Reference = "crash"
        });

        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        var user = await _db.Users.FirstOrDefaultAsync(x => x.Id == userId);
        await _hub.Clients.All.SendAsync("betCashedOut", new
        {
            betId = bet.Id,
            roundId,
            userId,
            userLabel = CrashLabel.Mask(user),
            betAmount = bet.BetAmount,
            cashoutMultiplier = multiplier,
            winAmount = winAmount,
            status = bet.Status.ToString()
        });

        return new CrashCashoutResponse(bet.Id, roundId, multiplier, winAmount, wallet.Balance);
    }

    private Guid GetUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.Parse(sub ?? throw new InvalidOperationException("Missing user id."));
    }
}
