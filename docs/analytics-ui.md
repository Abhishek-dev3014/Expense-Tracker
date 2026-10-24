# Analytics interface

Updated 24 October 2026. The redesign separates three tasks rather than presenting every analysis and setup option together.

- **Spending** opens first: recorded total, purchase count, average expense, a daily bar chart and the five largest categories. Expand the category list to see the rest. Isolated spending days remain visible as bars, while missing days are not connected or presented as confirmed zero spending.
- **My review** contains personal good/fine/could-improve ratings, five recent purchases with editable ratings, and history-based observations when available. More recent purchases can be expanded. Suggestion settings stay collapsed until needed. Suggestions still require confirmation.
- **Plan ahead** contains the spending forecast and the savings scenario once each. Recurring candidates appear only when there are suggestions. A forecast setup action opens and focuses the tracked-dates form. Budgets and goals link to their dedicated pages rather than duplicating those pages.

The view and selected month are retained in the URL. An empty month has one explanatory state instead of multiple empty charts. Data limitations remain available under About these numbers. No API contracts, stored ratings, learning behavior or financial records changed.

The information hierarchy follows [Nielsen Norman Group's progressive-disclosure guidance](https://www.nngroup.com/articles/progressive-disclosure/): show common tasks first and reveal specialized options when requested. This is a design rationale, not evidence from a customer usability study.

Validated the production frontend build against an isolated in-memory backend with synthetic purchases. Browser checks covered category expansion, view and month changes, selection persistence after refresh, empty months, editing a personal rating, expanding recent purchases and settings, savings preview, and forecast setup focus. Desktop and 390-pixel mobile-frame layouts were inspected. All 46 frontend tests, lint and production build passed. No backend redeployment is needed for this interface change.
