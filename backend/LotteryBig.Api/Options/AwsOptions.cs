namespace LotteryBig.Api.Options;

public class AwsOptions
{
    public const string SectionName = "Aws";

    public string Region { get; set; } = "ap-south-1";
    public string? AccessKeyId { get; set; }
    public string? SecretAccessKey { get; set; }
    public string? SenderId { get; set; }
}
