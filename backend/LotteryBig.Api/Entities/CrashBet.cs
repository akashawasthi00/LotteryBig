using System.ComponentModel.DataAnnotations;

namespace LotteryBig.Api.Entities;

public class CrashBet
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid RoundId { get; set; }
    public CrashGameRound Round { get; set; } = null!;

    public Guid UserId { get; set; }

    public decimal BetAmount { get; set; }

    public decimal? TargetMultiplier { get; set; }

    public decimal? CashoutMultiplier { get; set; }

    public decimal WinAmount { get; set; }

    public CrashBetStatus Status { get; set; } = CrashBetStatus.Active;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime? CashedOutAtUtc { get; set; }
}
