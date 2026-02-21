using LotteryBig.Api.Data;
using LotteryBig.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace LotteryBig.Api.Services;

public class WalletService
{
    private readonly AppDbContext _db;

    public WalletService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<Wallet> GetWalletAsync(Guid userId)
    {
        var wallet = await _db.Wallets.Include(x => x.Transactions)
            .FirstOrDefaultAsync(x => x.UserId == userId);

        if (wallet == null)
        {
            wallet = new Wallet { UserId = userId };
            _db.Wallets.Add(wallet);
            await _db.SaveChangesAsync();
        }

        return wallet;
    }

    public async Task<WalletTransaction> CreditAsync(Guid userId, decimal amount, string reason, string reference)
    {
        var wallet = await GetWalletAsync(userId);
        wallet.Balance += amount;

        var tx = new WalletTransaction
        {
            WalletId = wallet.Id,
            Type = WalletTransactionType.Credit,
            Amount = amount,
            Reason = reason,
            Reference = reference
        };

        _db.WalletTransactions.Add(tx);
        await _db.SaveChangesAsync();

        return tx;
    }

    public async Task<WalletTransaction?> DebitAsync(Guid userId, decimal amount, string reason, string reference)
    {
        var wallet = await GetWalletAsync(userId);
        if (wallet.Balance < amount)
        {
            return null;
        }

        wallet.Balance -= amount;

        var tx = new WalletTransaction
        {
            WalletId = wallet.Id,
            Type = WalletTransactionType.Debit,
            Amount = amount,
            Reason = reason,
            Reference = reference
        };

        _db.WalletTransactions.Add(tx);
        await _db.SaveChangesAsync();

        return tx;
    }
}
