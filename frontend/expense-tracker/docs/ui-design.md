# FinTrack UI

The interface uses a navy navigation rail and balance card, cool off-white workspace, white data surfaces, and cobalt primary actions. Inter provides one consistent typeface across headings, controls, and financial figures. Teal identifies income, amber identifies spending, and errors retain a distinct red. Financial values use tabular numerals. Body and metadata sizes have been increased for readability, with 44 px primary controls and 16 px form inputs on small screens.

## Reference patterns

- [Monarch's dashboard](https://help.monarch.com/hc/en-us/articles/360058127551-Customizing-Your-Dashboard) brings financial summaries, spending, transactions, and recurring payments into focused widgets.
- [Copilot's dashboard](https://help.copilot.money/en/articles/6045480-dashboard-tab-overview) prioritises spending progress, remaining budget, recent transactions, upcoming payments, and net income.

- [Lunch Money](https://lunchmoney.app/) keeps transaction detail and category-level spending close to budgeting workflows.
- [Copilot's product site](https://www.copilot.money/) uses prominent totals, restrained surfaces, and separate chart colors to make financial information easy to scan.

Reviewed October 10, 2026. These references informed the hierarchy and use of color; FinTrack's palette, layouts, and components are independently implemented. The refresh reduces dashboard header space, introduces a proportional category ring alongside the exact category amounts, and keeps the table and primary expense action easy to find.

## Interface conventions

- The overview shows lifetime balance separately from the current month's income, expenses, and savings. Monthly calculations use transaction dates, including the year.
- The overview's Expenses only button switches to monthly spending, daily average, lifetime expenses, an expense chart, and paginated recent expenses. It keeps Add expense available and hides the income action on the overview. Full overview restores the original summary. This display preference is saved per account in this browser; transaction data and other pages are unchanged.
- The cash-flow chart covers the last six calendar months and explicitly includes empty months.
- The primary action is Add expense; Add income is a secondary action. Both use the same accessible dialog component, default to today's local date, support decimal amounts, and show submission errors without discarding input.
- Transactions update after saves without reloading the entire application. Search resets pagination and safely encodes query text. CSV export explicitly applies to the visible page.
- Mobile transaction rows keep amounts visible and move the category/date into a subtitle. Navigation becomes a keyboard-accessible drawer below 1024 px.
- Use actual empty states instead of illustrative data in the product. API errors are distinct from an empty account.
- Sign-in and sign-up share the navy/cobalt palette, practical feature descriptions, and an accessible show/hide password control.
- Analytics labels distinguish all recorded spending from monthly figures; the previous average across weekday groups is no longer presented as a daily average.
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

## October 10 refresh validation

- Frontend unit tests, ESLint, and production build pass.
- Browser checks used a local mock API: sign-in, show/hide password, expense creation with immediate refresh, expenses-only persistence, and mobile navigation.
- Reviewed overview at 320, 390, 768, 1024, and 1440 px; checked the remaining dashboard routes on mobile and desktop, including analytics after responsive chart resizing.
- Preview transactions belong only to the temporary local fixture server. No production transactions or credentials were used.

## Custom categories

The transaction dialog offers Add category underneath the category selector. A successful save immediately selects the new category, then lists it under Your categories on future visits. Categories are stored in MongoDB by authenticated account and transaction type, so expense and income lists stay separate and follow the account across browsers. Existing transactions keep their category strings unchanged.

The authenticated GET/POST `/api/categories` endpoints validate names (1–40 characters), normalize whitespace and case for duplicate matching, and atomically upsert against a unique account/type/name index. The backend must deploy alongside the frontend. Loading or saving failures remain visible and retryable; the UI never claims a failed save persisted.

Category handler tests cover account scoping, validation, built-in reuse, concurrent duplicate creation, and database failure responses. Local browser checks with a mock API cover creating a category, selecting it immediately, reloading and reusing it, saving an expense with it, and keeping it out of income categories. Production database writes were not used for testing.
