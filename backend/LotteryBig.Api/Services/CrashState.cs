namespace LotteryBig.Api.Services;

public class CrashState
{
    public object SyncRoot { get; } = new();
    public Guid RoundId { get; set; }
    public long RoundNumber { get; set; }
    public string Phase { get; set; } = "Waiting";
    public bool IsEnabled { get; set; } = true;
    public decimal CurrentMultiplier { get; set; } = 1.00m;
    public decimal CrashPoint { get; set; } = 1.00m;
    public DateTime? RoundStartedAtUtc { get; set; }
    public DateTime? NextRoundAtUtc { get; set; }
    public bool HasActiveRound => RoundId != Guid.Empty;
}
