using System.Security.Cryptography;
using System.Text;
using LotteryBig.Api.Data;
using LotteryBig.Api.Entities;
using LotteryBig.Api.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace LotteryBig.Api.Services;

public class OtpService
{
    private readonly AppDbContext _db;
    private readonly OtpOptions _options;
    private readonly SnsService _snsService;

    public OtpService(AppDbContext db, IOptions<OtpOptions> options, SnsService snsService)
    {
        _db = db;
        _options = options.Value;
        _snsService = snsService;
    }

    public async Task<string?> CreateOtpAsync(string phone, string purpose, TimeSpan ttl)
    {
        var code = RandomNumberGenerator.GetInt32(100000, 999999).ToString();
        var hash = Hash(code);

        var otp = new OtpRequest
        {
            Phone = phone,
            Purpose = purpose,
            CodeHash = hash,
            ExpiresAtUtc = DateTime.UtcNow.Add(ttl)
        };

        _db.OtpRequests.Add(otp);
        await _db.SaveChangesAsync();

        var message = _options.Template.Replace("{#OTP#}", code, StringComparison.OrdinalIgnoreCase);
        await _snsService.SendOtpAsync(phone, message);

        return _options.DemoMode ? code : null;
    }

    public async Task<bool> ValidateOtpAsync(string phone, string purpose, string code)
    {
        var hash = Hash(code);

        var otp = await _db.OtpRequests
            .Where(x => x.Phone == phone && x.Purpose == purpose && !x.IsUsed && x.ExpiresAtUtc > DateTime.UtcNow)
            .OrderByDescending(x => x.CreatedAtUtc)
            .FirstOrDefaultAsync();

        if (otp == null || otp.CodeHash != hash)
        {
            return false;
        }

        otp.IsUsed = true;
        await _db.SaveChangesAsync();

        return true;
    }

    private static string Hash(string input)
    {
        using var sha = SHA256.Create();
        var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes);
    }
}
