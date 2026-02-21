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

        var requiredGames = new[]
        {
            new { Name = "Colour Trading", Description = "Fast color rounds. Demo stake range: Rs 10 to Rs 5,000.", Sort = 1 },
            new { Name = "Big Small", Description = "Pick big (5-9) or small (0-4). Demo stake range: Rs 10 to Rs 5,000.", Sort = 2 },
            new { Name = "Poker", Description = "Classic poker tables. Demo buy-in range: Rs 50 to Rs 25,000.", Sort = 3 },
            new { Name = "Aviator", Description = "Multiplier crash game. Demo stake range: Rs 10 to Rs 10,000.", Sort = 4 },
            new { Name = "Ludo", Description = "Quick ludo battles. Demo entry range: Rs 20 to Rs 2,000.", Sort = 5 },
            new { Name = "Boom", Description = "High-volatility instant rounds. Demo stake range: Rs 10 to Rs 7,500.", Sort = 6 },
            new { Name = "Vortex", Description = "Spin-and-win format. Demo stake range: Rs 25 to Rs 8,000.", Sort = 7 },
            new { Name = "Limbo", Description = "Target multiplier game. Demo stake range: Rs 10 to Rs 5,000.", Sort = 8 }
        };

        foreach (var item in requiredGames)
        {
            var existing = await db.Games.FirstOrDefaultAsync(x => x.Name == item.Name);
            if (existing == null)
            {
                db.Games.Add(new Game
                {
                    Name = item.Name,
                    ShortDescription = item.Description,
                    Status = GameStatus.Active,
                    SortOrder = item.Sort
                });
            }
            else
            {
                existing.ShortDescription = item.Description;
                existing.SortOrder = item.Sort;
                if (existing.Status == GameStatus.Draft)
                {
                    existing.Status = GameStatus.Active;
                }
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
