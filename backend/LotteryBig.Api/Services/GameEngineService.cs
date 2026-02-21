using System.Globalization;

namespace LotteryBig.Api.Services;

public class GameEngineService
{
    public (bool Won, decimal Multiplier, string Outcome) Resolve(
        string gameName,
        string? choice,
        decimal? cashoutAt,
        decimal? targetMultiplier)
    {
        var key = gameName.Trim().ToLowerInvariant();
        return key switch
        {
            "colour trading" => ResolveColourTrading(choice),
            "big small" => ResolveBigSmall(choice),
            "aviator" => ResolveAviator(cashoutAt),
            "limbo" => ResolveLimbo(targetMultiplier),
            "poker" => ResolveBinary(1.95m, "Won hand", "Lost hand"),
            "ludo" => ResolveBinary(1.8m, "Won board", "Lost board"),
            "boom" => ResolveBinary(2.2m, "Boom hit", "Boom miss"),
            "vortex" => ResolveBinary(2.0m, "Vortex hit", "Vortex miss"),
            _ => ResolveBinary(1.7m, "Round won", "Round lost")
        };
    }

    private static (bool Won, decimal Multiplier, string Outcome) ResolveColourTrading(string? choice)
    {
        var pick = (choice ?? "red").Trim().ToLowerInvariant();
        var number = Random.Shared.Next(0, 10);
        var colors = GetColors(number);

        var won = false;
        var multiplier = 0m;

        if (int.TryParse(pick, NumberStyles.Integer, CultureInfo.InvariantCulture, out var pickedNumber))
        {
            won = pickedNumber == number;
            multiplier = won ? 9m : 0m;
        }
        else if (pick is "red" or "green" or "violet")
        {
            won = colors.Contains(pick);
            if (won)
            {
                multiplier = pick == "violet" ? 4.5m : 2m;
            }
        }

        var outcome = $"Result number: {number} ({string.Join("/", colors)})";
        return (won, multiplier, outcome);
    }

    private static (bool Won, decimal Multiplier, string Outcome) ResolveBigSmall(string? choice)
    {
        var pick = (choice ?? "big").Trim().ToLowerInvariant();
        var number = Random.Shared.Next(0, 10);
        var actual = number >= 5 ? "big" : "small";
        var won = pick == actual;
        var multiplier = won ? 2m : 0m;
        return (won, multiplier, $"Result number: {number} ({actual})");
    }

    private static List<string> GetColors(int number)
    {
        if (number == 0)
        {
            return ["red", "violet"];
        }

        if (number == 5)
        {
            return ["green", "violet"];
        }

        return number % 2 == 0 ? ["red"] : ["green"];
    }

    private static (bool Won, decimal Multiplier, string Outcome) ResolveAviator(decimal? cashoutAt)
    {
        var target = cashoutAt ?? 1.5m;
        target = Math.Clamp(target, 1.01m, 20m);
        var crash = Math.Round((decimal)(1 + Random.Shared.NextDouble() * 9), 2);
        var won = target <= crash;
        return (won, won ? target : 0m, $"Crash at {crash}x");
    }

    private static (bool Won, decimal Multiplier, string Outcome) ResolveLimbo(decimal? targetMultiplier)
    {
        var target = targetMultiplier ?? 2m;
        target = Math.Clamp(target, 1.1m, 20m);
        var hit = Math.Round((decimal)(1 + Random.Shared.NextDouble() * 12), 2);
        var won = hit >= target;
        return (won, won ? target : 0m, $"Rolled {hit}x");
    }

    private static (bool Won, decimal Multiplier, string Outcome) ResolveBinary(
        decimal winMultiplier,
        string winText,
        string loseText)
    {
        var won = Random.Shared.NextDouble() > 0.5;
        return (won, won ? winMultiplier : 0m, won ? winText : loseText);
    }
}
