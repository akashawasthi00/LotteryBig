using LotteryBig.Api.Data;
using LotteryBig.Api.Dtos;
using LotteryBig.Api.Entities;
using LotteryBig.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace LotteryBig.Api.Controllers;

[ApiController]
[Authorize(Policy = "admin")]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly WalletService _walletService;
    private readonly AuditService _auditService;

    public AdminController(AppDbContext db, WalletService walletService, AuditService auditService)
    {
        _db = db;
        _walletService = walletService;
        _auditService = auditService;
    }

    [HttpGet("users")]
    public async Task<ActionResult<IEnumerable<UserProfileDto>>> GetUsers()
    {
        var users = await _db.Users.Include(x => x.Wallet)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(200)
            .ToListAsync();

        return users.Select(x => new UserProfileDto(
            x.Id,
            x.Email,
            x.Phone,
            x.IsEmailVerified,
            x.IsPhoneVerified,
            x.IsAdmin,
            x.Status.ToString(),
            x.Wallet?.Balance ?? 0m
        )).ToList();
    }

    [HttpPost("users/{id:guid}/ban")]
    public async Task<IActionResult> BanUser(Guid id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null)
        {
            return NotFound();
        }

        user.Status = UserStatus.Banned;
        await _db.SaveChangesAsync();
        await _auditService.LogAsync(GetActorId(), "user.ban", $"User {user.Id} banned.");

        return Ok();
    }

    [HttpPost("users/{id:guid}/unban")]
    public async Task<IActionResult> UnbanUser(Guid id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null)
        {
            return NotFound();
        }

        user.Status = UserStatus.Active;
        await _db.SaveChangesAsync();
        await _auditService.LogAsync(GetActorId(), "user.unban", $"User {user.Id} unbanned.");

        return Ok();
    }

    [HttpPost("wallet/adjust")]
    public async Task<ActionResult<WalletTransactionDto>> AdjustWallet(WalletAdjustRequest request)
    {
        if (request.Amount == 0)
        {
            return BadRequest("Amount must be non-zero.");
        }

        WalletTransaction? tx;
        if (request.Amount > 0)
        {
            tx = await _walletService.CreditAsync(request.UserId, request.Amount, request.Reason, "admin");
        }
        else
        {
            tx = await _walletService.DebitAsync(request.UserId, Math.Abs(request.Amount), request.Reason, "admin");
            if (tx == null)
            {
                return BadRequest("Insufficient balance.");
            }
        }

        return new WalletTransactionDto(tx.Id, tx.Type.ToString(), tx.Amount, tx.Reason, tx.Reference, tx.CreatedAtUtc);
    }

    [HttpPost("games")]
    public async Task<ActionResult<GameDto>> CreateGame(GameUpsertRequest request)
    {
        var game = new Game
        {
            Name = request.Name,
            ShortDescription = request.ShortDescription,
            BannerUrl = request.BannerUrl,
            Status = ParseStatus(request.Status),
            SortOrder = request.SortOrder
        };

        _db.Games.Add(game);
        await _db.SaveChangesAsync();
        await _auditService.LogAsync(GetActorId(), "game.create", $"Game {game.Id} created.");

        return MapGame(game);
    }

    [HttpPut("games/{id:guid}")]
    public async Task<ActionResult<GameDto>> UpdateGame(Guid id, GameUpsertRequest request)
    {
        var game = await _db.Games.FindAsync(id);
        if (game == null)
        {
            return NotFound();
        }

        game.Name = request.Name;
        game.ShortDescription = request.ShortDescription;
        game.BannerUrl = request.BannerUrl;
        game.Status = ParseStatus(request.Status);
        game.SortOrder = request.SortOrder;

        await _db.SaveChangesAsync();
        await _auditService.LogAsync(GetActorId(), "game.update", $"Game {game.Id} updated.");

        return MapGame(game);
    }

    [HttpPost("content")]
    public async Task<ActionResult<ContentPageDto>> UpsertContent(ContentUpsertRequest request)
    {
        var page = await _db.ContentPages.FirstOrDefaultAsync(x => x.Slug == request.Slug);
        if (page == null)
        {
            page = new ContentPage
            {
                Slug = request.Slug,
                Title = request.Title,
                Body = request.Body
            };
            _db.ContentPages.Add(page);
        }
        else
        {
            page.Title = request.Title;
            page.Body = request.Body;
            page.UpdatedAtUtc = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        await _auditService.LogAsync(GetActorId(), "content.upsert", $"Content {page.Slug} upserted.");
        return new ContentPageDto(page.Slug, page.Title, page.Body);
    }

    [HttpGet("reports/summary")]
    public async Task<ActionResult<ReportSummaryDto>> GetSummary()
    {
        var totalUsers = await _db.Users.CountAsync();
        var activeUsers = await _db.Users.CountAsync(x => x.Status == UserStatus.Active);
        var totalPoints = await _db.Wallets.SumAsync(x => x.Balance);
        var txCount = await _db.WalletTransactions.CountAsync();

        return new ReportSummaryDto(totalUsers, activeUsers, totalPoints, txCount);
    }

    [HttpGet("reports/dashboard")]
    public async Task<ActionResult<DashboardSeriesDto>> GetDashboard()
    {
        var since = DateTime.UtcNow.Date.AddDays(-13);

        var signups = await _db.Users
            .Where(x => x.CreatedAtUtc >= since)
            .GroupBy(x => x.CreatedAtUtc.Date)
            .Select(g => new TimeSeriesPointDto(g.Key.ToString("yyyy-MM-dd"), (decimal)g.Count()))
            .ToListAsync();

        var active = await _db.Users
            .Where(x => x.LastLoginAtUtc != null && x.LastLoginAtUtc >= since)
            .GroupBy(x => x.LastLoginAtUtc!.Value.Date)
            .Select(g => new TimeSeriesPointDto(g.Key.ToString("yyyy-MM-dd"), (decimal)g.Count()))
            .ToListAsync();

        var topups = await _db.WalletTransactions
            .Where(x => x.CreatedAtUtc >= since && x.Type == WalletTransactionType.Credit)
            .GroupBy(x => x.CreatedAtUtc.Date)
            .Select(g => new TimeSeriesPointDto(g.Key.ToString("yyyy-MM-dd"), g.Sum(x => x.Amount)))
            .ToListAsync();

        var withdrawals = await _db.WalletTransactions
            .Where(x => x.CreatedAtUtc >= since && x.Type == WalletTransactionType.Debit)
            .GroupBy(x => x.CreatedAtUtc.Date)
            .Select(g => new TimeSeriesPointDto(g.Key.ToString("yyyy-MM-dd"), g.Sum(x => x.Amount)))
            .ToListAsync();

        var buckets = await _db.Wallets.ToListAsync();
        var bucketed = buckets
            .GroupBy(x => GetBucketLabel(x.Balance))
            .Select(g => new TimeSeriesPointDto(g.Key, (decimal)g.Count()))
            .ToList();

        return new DashboardSeriesDto(signups, active, topups, withdrawals, bucketed);
    }

    [HttpGet("audit")]
    public async Task<ActionResult<IEnumerable<AuditLog>>> GetAuditLogs()
    {
        var logs = await _db.AuditLogs
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(200)
            .ToListAsync();

        return logs;
    }

    private static GameStatus ParseStatus(string status)
    {
        return Enum.TryParse<GameStatus>(status, true, out var parsed) ? parsed : GameStatus.Draft;
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

    private static string GetBucketLabel(decimal balance)
    {
        if (balance < 100) return "0-99";
        if (balance < 500) return "100-499";
        if (balance < 1000) return "500-999";
        if (balance < 5000) return "1000-4999";
        return "5000+";
    }

    private Guid? GetActorId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.TryParse(sub, out var id) ? id : null;
    }
}
