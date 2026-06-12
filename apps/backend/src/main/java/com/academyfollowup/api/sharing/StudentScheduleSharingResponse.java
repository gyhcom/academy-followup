package com.academyfollowup.api.sharing;

import java.util.List;

public record StudentScheduleSharingResponse(
        Boolean canManage,
        List<LinkItem> links,
        String code,
        String expiresAt,
        String message
) {

    public record LinkItem(
            String id,
            String academyName,
            String connectedAt,
            List<ScheduleItem> schedules
    ) {
    }

    public record ScheduleItem(
            String id,
            String academyName,
            String scheduleType,
            String scheduleDate,
            int dayOfWeek,
            String startTime,
            String endTime,
            String subject,
            String title
    ) {
    }
}
