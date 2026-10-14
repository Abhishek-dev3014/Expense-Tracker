# Overview and transaction usability

This iteration improves the existing tracker for personal, student, and household use. It is based on the supplied screenshots, source-code review, and general usability research. No customer interviews, session recordings, or product analytics were available; the behavioral statements below are hypotheses, not measured findings.

## Shared tasks and design decisions

| Likely task | Change | Reason |
| --- | --- | --- |
| Check recent purchases quickly | Recent activity now appears before the chart | Make the everyday review task easier to reach |
| Understand today's spending | Replace the all-time expense card with spent today in expense mode | Different time frames answer different questions instead of repeating the same amount for new users |
| Understand a new account with little history | Default to a daily chart for the current month; retain 3M and 6M | A few days of data remain useful without five empty historical months |
| Find a remembered purchase | Combine description search, date presets, type, and category | Users can recognize a date/category without recalling the exact description |
| Review many entries | Group by Today, Yesterday, or calendar date | Make the chronological structure visible |
| Move from overview to details | Preserve the expense-only choice in the View all link | Match the transaction list to the task the user started |
| Recover from no results or network failure | Reset filters, retry, and disable stale export | Clearly distinguish no matches from unavailable data |
| Record shared purchases | Preserve edit, split, and delete controls with accessible names | Household users retain existing shared-expense functionality |
| Record an expense on a phone | Wider primary action and touch targets, responsive filters, stacked rows | Reduce precision and horizontal scrolling requirements |
| Confirm a completed action | Announce successful create/delete operations | Make the result of an action visible |

Students can use Expenses only without entering income. Household users can use custom categories and the existing split flow. Users managing income retain the full overview. The app does not infer someone's occupation, family status, income adequacy, or financial health.

All figures describe recorded transactions. Recorded balance is not a bank balance. Category summaries describe the current calendar month. Date filters use explicit local start/end instants, and filtering happens in the API before pagination. CSV export remains explicitly limited to the current filtered page.

## Evidence informing the design

- [Nielsen Norman Group: Recognition vs. Recall](https://www.nngroup.com/articles/recognition-and-recall/): visible choices and recognizable labels reduce the need to remember information.
- [Nielsen Norman Group: Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/): prioritize frequent tasks while retaining access to secondary detail.

These sources support general interaction principles; they do not establish preferences or improved retention for this product.

## Validate with customers

Recruit people from all three audiences and observe these tasks with their permission and suitable sample data:

1. Record a purchase, then confirm that it appears in recent activity.
2. Find a grocery expense from last month without knowing its exact title.
3. Explain what each overview amount means and whether it is an actual bank balance.
4. Find the category contributing the most to monthly spending and inspect its entries.
5. Recover from an empty search and edit a mistaken entry on a phone.
6. Locate the split action for a shared household purchase.

Record completion rate, time, mistakes, and participants' explanations. Compare with the prior interface before claiming an improvement. Ask which information they look for first and what makes them stop tracking. Do not collect transaction descriptions or amounts for analytics. No telemetry or third-party tracking was added in this change.

## Verification

- Frontend production build and ESLint.
- Existing frontend suite plus calendar-boundary and daily-summary regression tests.
- Browser checks use an isolated, temporary API with synthetic records, never a real account. Desktop and 390px mobile layouts, combined filters, empty-result recovery, pagination, and expense-mode navigation are checked separately from backend integration.
