using System.ComponentModel.DataAnnotations;

namespace LotteryBig.Api.Entities;

public class Game
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(120)]
    public string Name { get; set; } = "";

    [MaxLength(400)]
    public string ShortDescription { get; set; } = "";

    public string? BannerUrl { get; set; }

    public Guid CategoryId { get; set; }

    public Category? Category { get; set; }

    public GameStatus Status { get; set; } = GameStatus.Draft;

    public int SortOrder { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
