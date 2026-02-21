CREATE OR ALTER PROCEDURE sp_GetReportSummary
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        (SELECT COUNT(*) FROM Users) AS TotalUsers,
        (SELECT COUNT(*) FROM Users WHERE Status = 0) AS ActiveUsers,
        (SELECT ISNULL(SUM(Balance), 0) FROM Wallets) AS TotalPointsIssued,
        (SELECT COUNT(*) FROM WalletTransactions) AS TransactionsCount;
END;
GO

CREATE OR ALTER PROCEDURE sp_AdjustWallet
    @UserId UNIQUEIDENTIFIER,
    @Amount DECIMAL(18,2),
    @Reason NVARCHAR(200)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @WalletId UNIQUEIDENTIFIER;
    SELECT @WalletId = Id FROM Wallets WHERE UserId = @UserId;

    IF @WalletId IS NULL
    BEGIN
        RAISERROR('Wallet not found', 16, 1);
        RETURN;
    END

    IF @Amount < 0 AND (SELECT Balance FROM Wallets WHERE Id = @WalletId) < ABS(@Amount)
    BEGIN
        RAISERROR('Insufficient balance', 16, 1);
        RETURN;
    END

    UPDATE Wallets
    SET Balance = Balance + @Amount
    WHERE Id = @WalletId;

    INSERT INTO WalletTransactions (Id, WalletId, Type, Amount, Reason, Reference, CreatedAtUtc)
    VALUES (NEWID(), @WalletId, CASE WHEN @Amount >= 0 THEN 0 ELSE 1 END, ABS(@Amount), @Reason, 'admin', SYSUTCDATETIME());
END;
GO
