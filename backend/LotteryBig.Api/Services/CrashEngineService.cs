using LotteryBig.Api.Data;
using LotteryBig.Api.Entities;
using LotteryBig.Api.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace LotteryBig.Api.Services;

public class CrashEngineService : BackgroundService
{
    private const decimal HouseEdge = 0.01m;
    private const double GrowthRate = 0.12;
    private static readonly TimeSpan WaitingDuration = TimeSpan.FromSeconds(5);
    private static readonly TimeSpan CrashRevealDelay = TimeSpan.FromSeconds(5);
    private static readonly TimeSpan Tick = TimeSpan.FromMilliseconds(100);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHubContext<CrashHub> _hub;
    private readonly CrashState _state;
    private readonly ILogger<CrashEngineService> _logger;

    private long _roundNumber;
    private long _nonce;

    public CrashEngineService(
        IServiceScopeFactory scopeFactory,
        IHubContext<CrashHub> hub,
        CrashState state,
        ILogger<CrashEngineService> logger)
    {
        _scopeFactory = scopeFactory;
        _hub = hub;
        _state = state;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await InitializeCountersAsync(stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunRoundAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Crash engine failed; retrying in 2 seconds.");
                await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
            }
        }
    }

    private async Task InitializeCountersAsync(CancellationToken stoppingToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var lastRound = await db.CrashGameRounds.OrderByDescending(x => x.RoundNumber).FirstOrDefaultAsync(stoppingToken);
        _roundNumber = lastRound?.RoundNumber + 1 ?? 1;
        _nonce = lastRound?.Nonce + 1 ?? 1;
    }

    private async Task RunRoundAsync(CancellationToken stoppingToken)
    {
        if (!await IsCrashEnabledAsync(stoppingToken))
        {
            lock (_state.SyncRoot)
            {
                _state.IsEnabled = false;
                _state.Phase = "Disabled";
                _state.RoundId = Guid.Empty;
                _state.RoundNumber = 0;
                _state.CurrentMultiplier = 1.00m;
                _state.NextRoundAtUtc = DateTime.UtcNow.AddSeconds(5);
            }

            await _hub.Clients.All.SendAsync("gameDisabled", new
            {
                message = "Crash game is currently disabled."
            }, stoppingToken);

            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            return;
        }

        var serverSeed = CrashProvablyFair.GenerateServerSeed();
        var serverSeedHash = CrashProvablyFair.HashServerSeed(serverSeed);
        var clientSeed = "lotterybig";
        var crashPoint = CrashProvablyFair.ComputeCrashPoint(serverSeed, clientSeed, _nonce, HouseEdge);

        CrashGameRound round;
        using (var scope = _scopeFactory.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            round = new CrashGameRound
            {
                RoundNumber = _roundNumber++,
                Status = CrashRoundStatus.Waiting,
                ServerSeed = serverSeed,
                ServerSeedHash = serverSeedHash,
                ClientSeed = clientSeed,
                Nonce = _nonce++
            };
            db.CrashGameRounds.Add(round);
            await db.SaveChangesAsync(stoppingToken);
        }

        var nextRoundAt = DateTime.UtcNow.Add(WaitingDuration);
        lock (_state.SyncRoot)
        {
            _state.RoundId = round.Id;
            _state.RoundNumber = round.RoundNumber;
            _state.Phase = "Waiting";
            _state.IsEnabled = true;
            _state.CurrentMultiplier = 1.00m;
            _state.CrashPoint = crashPoint;
            _state.RoundStartedAtUtc = null;
            _state.NextRoundAtUtc = nextRoundAt;
        }

        await _hub.Clients.All.SendAsync("roundWaiting", new
        {
            roundId = round.Id,
            roundNumber = round.RoundNumber,
            nextRoundAtUtc = nextRoundAt,
            serverSeedHash = serverSeedHash
        }, stoppingToken);

        await Task.Delay(WaitingDuration, stoppingToken);

        using (var scope = _scopeFactory.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var tracked = await db.CrashGameRounds.FirstOrDefaultAsync(x => x.Id == round.Id, stoppingToken);
            if (tracked != null)
            {
                tracked.Status = CrashRoundStatus.InProgress;
                tracked.StartedAtUtc = DateTime.UtcNow;
                await db.SaveChangesAsync(stoppingToken);
            }
        }

        lock (_state.SyncRoot)
        {
            _state.Phase = "InProgress";
            _state.RoundStartedAtUtc = DateTime.UtcNow;
            _state.NextRoundAtUtc = null;
            _state.CurrentMultiplier = 1.00m;
        }

        await _hub.Clients.All.SendAsync("roundStarted", new
        {
            roundId = round.Id,
            roundNumber = round.RoundNumber,
            startedAtUtc = _state.RoundStartedAtUtc
        }, stoppingToken);

        var startAt = DateTime.UtcNow;
        decimal multiplier = 1.00m;
        while (!stoppingToken.IsCancellationRequested)
        {
            var elapsedSeconds = (DateTime.UtcNow - startAt).TotalSeconds;
            var nextValue = Math.Exp(GrowthRate * elapsedSeconds);
            var computed = Math.Round((decimal)nextValue, 2, MidpointRounding.AwayFromZero);

            if (computed >= crashPoint)
            {
                multiplier = crashPoint;
                lock (_state.SyncRoot)
                {
                    _state.CurrentMultiplier = multiplier;
                }
                break;
            }

            multiplier = computed;
            lock (_state.SyncRoot)
            {
                _state.CurrentMultiplier = multiplier;
            }

            await _hub.Clients.All.SendAsync("multiplier", new
            {
                roundId = round.Id,
                multiplier = multiplier
            }, stoppingToken);

            await TryAutoCashoutAsync(round.Id, multiplier, stoppingToken);

            await Task.Delay(Tick, stoppingToken);
        }

        lock (_state.SyncRoot)
        {
            _state.Phase = "Crashed";
            _state.CurrentMultiplier = crashPoint;
        }

        using (var scope = _scopeFactory.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var tracked = await db.CrashGameRounds.Include(x => x.Bets)
                .FirstOrDefaultAsync(x => x.Id == round.Id, stoppingToken);
            if (tracked != null)
            {
                tracked.Status = CrashRoundStatus.Crashed;
                tracked.CrashMultiplier = crashPoint;
                tracked.EndedAtUtc = DateTime.UtcNow;

                foreach (var bet in tracked.Bets.Where(x => x.Status == CrashBetStatus.Active))
                {
                    bet.Status = CrashBetStatus.Lost;
                    bet.WinAmount = 0m;
                }

                await db.SaveChangesAsync(stoppingToken);
            }
        }

        await _hub.Clients.All.SendAsync("roundCrashed", new
        {
            roundId = round.Id,
            roundNumber = round.RoundNumber,
            crashMultiplier = crashPoint,
            serverSeed = serverSeed,
            serverSeedHash = serverSeedHash
        }, stoppingToken);

        await Task.Delay(CrashRevealDelay, stoppingToken);
    }

    private async Task<bool> IsCrashEnabledAsync(CancellationToken stoppingToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Games.AnyAsync(x => x.Name == "Crash Multiplier" && x.Status == GameStatus.Active, stoppingToken);
    }

    private async Task TryAutoCashoutAsync(Guid roundId, decimal multiplier, CancellationToken stoppingToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var bets = await db.CrashBets
            .Where(x => x.RoundId == roundId
                        && x.Status == CrashBetStatus.Active
                        && x.TargetMultiplier != null
                        && x.TargetMultiplier <= multiplier)
            .ToListAsync(stoppingToken);

        if (bets.Count == 0)
        {
            return;
        }

        foreach (var bet in bets)
        {
            var wallet = await db.Wallets.FirstOrDefaultAsync(x => x.UserId == bet.UserId, stoppingToken);
            if (wallet == null)
            {
                continue;
            }

            var winAmount = Math.Round(bet.BetAmount * multiplier, 2, MidpointRounding.AwayFromZero);
            bet.Status = CrashBetStatus.CashedOut;
            bet.CashoutMultiplier = multiplier;
            bet.WinAmount = winAmount;
            bet.CashedOutAtUtc = DateTime.UtcNow;

            wallet.Balance += winAmount;
            db.WalletTransactions.Add(new WalletTransaction
            {
                WalletId = wallet.Id,
                Type = WalletTransactionType.Credit,
                Amount = winAmount,
                Reason = "Crash auto cashout",
                Reference = "crash"
            });
        }

        await db.SaveChangesAsync(stoppingToken);

        var userIds = bets.Select(x => x.UserId).ToHashSet();
        var users = await db.Users.Where(x => userIds.Contains(x.Id)).ToListAsync(stoppingToken);
        var userMap = users.ToDictionary(x => x.Id, x => x);

        foreach (var bet in bets)
        {
            var user = userMap.TryGetValue(bet.UserId, out var found) ? found : null;
            await _hub.Clients.All.SendAsync("betCashedOut", new
            {
                betId = bet.Id,
                roundId,
                userId = bet.UserId,
                userLabel = CrashLabel.Mask(user),
                betAmount = bet.BetAmount,
                cashoutMultiplier = bet.CashoutMultiplier ?? multiplier,
                winAmount = bet.WinAmount,
                status = bet.Status.ToString()
            }, stoppingToken);
        }
    }
}
