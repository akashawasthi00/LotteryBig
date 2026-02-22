IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'CrashGameRounds')
BEGIN
    CREATE TABLE CrashGameRounds (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        RoundNumber BIGINT NOT NULL,
        Status INT NOT NULL DEFAULT 0,
        ServerSeed NVARCHAR(128) NOT NULL,
        ServerSeedHash NVARCHAR(128) NOT NULL,
        ClientSeed NVARCHAR(128) NOT NULL,
        Nonce BIGINT NOT NULL,
        CrashMultiplier DECIMAL(10,2) NOT NULL DEFAULT 0,
        CreatedAtUtc DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        StartedAtUtc DATETIME2 NULL,
        EndedAtUtc DATETIME2 NULL
    );

    CREATE UNIQUE INDEX IX_CrashGameRounds_RoundNumber ON CrashGameRounds(RoundNumber);
    CREATE INDEX IX_CrashGameRounds_EndedAtUtc ON CrashGameRounds(EndedAtUtc DESC);
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'CrashBets')
BEGIN
    CREATE TABLE CrashBets (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        RoundId UNIQUEIDENTIFIER NOT NULL,
        UserId UNIQUEIDENTIFIER NOT NULL,
        BetAmount DECIMAL(18,2) NOT NULL,
        TargetMultiplier DECIMAL(10,2) NULL,
        CashoutMultiplier DECIMAL(10,2) NULL,
        WinAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
        Status INT NOT NULL DEFAULT 0,
        CreatedAtUtc DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CashedOutAtUtc DATETIME2 NULL,
        CONSTRAINT FK_CrashBets_Rounds FOREIGN KEY (RoundId) REFERENCES CrashGameRounds(Id),
        CONSTRAINT FK_CrashBets_Users FOREIGN KEY (UserId) REFERENCES Users(Id)
    );

    CREATE INDEX IX_CrashBets_RoundId ON CrashBets(RoundId);
    CREATE INDEX IX_CrashBets_UserId ON CrashBets(UserId);
END

IF COL_LENGTH('CrashBets', 'TargetMultiplier') IS NULL
BEGIN
    ALTER TABLE CrashBets
    ADD TargetMultiplier DECIMAL(10,2) NULL;
END
