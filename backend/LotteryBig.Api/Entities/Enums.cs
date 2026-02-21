namespace LotteryBig.Api.Entities;

public enum UserStatus
{
    Active = 0,
    Banned = 1
}

public enum WalletTransactionType
{
    Credit = 0,
    Debit = 1
}

public enum GameStatus
{
    Draft = 0,
    Active = 1,
    Hidden = 2
}

public enum PaymentStatus
{
    Created = 0,
    Paid = 1,
    Failed = 2
}
