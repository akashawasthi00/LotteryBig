namespace LotteryBig.Api.Options;

public class OtpOptions
{
    public const string SectionName = "Otp";

    public bool DemoMode { get; set; } = true;
    public string Template { get; set; } =
        "Use OTP {#OTP#} to verify your LotteryBig account. This code expires in 5 minutes. Never share your OTP.";
}
