using System.ComponentModel.DataAnnotations;

namespace LotteryBig.Api.Entities;

public class OtpRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(20)]
    public string Phone { get; set; } = "";

    [MaxLength(200)]
    public string CodeHash { get; set; } = "";

    [MaxLength(50)]
    public string Purpose { get; set; } = "login";

    public DateTime ExpiresAtUtc { get; set; }

    public bool IsUsed { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
