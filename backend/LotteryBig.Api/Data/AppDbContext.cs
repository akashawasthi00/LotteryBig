using LotteryBig.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace LotteryBig.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Wallet> Wallets => Set<Wallet>();
    public DbSet<WalletTransaction> WalletTransactions => Set<WalletTransaction>();
    public DbSet<OtpRequest> OtpRequests => Set<OtpRequest>();
    public DbSet<Game> Games => Set<Game>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<ContentPage> ContentPages => Set<ContentPage>();
    public DbSet<Banner> Banners => Set<Banner>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<PaymentRecord> PaymentRecords => Set<PaymentRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>()
            .HasIndex(x => x.Email)
            .IsUnique()
            .HasFilter("[Email] IS NOT NULL");

        modelBuilder.Entity<User>()
            .HasIndex(x => x.Phone)
            .IsUnique()
            .HasFilter("[Phone] IS NOT NULL");

        modelBuilder.Entity<User>()
            .HasOne(x => x.Wallet)
            .WithOne(x => x.User)
            .HasForeignKey<Wallet>(x => x.UserId);

        modelBuilder.Entity<WalletTransaction>()
            .HasIndex(x => x.CreatedAtUtc);

        modelBuilder.Entity<Wallet>()
            .Property(x => x.Balance)
            .HasPrecision(18, 2);

        modelBuilder.Entity<WalletTransaction>()
            .Property(x => x.Amount)
            .HasPrecision(18, 2);

        modelBuilder.Entity<PaymentRecord>()
            .Property(x => x.Amount)
            .HasPrecision(18, 2);

        modelBuilder.Entity<Game>()
            .HasIndex(x => x.SortOrder);

        modelBuilder.Entity<Category>()
            .HasIndex(x => x.SortOrder);

        modelBuilder.Entity<Category>()
            .HasIndex(x => x.Name)
            .IsUnique();

        modelBuilder.Entity<Game>()
            .HasOne(x => x.Category)
            .WithMany(x => x.Games)
            .HasForeignKey(x => x.CategoryId);

        modelBuilder.Entity<ContentPage>()
            .HasIndex(x => x.Slug)
            .IsUnique();
    }
}
