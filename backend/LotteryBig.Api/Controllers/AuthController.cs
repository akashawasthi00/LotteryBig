using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using LotteryBig.Api.Data;
using LotteryBig.Api.Dtos;
using LotteryBig.Api.Entities;
using LotteryBig.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LotteryBig.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserService _userService;
    private readonly TokenService _tokenService;
    private readonly OtpService _otpService;

    public AuthController(AppDbContext db, UserService userService, TokenService tokenService, OtpService otpService)
    {
        _db = db;
        _userService = userService;
        _tokenService = tokenService;
        _otpService = otpService;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        var existing = await _userService.FindByEmailAsync(request.Email);
        if (existing != null)
        {
            return BadRequest("Email already registered.");
        }

        var user = await _userService.CreateUserWithEmailAsync(request.Email, request.Password);
        var token = _tokenService.CreateToken(user);

        return new AuthResponse(token, MapUser(user));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var user = await _userService.FindByEmailAsync(request.Email);
        if (user == null || !_userService.VerifyPassword(user, request.Password))
        {
            return Unauthorized("Invalid credentials.");
        }

        if (user.Status == UserStatus.Banned)
        {
            return Forbid();
        }

        await _userService.MarkLastLoginAsync(user);

        var token = _tokenService.CreateToken(user);
        return new AuthResponse(token, MapUser(user));
    }

    [HttpPost("request-otp")]
    public async Task<ActionResult<object>> RequestOtp(PhoneOtpRequest request)
    {
        var code = await _otpService.CreateOtpAsync(request.Phone, "login", TimeSpan.FromMinutes(10));

        return Ok(new
        {
            message = code == null
                ? "OTP sent via SMS."
                : "OTP generated for demo. Replace this with SMS provider.",
            code
        });
    }

    [HttpPost("verify-otp")]
    public async Task<ActionResult<AuthResponse>> VerifyOtp(PhoneOtpVerifyRequest request)
    {
        var isValid = await _otpService.ValidateOtpAsync(request.Phone, "login", request.Code);
        if (!isValid)
        {
            return Unauthorized("Invalid or expired OTP.");
        }

        var user = await _userService.CreateOrAttachPhoneAsync(request.Phone);

        if (user.Status == UserStatus.Banned)
        {
            return Forbid();
        }

        await _userService.MarkLastLoginAsync(user);

        var token = _tokenService.CreateToken(user);
        return new AuthResponse(token, MapUser(user));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserProfileDto>> Me()
    {
        var userId = GetUserId();
        var user = await _db.Users.Include(x => x.Wallet).FirstOrDefaultAsync(x => x.Id == userId);
        if (user == null)
        {
            return NotFound();
        }

        return MapUser(user);
    }

    private Guid GetUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                  ?? User.FindFirstValue("sub");

        return Guid.Parse(sub ?? throw new InvalidOperationException("Missing user id"));
    }

    private static UserProfileDto MapUser(User user)
    {
        return new UserProfileDto(
            user.Id,
            user.Email,
            user.Phone,
            user.IsEmailVerified,
            user.IsPhoneVerified,
            user.IsAdmin,
            user.Status.ToString(),
            user.Wallet?.Balance ?? 0m
        );
    }
}
