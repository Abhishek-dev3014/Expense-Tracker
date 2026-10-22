package com.expensetracker.features.analytics.application.forecast;

import com.expensetracker.features.analytics.application.PlanningWindow;
import com.expensetracker.features.analytics.domain.AnalyticsCoverage;
import com.expensetracker.features.analytics.dto.PlanningResponse.Outlook;
import com.expensetracker.features.recurring.domain.RecurringTransaction;
import com.expensetracker.features.transaction.domain.Transaction;
import java.util.List;

/** A replaceable forecasting port. A trained challenger must pass offline evaluation first. */
public interface SpendingForecaster {
    Outlook forecast(
            List<Transaction> history,
            List<RecurringTransaction> schedules,
            AnalyticsCoverage coverage,
            PlanningWindow window);
}
