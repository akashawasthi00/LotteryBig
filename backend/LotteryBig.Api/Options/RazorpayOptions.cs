namespace LotteryBig.Api.Options;

public class RazorpayOptions
{
    public const string SectionName = "Razorpay";

    public string KeyId { get; set; } = "";
    public string KeySecret { get; set; } = "";
    public bool DemoMode { get; set; } = true;
    public string WebhookSecret { get; set; } = "";
}
