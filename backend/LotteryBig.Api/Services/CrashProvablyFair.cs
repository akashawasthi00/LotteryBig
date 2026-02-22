using System.Security.Cryptography;
using System.Text;

namespace LotteryBig.Api.Services;

public static class CrashProvablyFair
{
    public static decimal ComputeCrashPoint(string serverSeed, string clientSeed, long nonce, decimal houseEdge)
    {
        var message = $"{clientSeed}:{nonce}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(serverSeed));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(message));

        var value = BitConverter.ToUInt32(hash, 0);
        var r = value / (decimal)uint.MaxValue; // 0..1
        if (r >= 1m) r = 0.999999m;

        var multiplier = (1m - houseEdge) / (1m - r);
        if (multiplier < 1m) multiplier = 1m;

        return Math.Round(multiplier, 2, MidpointRounding.AwayFromZero);
    }

    public static string HashServerSeed(string serverSeed)
    {
        using var sha = SHA256.Create();
        var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(serverSeed));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    public static string GenerateServerSeed()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
