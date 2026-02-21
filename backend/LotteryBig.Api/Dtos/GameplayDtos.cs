namespace LotteryBig.Api.Dtos;

public record PlayGameRequest(
    Guid GameId,
    decimal BetAmount,
    string? Choice,
    decimal? CashoutAt,
    decimal? TargetMultiplier
);

public record PlayGameResponse(
    bool Won,
    decimal Payout,
    decimal Profit,
    decimal NewBalance,
    decimal Multiplier,
    string Outcome
);
