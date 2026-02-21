using System.ComponentModel.DataAnnotations;

namespace LotteryBig.Api.Entities;

public class AuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid? ActorUserId { get; set; }

    [MaxLength(100)]
    public string Action { get; set; } = "";

    [MaxLength(500)]
    public string Summary { get; set; } = "";

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
