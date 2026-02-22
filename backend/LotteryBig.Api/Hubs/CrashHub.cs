using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace LotteryBig.Api.Hubs;

[Authorize]
public class CrashHub : Hub
{
}
