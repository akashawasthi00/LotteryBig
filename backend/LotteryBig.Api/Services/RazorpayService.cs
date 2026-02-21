using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using LotteryBig.Api.Data;
using LotteryBig.Api.Dtos;
using LotteryBig.Api.Entities;
using LotteryBig.Api.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace LotteryBig.Api.Services;

public class RazorpayService
{
    private readonly RazorpayOptions _options;
    private readonly AppDbContext _db;
    private readonly WalletService _walletService;

    public RazorpayService(IOptions<RazorpayOptions> options, AppDbContext db, WalletService walletService)
    {
        _options = options.Value;
        _db = db;
        _walletService = walletService;
    }

    public async Task<RazorpayOrderResponse> CreateOrderAsync(Guid userId, decimal amount)
    {
        var orderId = $"demo_{Guid.NewGuid():N}";

        if (!_options.DemoMode && !string.IsNullOrWhiteSpace(_options.KeyId))
        {
            orderId = await CreateRazorpayOrderAsync(amount);
        }

        _db.PaymentRecords.Add(new PaymentRecord
        {
            UserId = userId,
            Provider = "razorpay",
            ProviderOrderId = orderId,
            Amount = amount,
            Status = PaymentStatus.Created
        });
        await _db.SaveChangesAsync();

        return new RazorpayOrderResponse(orderId, amount, "INR", _options.DemoMode);
    }

    public async Task<bool> HandleWebhookAsync(string signature, string body)
    {
        if (string.IsNullOrWhiteSpace(signature) || string.IsNullOrWhiteSpace(_options.WebhookSecret))
        {
            return false;
        }

        var expected = ComputeSignature(body, _options.WebhookSecret);
        if (!string.Equals(signature, expected, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        var eventName = root.GetProperty("event").GetString();

        if (!string.Equals(eventName, "payment.captured", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        var orderId = root.GetProperty("payload")
            .GetProperty("payment")
            .GetProperty("entity")
            .GetProperty("order_id")
            .GetString();

        if (string.IsNullOrWhiteSpace(orderId))
        {
            return true;
        }

        var record = await _db.PaymentRecords.FirstOrDefaultAsync(x => x.ProviderOrderId == orderId);
        if (record == null || record.Status == PaymentStatus.Paid)
        {
            return true;
        }

        record.Status = PaymentStatus.Paid;
        record.CompletedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _walletService.CreditAsync(record.UserId, record.Amount, "Razorpay Topup", orderId);

        return true;
    }

    private async Task<string> CreateRazorpayOrderAsync(decimal amount)
    {
        using var client = new HttpClient();
        var authBytes = Encoding.UTF8.GetBytes($"{_options.KeyId}:{_options.KeySecret}");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", Convert.ToBase64String(authBytes));

        var payload = new
        {
            amount = (int)Math.Round(amount * 100, 0, MidpointRounding.AwayFromZero),
            currency = "INR",
            receipt = $"rcpt_{Guid.NewGuid():N}"
        };

        var response = await client.PostAsync(
            "https://api.razorpay.com/v1/orders",
            new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"));

        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.GetProperty("id").GetString() ?? throw new InvalidOperationException("Missing order id");
    }

    private static string ComputeSignature(string payload, string secret)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
