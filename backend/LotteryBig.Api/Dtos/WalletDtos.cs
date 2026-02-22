namespace LotteryBig.Api.Dtos;

public record WalletBalanceDto(decimal Balance, string Currency);
public record WalletTransactionDto(
    Guid Id,
    string Type,
    decimal Amount,
    string Reason,
    string Reference,
    DateTime CreatedAtUtc
);

public record WalletTopupRequest(decimal Amount, string Reference);
public record WalletWithdrawRequest(decimal Amount, string Reference);
public record WalletAdjustRequest(Guid UserId, decimal Amount, string Reason);

public record RazorpayOrderRequest(decimal Amount);
public record RazorpayOrderResponse(string OrderId, decimal Amount, string Currency, bool DemoMode, string KeyId);
public record RazorpayVerifyRequest(string OrderId, string PaymentId, string Signature);
