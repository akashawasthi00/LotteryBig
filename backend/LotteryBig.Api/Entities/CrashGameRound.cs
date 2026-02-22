using System.ComponentModel.DataAnnotations;

namespace LotteryBig.Api.Entities;

public class CrashGameRound
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public long RoundNumber { get; set; }

    public CrashRoundStatus Status { get; set; } = CrashRoundStatus.Waiting;

    [MaxLength(128)]
    public string ServerSeed { get; set; } = "";

    [MaxLength(128)]
    public string ServerSeedHash { get; set; } = "";

    [MaxLength(128)]
    public string ClientSeed { get; set; } = "default";

    public long Nonce { get; set; }

    public decimal CrashMultiplier { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime? StartedAtUtc { get; set; }

    public DateTime? EndedAtUtc { get; set; }

    public List<CrashBet> Bets { get; set; } = new();
}
