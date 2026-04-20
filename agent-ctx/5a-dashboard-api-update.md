# Task 5a - Dashboard API: Add Claim Cleared & Return Stock by OB Fields

## Summary
Updated `/home/z/my-project/src/app/api/dashboard/route.ts` to include the new fields from the updated Prisma schema (`claimCleared`, `returnStockClaimByOB`, `totalRecovery`).

## Changes Made

### 1. Aggregated Totals
- Added `totalClaimCleared` = sum of `entry.claimCleared`
- Added `totalReturnStockByOB` = sum of `entry.returnStockClaimByOB`
- Added `totalCashReceived` = sum of `entry.cashReceived` (explicitly separated from totalRecovery)
- Updated `totalRecovery` formula: `totalCashReceived + totalOldRecovery + totalClaimCleared + totalReturnStockByOB`
  - Previously: `totalRecovery` was just `sum of entry.cashReceived`

### 2. Order Booker (OB) Breakdown Map
- Added fields: `totalCashReceived`, `totalClaimCleared`, `totalReturnStockByOB`
- `totalRecovery` is now computed as `totalCashReceived + totalOldRecovery + totalClaimCleared + totalReturnStockByOB` (recalculated after each entry accumulation)

### 3. Company Breakdown Map
- Same additions as OB breakdown: `totalCashReceived`, `totalClaimCleared`, `totalReturnStockByOB`
- `totalRecovery` computed with the same formula

### 4. Daily Trend Data
- Added fields: `totalCashReceived`, `totalOldRecovery`, `totalClaimCleared`, `totalReturnStockByOB`
- `totalRecovery` computed with the same formula

### 5. API Response
- Summary object now includes: `totalCashReceived`, `totalClaimCleared`, `totalReturnStockByOB` alongside existing fields
- All breakdown arrays (orderBookerBreakdown, companyBreakdown, dailyTrend) include the new fields

## Formula Reference (from entries API)
- Credit Posted = Summary Amount - Stock Return - Cash Received
- Total Recovery = Cash Received + Old Recovery + Claim Cleared + Return Stock/Claim by OB
- Closing Balance = Opening Balance - Old Recovery - Claim Cleared - Return Stock/Claim by OB + Credit Posted

## Verification
- File compiles successfully (dev server shows no errors from this file)
- Pre-existing lint error in `entry-form.tsx` is unrelated to this change
