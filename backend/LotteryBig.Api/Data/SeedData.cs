using LotteryBig.Api.Data;
using LotteryBig.Api.Entities;
using LotteryBig.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace LotteryBig.Api;

public static class SeedData
{
    public static async Task EnsureSeedDataAsync(IServiceProvider services, IConfiguration configuration)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var userService = scope.ServiceProvider.GetRequiredService<UserService>();

        await db.Database.EnsureCreatedAsync();

        var adminEmail = configuration["AdminSeed:Email"];
        var adminPassword = configuration["AdminSeed:Password"];
        var adminPhone = configuration["AdminSeed:Phone"];

        if (string.IsNullOrWhiteSpace(adminEmail) || string.IsNullOrWhiteSpace(adminPassword))
        {
            return;
        }

        var admin = await db.Users.FirstOrDefaultAsync(x => x.Email == adminEmail);
        if (admin == null)
        {
            admin = await userService.CreateUserWithEmailAsync(adminEmail, adminPassword);
            admin.IsAdmin = true;
            if (!string.IsNullOrWhiteSpace(adminPhone))
            {
                admin.Phone = adminPhone;
                admin.IsPhoneVerified = true;
            }
            await db.SaveChangesAsync();
        }

        var requiredCategories = new[]
        {
            new { Name = "Mini Games", Sort = 1 },
            new { Name = "Lottery", Sort = 2 },
            new { Name = "PVC", Sort = 3 },
            new { Name = "Slots", Sort = 4 },
            new { Name = "Popular", Sort = 5 },
            new { Name = "Fishing", Sort = 6 },
            new { Name = "Casino", Sort = 7 },
            new { Name = "Sports", Sort = 8 }
        };

        foreach (var category in requiredCategories)
        {
            var existing = await db.Categories.FirstOrDefaultAsync(x => x.Name == category.Name);
            if (existing == null)
            {
                db.Categories.Add(new Category
                {
                    Name = category.Name,
                    SortOrder = category.Sort
                });
            }
            else
            {
                existing.SortOrder = category.Sort;
            }
        }

        await db.SaveChangesAsync();

        var categoryMap = await db.Categories.ToDictionaryAsync(x => x.Name, x => x.Id);

        var requiredGames = new[]
        {
            new
            {
                Name = "Lottery",
                Description = "Color + Big/Small combined rounds. Demo stake range: Rs 10 to Rs 5,000.",
                Sort = 1,
                Category = "Lottery"
            }
        };

        foreach (var item in requiredGames)
        {
            if (!categoryMap.TryGetValue(item.Category, out var categoryId))
            {
                continue;
            }

            var existing = await db.Games.FirstOrDefaultAsync(x => x.Name == item.Name);
            if (existing == null)
            {
                db.Games.Add(new Game
                {
                    Name = item.Name,
                    ShortDescription = item.Description,
                    Status = GameStatus.Active,
                    SortOrder = item.Sort,
                    CategoryId = categoryId
                });
            }
            else
            {
                existing.ShortDescription = item.Description;
                existing.SortOrder = item.Sort;
                existing.CategoryId = categoryId;
                if (existing.Status == GameStatus.Draft)
                {
                    existing.Status = GameStatus.Active;
                }
            }
        }

        await db.SaveChangesAsync();

        var lottery = await db.Games.FirstOrDefaultAsync(x => x.Name == "Lottery");
        var colourTrading = await db.Games.FirstOrDefaultAsync(x => x.Name == "Colour Trading");
        var bigSmall = await db.Games.FirstOrDefaultAsync(x => x.Name == "Big Small");

        if (lottery == null)
        {
            var source = colourTrading ?? bigSmall;
            if (source != null && categoryMap.TryGetValue("Lottery", out var lotteryCategoryId))
            {
                source.Name = "Lottery";
                source.ShortDescription = "Color + Big/Small combined rounds. Demo stake range: Rs 10 to Rs 5,000.";
                source.SortOrder = 1;
                source.Status = GameStatus.Active;
                source.CategoryId = lotteryCategoryId;
                lottery = source;
            }
        }

        if (lottery != null)
        {
            if (colourTrading != null && colourTrading.Id != lottery.Id)
            {
                colourTrading.Status = GameStatus.Hidden;
            }

            if (bigSmall != null && bigSmall.Id != lottery.Id)
            {
                bigSmall.Status = GameStatus.Hidden;
            }
        }

        var requiredGameNames = requiredGames.Select(x => x.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var gamesToHide = await db.Games
            .Where(x => !requiredGameNames.Contains(x.Name))
            .ToListAsync();

        if (gamesToHide.Count > 0)
        {
            foreach (var game in gamesToHide)
            {
                game.Status = GameStatus.Hidden;
            }
        }

        await db.SaveChangesAsync();

        var walletsToUpdate = await db.Wallets.Where(x => x.Currency != "INR").ToListAsync();
        if (walletsToUpdate.Count > 0)
        {
            foreach (var wallet in walletsToUpdate)
            {
                wallet.Currency = "INR";
            }
            await db.SaveChangesAsync();
        }
    }
}
