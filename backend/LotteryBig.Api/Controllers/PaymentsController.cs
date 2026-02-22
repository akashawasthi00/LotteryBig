using System.Security.Claims;
using LotteryBig.Api.Dtos;
using LotteryBig.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LotteryBig.Api.Controllers;

[ApiController]
[Route("api/payments")]
public class PaymentsController : ControllerBase
{
    private readonly RazorpayService _razorpayService;

    public PaymentsController(RazorpayService razorpayService)
    {
        _razorpayService = razorpayService;
    }

    [Authorize]
    [HttpPost("razorpay/order")]
    public async Task<ActionResult<RazorpayOrderResponse>> CreateRazorpayOrder(RazorpayOrderRequest request)
    {
        if (request.Amount <= 0)
        {
            return BadRequest("Amount must be positive.");
        }

        var userId = GetUserId();
        var order = await _razorpayService.CreateOrderAsync(userId, request.Amount);
        return order;
    }

    [Authorize]
    [HttpPost("razorpay/verify")]
    public async Task<IActionResult> VerifyRazorpayPayment(RazorpayVerifyRequest request)
    {
        var userId = GetUserId();
        var ok = await _razorpayService.VerifyPaymentAsync(userId, request.OrderId, request.PaymentId, request.Signature);
        if (!ok)
        {
            return BadRequest("Payment verification failed.");
        }

        return Ok();
    }

    [HttpPost("razorpay/webhook")]
    public async Task<IActionResult> RazorpayWebhook()
    {
        using var reader = new StreamReader(Request.Body);
        var body = await reader.ReadToEndAsync();
        var signature = Request.Headers["X-Razorpay-Signature"].ToString();

        var ok = await _razorpayService.HandleWebhookAsync(signature, body);
        if (!ok)
        {
            return Unauthorized();
        }

        return Ok();
    }

    private Guid GetUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.Parse(sub ?? throw new InvalidOperationException("Missing user id"));
    }
}
