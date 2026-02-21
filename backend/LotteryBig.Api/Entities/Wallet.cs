using System.ComponentModel.DataAnnotations;

namespace LotteryBig.Api.Entities;

public class Wallet
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    [MaxLength(3)]
    public string Currency { get; set; } = "INR";

    public decimal Balance { get; set; }

    public List<WalletTransaction> Transactions { get; set; } = new();
}
