using System.ComponentModel.DataAnnotations;

namespace LotteryBig.Api.Entities;

public class PaymentRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    [MaxLength(100)]
    public string Provider { get; set; } = "razorpay";

    [MaxLength(100)]
    public string ProviderOrderId { get; set; } = "";

    public decimal Amount { get; set; }

    public PaymentStatus Status { get; set; } = PaymentStatus.Created;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAtUtc { get; set; }
}
