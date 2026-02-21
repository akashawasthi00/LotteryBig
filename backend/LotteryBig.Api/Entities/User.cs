using System.ComponentModel.DataAnnotations;

namespace LotteryBig.Api.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(200)]
    public string? Email { get; set; }

    [MaxLength(20)]
    public string? Phone { get; set; }

    [MaxLength(200)]
    public string? PasswordHash { get; set; }

    public bool IsEmailVerified { get; set; }
    public bool IsPhoneVerified { get; set; }

    public bool IsAdmin { get; set; }

    public UserStatus Status { get; set; } = UserStatus.Active;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAtUtc { get; set; }

    public Wallet Wallet { get; set; } = new();
}
