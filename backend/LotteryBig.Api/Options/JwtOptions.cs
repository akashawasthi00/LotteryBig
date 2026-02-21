namespace LotteryBig.Api.Options;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "LotteryBig";
    public string Audience { get; set; } = "LotteryBig.Users";
    public string SigningKey { get; set; } = "ChangeThisSigningKeyToAStrongSecret";
    public int ExpiryMinutes { get; set; } = 240;
}
