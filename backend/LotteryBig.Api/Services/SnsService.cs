using System.Globalization;
using Amazon;
using Amazon.SimpleNotificationService;
using Amazon.SimpleNotificationService.Model;
using LotteryBig.Api.Options;
using Microsoft.Extensions.Options;

namespace LotteryBig.Api.Services;

public class SnsService
{
    private readonly AwsOptions _options;

    public SnsService(IOptions<AwsOptions> options)
    {
        _options = options.Value;
    }

    public async Task SendOtpAsync(string phone, string message)
    {
        if (string.IsNullOrWhiteSpace(_options.AccessKeyId) ||
            string.IsNullOrWhiteSpace(_options.SecretAccessKey))
        {
            return;
        }

        var config = new AmazonSimpleNotificationServiceConfig
        {
            RegionEndpoint = RegionEndpoint.GetBySystemName(_options.Region)
        };

        using var client = new AmazonSimpleNotificationServiceClient(
            _options.AccessKeyId,
            _options.SecretAccessKey,
            config);

        var request = new PublishRequest
        {
            PhoneNumber = NormalizePhone(phone),
            Message = message
        };

        if (!string.IsNullOrWhiteSpace(_options.SenderId))
        {
            request.MessageAttributes = new Dictionary<string, MessageAttributeValue>
            {
                ["AWS.SNS.SMS.SenderID"] = new MessageAttributeValue
                {
                    DataType = "String",
                    StringValue = _options.SenderId
                },
                ["AWS.SNS.SMS.SMSType"] = new MessageAttributeValue
                {
                    DataType = "String",
                    StringValue = "Transactional"
                }
            };
        }

        await client.PublishAsync(request);
    }

    private static string NormalizePhone(string phone)
    {
        var digits = new string(phone.Where(char.IsDigit).ToArray());
        if (digits.StartsWith("91", StringComparison.Ordinal))
        {
            return $"+{digits}";
        }

        if (digits.Length == 10)
        {
            return $"+91{digits}";
        }

        return $"+{digits}";
    }
}
