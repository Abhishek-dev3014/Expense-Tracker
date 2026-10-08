# FinTrack UI

The interface uses warm off-white surfaces, forest green primary actions, sage chart accents, and muted terracotta for spending alerts. Manrope is used for headings and DM Sans for body text. Keep borders subtle, corners modest, and financial amounts aligned with tabular numerals.

## Reference patterns

- [Monarch's dashboard](https://help.monarch.com/hc/en-us/articles/360058127551-Customizing-Your-Dashboard) brings financial summaries, spending, transactions, and recurring payments into focused widgets.
- [Copilot's dashboard](https://help.copilot.money/en/articles/6045480-dashboard-tab-overview) prioritises spending progress, remaining budget, recent transactions, upcoming payments, and net income.

These informed the information hierarchy; FinTrack's palette, layouts, and components are independently implemented.

## Interface conventions

- The overview shows lifetime balance separately from the current month's income, expenses, and savings. Monthly calculations use transaction dates, including the year.
- The overview's Expenses only button switches to monthly spending, daily average, lifetime expenses, an expense chart, and paginated recent expenses. It keeps Add expense available and hides the income action on the overview. Full overview restores the original summary. This display preference is saved per account in this browser; transaction data and other pages are unchanged.
- The cash-flow chart covers the last six calendar months and explicitly includes empty months.
- The primary action is Add expense; Add income is a secondary action. Both use the same accessible dialog component, default to today's local date, support decimal amounts, and show submission errors without discarding input.
- Transactions update after saves without reloading the entire application. Search resets pagination and safely encodes query text. CSV export explicitly applies to the visible page.
- Mobile transaction rows keep amounts visible and move the category/date into a subtitle. Navigation becomes a keyboard-accessible drawer below 1024 px.
- Use actual empty states instead of illustrative data in the product. API errors are distinct from an empty account.
- Colour tokens and layout styles live in `src/index.css`; the reusable brand is in `src/components/ui/Brand.jsx`.

## Verification

Run from `frontend/expense-tracker`:

```sh
npm run dev
npm run build
npm run lint
npm test
```

The finance tests cover monthly filtering, year boundaries, transaction types, category grouping, empty accounts, and expense filtering before pagination. Desktop and mobile browser checks were performed with mocked API responses, including all dashboard routes, transaction creation and failed-save recovery, modal keyboard navigation, search, pagination, CSV download, and empty/error states. Expenses-only checks cover view switching, saved preferences, account isolation, expense creation and refresh, income-only empty states, and widths from 320 to 1440 px. Production database connectivity and live authentication were not exercised by those browser checks. No sample transactions are included in application code.
