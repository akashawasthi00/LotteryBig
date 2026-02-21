using LotteryBig.Api.Data;
using LotteryBig.Api.Entities;

namespace LotteryBig.Api.Services;

public class AuditService
{
    private readonly AppDbContext _db;

    public AuditService(AppDbContext db)
    {
        _db = db;
    }

    public async Task LogAsync(Guid? actorUserId, string action, string summary)
    {
        _db.AuditLogs.Add(new AuditLog
        {
            ActorUserId = actorUserId,
            Action = action,
            Summary = summary
        });

        await _db.SaveChangesAsync();
    }
}
