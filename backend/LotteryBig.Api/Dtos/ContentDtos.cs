namespace LotteryBig.Api.Dtos;

public record GameDto(
    Guid Id,
    string Name,
    string ShortDescription,
    string? BannerUrl,
    string Status,
    int SortOrder
);

public record GameUpsertRequest(
    string Name,
    string ShortDescription,
    string? BannerUrl,
    string Status,
    int SortOrder
);

public record ContentPageDto(string Slug, string Title, string Body);
public record ContentUpsertRequest(string Slug, string Title, string Body);

public record BannerDto(string Headline, string Subheadline, string? ImageUrl, string? CtaText, string? CtaLink, int SortOrder);
public record HomeContentDto(IEnumerable<BannerDto> Banners, IEnumerable<GameDto> FeaturedGames, IEnumerable<ContentPageDto> Pages);

public record ReportSummaryDto(int TotalUsers, int ActiveUsers, decimal TotalPointsIssued, int TransactionsCount);
public record TimeSeriesPointDto(string Date, decimal Value);
public record DashboardSeriesDto(
    IEnumerable<TimeSeriesPointDto> DailySignups,
    IEnumerable<TimeSeriesPointDto> DailyActiveUsers,
    IEnumerable<TimeSeriesPointDto> PointTopups,
    IEnumerable<TimeSeriesPointDto> Withdrawals,
    IEnumerable<TimeSeriesPointDto> WalletBalanceBuckets
);
