# LotteryBig

Points-based demo platform built with React + ASP.NET Core Web API + SQL Server. This is a production-grade architecture without real-money wagering until licensing and legal clearance are complete.

## Tech Stack
- Frontend: React (Vite)
- Backend: ASP.NET Core Web API (.NET 9)
- Database: SQL Server

## Quick Start

### Backend
1. Configure SQL Server connection string in `backend/LotteryBig.Api/appsettings.json`.
2. Update JWT signing key and admin seed credentials in `backend/LotteryBig.Api/appsettings.json`.
3. Restore packages and run migrations:

```powershell
$env:DOTNET_CLI_HOME='C:\Users\AkashAwasthi\LotteryBig\.dotnet_cli'
dotnet restore backend/LotteryBig.Api/LotteryBig.Api.csproj
dotnet ef database update --project backend/LotteryBig.Api/LotteryBig.Api.csproj
```

4. Run the API:

```powershell
$env:DOTNET_CLI_HOME='C:\Users\AkashAwasthi\LotteryBig\.dotnet_cli'
dotnet run --project backend/LotteryBig.Api/LotteryBig.Api.csproj
```

### Frontend
1. Install dependencies:

```powershell
cd frontend
npm install
```

2. Create a `.env` file in `frontend`:

```text
VITE_API_BASE=https://localhost:5001
```

3. Start dev server:

```powershell
npm run dev
```

## Demo Notes
- OTP endpoints return the code in the API response only when `Otp:DemoMode` is `true`. With AWS SNS configured, OTP is sent via SMS.
- Wallet is points-based only (no real money flows).
- Razorpay integration uses demo mode by default and expects webhook verification for credits.

## Database Scripts
Raw SQL scripts are in `database/schema.sql` and `database/procedures.sql`.

## Admin Seed
Default admin is defined in `backend/LotteryBig.Api/appsettings.json` under `AdminSeed`.

## AWS SNS
Set `Aws:AccessKeyId`, `Aws:SecretAccessKey`, `Aws:Region`, and optional `Aws:SenderId`.

## Razorpay
Set `Razorpay:KeyId`, `Razorpay:KeySecret`, and `Razorpay:WebhookSecret`.

## Compliance Checklist
See `COMPLIANCE_CHECKLIST.md` for a high-level readiness checklist.
