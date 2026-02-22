using LotteryBig.Api.Entities;

namespace LotteryBig.Api.Services;

public static class CrashLabel
{
    public static string Mask(User? user)
    {
        if (user == null)
        {
            return "Player";
        }

        if (!string.IsNullOrWhiteSpace(user.Email))
        {
            var email = user.Email;
            var at = email.IndexOf('@');
            if (at > 1)
            {
                return $"{email[0]}***{email[at - 1]}";
            }
            return $"{email[0]}***";
        }

        if (!string.IsNullOrWhiteSpace(user.Phone))
        {
            var phone = user.Phone;
            if (phone.Length >= 4)
            {
                return $"{phone[..2]}***{phone[^2..]}";
            }
            return $"{phone[0]}***";
        }

        return "Player";
    }
}
