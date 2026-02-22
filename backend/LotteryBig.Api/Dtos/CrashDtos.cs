namespace LotteryBig.Api.Dtos;

public record CrashStateDto(
    Guid RoundId,
    long RoundNumber,
    string Phase,
    bool IsEnabled,
    decimal Multiplier,
    DateTime? RoundStartedAtUtc,
    DateTime? NextRoundAtUtc
);

public record CrashBetRequest(decimal BetAmount, decimal? AutoCashoutMultiplier);

public record CrashBetResponse(
    Guid BetId,
    Guid RoundId,
    decimal BetAmount,
    decimal? AutoCashoutMultiplier,
    decimal Balance,
    string Status
);

public record CrashCashoutRequest(Guid BetId);

public record CrashCashoutResponse(
    Guid BetId,
    Guid RoundId,
    decimal CashoutMultiplier,
    decimal WinAmount,
    decimal Balance
);

public record CrashHistoryItemDto(
    Guid RoundId,
    decimal CrashMultiplier,
    DateTime EndedAtUtc
);

public record CrashAdminSummaryDto(
    decimal TotalWagered,
    decimal TotalPaid,
    decimal Profit
);

public record CrashAdminRoundDto(
    Guid RoundId,
    long RoundNumber,
    decimal CrashMultiplier,
    int BetsCount,
    decimal TotalWagered,
    decimal TotalPaid,
    DateTime CreatedAtUtc,
    DateTime? EndedAtUtc
);

public record CrashBetListItemDto(
    Guid BetId,
    Guid RoundId,
    string UserLabel,
    decimal BetAmount,
    decimal? TargetMultiplier,
    decimal? CashoutMultiplier,
    decimal WinAmount,
    string Status,
    bool IsMine
);
