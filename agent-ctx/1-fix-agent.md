---
Task ID: 1
Agent: fix-agent
Task: Fix client-side errors causing application crash after login

Work Log:
- Replaced `initialFocus` with `autoFocus` on all Calendar components (5 instances):
  - dashboard-page.tsx line 443 (range mode calendar)
  - entries-table.tsx line 297 (range mode calendar)
  - entry-form.tsx lines 470 and 663 (single mode calendars, bulk and single entry modes)
  - reports-page.tsx line 244 (range mode calendar)
- Added missing Duplicate Dialog in entries-table.tsx:
  - Component had `duplicateDialogOpen`, `duplicateEntry`, `handleDuplicateSave` state/functions but no Dialog JSX
  - Added confirmation dialog showing entry details (OB, company, summary, stock return, cash, old recovery, notes)
  - Includes Cancel and Confirm Duplicate buttons
  - Shows note about today's date and [Copy] prefix
- Added ErrorBoundary component to page.tsx:
  - Class-based React ErrorBoundary wrapping AuthProvider + AppContent
  - Shows friendly error message with AlertTriangle icon
  - Expandable error details section
  - "Try Again" button to reset error state
  - "Reload Page" button for full refresh
- Fixed null access safety in dashboard-page.tsx:
  - Line 628: `data.summary.entryCount` → `data.summary?.entryCount ?? 0`
  - Line 649: `data.orderBookerBreakdown.length` → `data.orderBookerBreakdown?.length ?? 0`
- Ran `bun run lint` - all checks pass cleanly
- Dev server compiles and serves pages successfully

Stage Summary:
- `initialFocus` prop removed from all 5 Calendar instances (react-day-picker v9 compatibility)
- Duplicate Dialog added to entries-table.tsx with confirmation flow
- ErrorBoundary wraps entire app in page.tsx for graceful error handling
- Defensive null checks added for dashboard summary data access
- All lint checks pass, no regressions introduced
