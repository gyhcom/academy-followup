package com.academyfollowup.api.report;

import java.time.LocalDate;
import java.time.ZoneId;
import org.springframework.stereotype.Component;

@Component
public class ReportRangeCalculator {

    private static final ZoneId KOREA_ZONE = ZoneId.of("Asia/Seoul");

    public ReportRangeBounds calculate(ReportRange range) {
        LocalDate today = LocalDate.now(KOREA_ZONE);
        LocalDate startDate = switch (range) {
            case TODAY -> today;
            case SEVEN_DAYS -> today.minusDays(6);
            case MONTH -> today.withDayOfMonth(1);
        };
        LocalDate exclusiveEndDate = range == ReportRange.MONTH
                ? startDate.plusMonths(1)
                : today.plusDays(1);

        return new ReportRangeBounds(
                startDate.toString(),
                today.toString(),
                toKoreaStartIso(startDate),
                toKoreaStartIso(exclusiveEndDate),
                range.label()
        );
    }

    private String toKoreaStartIso(LocalDate date) {
        return date.atStartOfDay(KOREA_ZONE).toOffsetDateTime().toString();
    }
}
