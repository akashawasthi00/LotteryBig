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
[Route("api/wallet")]
public class WalletController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly WalletService _walletService;
    private readonly AuditService _auditService;

    public WalletController(AppDbContext db, WalletService walletService, AuditService auditService)
    {
        _db = db;
        _walletService = walletService;
        _auditService = auditService;
    }

    [HttpGet("balance")]
    public async Task<ActionResult<WalletBalanceDto>> GetBalance()
    {
        var userId = GetUserId();
        var wallet = await _walletService.GetWalletAsync(userId);
        return new WalletBalanceDto(wallet.Balance, wallet.Currency);
    }

    [HttpGet("transactions")]
    public async Task<ActionResult<IEnumerable<WalletTransactionDto>>> GetTransactions()
    {
        var userId = GetUserId();
        var wallet = await _db.Wallets.Include(x => x.Transactions)
            .FirstOrDefaultAsync(x => x.UserId == userId);

        if (wallet == null)
        {
            return Ok(Array.Empty<WalletTransactionDto>());
        }

        var txs = wallet.Transactions
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(50)
            .Select(x => new WalletTransactionDto(
                x.Id,
                GetDisplayType(x),
                x.Amount,
                x.Reason,
                x.Reference,
                x.CreatedAtUtc
            ));

        return Ok(txs);
    }

    [HttpPost("topup")]
    public async Task<ActionResult<WalletTransactionDto>> Topup(WalletTopupRequest request)
    {
        if (request.Amount <= 0)
        {
            return BadRequest("Amount must be positive.");
        }

        var userId = GetUserId();
        var tx = await _walletService.CreditAsync(userId, request.Amount, "Topup", request.Reference);
        await _auditService.LogAsync(userId, "wallet.topup", $"Topup {tx.Amount} for {userId}.");

        return new WalletTransactionDto(tx.Id, GetDisplayType(tx), tx.Amount, tx.Reason, tx.Reference, tx.CreatedAtUtc);
    }

    [HttpPost("withdraw")]
    public async Task<ActionResult<WalletTransactionDto>> Withdraw(WalletWithdrawRequest request)
    {
        if (request.Amount <= 0)
        {
            return BadRequest("Amount must be positive.");
        }

        var userId = GetUserId();
        var tx = await _walletService.DebitAsync(userId, request.Amount, "Withdrawal", request.Reference);
        if (tx == null)
        {
            return BadRequest("Insufficient balance.");
        }

        await _auditService.LogAsync(userId, "wallet.withdraw", $"Withdraw {tx.Amount} for {userId}.");
        return new WalletTransactionDto(tx.Id, GetDisplayType(tx), tx.Amount, tx.Reason, tx.Reference, tx.CreatedAtUtc);
    }

    private Guid GetUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.Parse(sub ?? throw new InvalidOperationException("Missing user id"));
    }

    private static string GetDisplayType(WalletTransaction tx)
    {
        var reason = tx.Reason ?? string.Empty;
        if (reason.Contains("Win", StringComparison.OrdinalIgnoreCase))
        {
            return "Win";
        }

        if (reason.Contains("Bet", StringComparison.OrdinalIgnoreCase))
        {
            return "Loss";
        }

        if (reason.Contains("Topup", StringComparison.OrdinalIgnoreCase))
        {
            return "Credit";
        }

        if (reason.Contains("Withdrawal", StringComparison.OrdinalIgnoreCase))
        {
            return "Deposit";
        }

        return tx.Type.ToString();
    }
}
