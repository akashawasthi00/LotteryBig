using System.ComponentModel.DataAnnotations;

namespace LotteryBig.Api.Entities;

public class WalletTransaction
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid WalletId { get; set; }
    public Wallet Wallet { get; set; } = null!;

    public WalletTransactionType Type { get; set; }

    public decimal Amount { get; set; }

    [MaxLength(200)]
    public string Reason { get; set; } = "";

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    [MaxLength(100)]
    public string Reference { get; set; } = "";
}
