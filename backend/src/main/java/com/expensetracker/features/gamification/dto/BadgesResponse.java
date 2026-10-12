package com.expensetracker.features.gamification.dto;

import java.util.*;

public record BadgesResponse(List<String> badges, List<String> unlocked) {}
