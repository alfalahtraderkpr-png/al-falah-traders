# Task 6: Settlement Formula Fix

## Agent: Code Agent
## Date: 2026-03-04

## Summary
Fixed the settlement entry double-counting bug in the balances page and verified the API routes handle the new formula correctly.

## Problem
The "Settle" feature in the balances page (`src/components/balances-page.tsx`) was creating settlement entries with both `cashReceived` and `oldRecovery` set to the settlement amount. With the updated formula:

- **Credit Posted** = Summary Amount - Stock Return - Cash Received
- **Total Recovery** = Cash Received + Old Recovery + Claim Cleared + Return Stock/Claim by OB
- **Closing Balance** = Opening Balance - Old Recovery - Claim Cleared - Return Stock/Claim by OB + Credit Posted

Setting both `cashReceived` and `oldRecovery` to the same amount caused double-counting:
- Credit Posted = 0 - 0 - amount = -amount (negative credit)
- Closing Balance = Opening - amount - 0 - 0 + (-amount) = Opening - 2*amount (WRONG)

## Fix Applied
Changed the settlement payload in `handleSettle` to:
```
summaryAmount: 0,
stockReturn: 0,
cashReceived: 0,       // Was: amount (removed to fix double-counting)
claimCleared: 0,
oldRecovery: amount,    // This is the actual recovery being recorded
returnStockClaimByOB: 0,
```

Now:
- Credit Posted = 0 - 0 - 0 = 0
- Closing Balance = Opening - amount - 0 - 0 + 0 = Opening - amount (CORRECT)

## Additional Changes
1. Updated dialog description from "This will create a new entry with cash received" to "Record an old balance recovery to reduce the outstanding balance. This creates a settlement entry with the recovery amount."
2. Added explicit comment explaining the formula logic and why only oldRecovery is set
3. Fixed a pre-existing JSX bug in `entry-form.tsx` where `</CardTitle>` was used instead of `</CardHeader>` on line 675

## Files Modified
- `src/components/balances-page.tsx` - Settlement payload fix + dialog description update
- `src/components/entry-form.tsx` - JSX closing tag fix (pre-existing bug)

## API Route Verification
- `/api/balances/route.ts` - Already correct. Uses pre-computed `closingBalance` from DailyEntry and `creditPosted` for aging. No changes needed.
- `/api/entries/route.ts` - Already correctly implements the new formula with `calculateFields()`. Handles all new fields (claimCleared, oldRecovery, returnStockClaimByOB). No changes needed.

## Lint Status
All lint checks pass cleanly after fixes.
