using LotteryBig.Api.Data;
using LotteryBig.Api.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace LotteryBig.Api.Services;

public class UserService
{
    private readonly AppDbContext _db;
    private readonly PasswordHasher<User> _hasher = new();

    public UserService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<User> CreateUserWithEmailAsync(string email, string password)
    {
        var user = new User
        {
            Email = email,
            IsEmailVerified = true
        };

        user.PasswordHash = _hasher.HashPassword(user, password);
        user.Wallet = new Wallet { User = user };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return user;
    }

    public async Task<User?> FindByEmailAsync(string email)
    {
        return await _db.Users.Include(x => x.Wallet).FirstOrDefaultAsync(x => x.Email == email);
    }

    public async Task<User?> FindByPhoneAsync(string phone)
    {
        return await _db.Users.Include(x => x.Wallet).FirstOrDefaultAsync(x => x.Phone == phone);
    }

    public bool VerifyPassword(User user, string password)
    {
        return _hasher.VerifyHashedPassword(user, user.PasswordHash ?? string.Empty, password) == PasswordVerificationResult.Success;
    }

    public async Task<User> CreateOrAttachPhoneAsync(string phone)
    {
        var user = await FindByPhoneAsync(phone);
        if (user != null)
        {
            return user;
        }

        user = new User
        {
            Phone = phone,
            IsPhoneVerified = true,
            Wallet = new Wallet()
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return user;
    }

    public async Task MarkPhoneVerifiedAsync(User user)
    {
        user.IsPhoneVerified = true;
        await _db.SaveChangesAsync();
    }

    public async Task MarkLastLoginAsync(User user)
    {
        user.LastLoginAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }
}
