namespace LotteryBig.Api.Dtos;

public record RegisterRequest(string Email, string Password);
public record LoginRequest(string Email, string Password);
public record PhoneOtpRequest(string Phone);
public record PhoneOtpVerifyRequest(string Phone, string Code);
public record AuthResponse(string Token, UserProfileDto User);

public record UserProfileDto(
    Guid Id,
    string? Email,
    string? Phone,
    bool IsEmailVerified,
    bool IsPhoneVerified,
    bool IsAdmin,
    string Status,
    decimal Balance
);
