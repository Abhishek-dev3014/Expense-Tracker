package com.expensetracker.shared.validation;

import java.util.Locale;

public final class EmailAddresses {
    private EmailAddresses() {}

    public static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
