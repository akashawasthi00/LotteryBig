using System.ComponentModel.DataAnnotations;

namespace LotteryBig.Api.Entities;

public class ContentPage
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(100)]
    public string Slug { get; set; } = "";

    [MaxLength(150)]
    public string Title { get; set; } = "";

    public string Body { get; set; } = "";

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

public class Banner
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(200)]
    public string Headline { get; set; } = "";

    [MaxLength(400)]
    public string Subheadline { get; set; } = "";

    public string? ImageUrl { get; set; }

    [MaxLength(200)]
    public string? CtaText { get; set; }

    [MaxLength(200)]
    public string? CtaLink { get; set; }

    public int SortOrder { get; set; }
}
