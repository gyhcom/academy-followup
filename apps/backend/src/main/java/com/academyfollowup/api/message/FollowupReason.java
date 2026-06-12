package com.academyfollowup.api.message;

import java.util.Arrays;

public enum FollowupReason {
    ABSENCE("absence", "결석", "결석 안내",
            "[{{academyName}}] 안녕하세요. 오늘 {{studentName}} 학생이 수업에 결석하여 안내드립니다.\n확인 부탁드리며, 보강 일정이 필요한 경우 {{teacherName}}이 다시 안내드리겠습니다."),
    LATE("late", "지각", "지각 안내",
            "[{{academyName}}] 안녕하세요. 오늘 {{studentName}} 학생이 수업에 지각하여 안내드립니다.\n수업 흐름이 끊기지 않도록 다음 수업부터 시간 확인 부탁드립니다."),
    HOMEWORK_MISSING("homework_missing", "숙제 미완료", "숙제 미완료 안내",
            "[{{academyName}}] 안녕하세요. {{studentName}} 학생이 이번 과제를 완료하지 못해 안내드립니다.\n다음 수업 전까지 과제를 마무리할 수 있도록 확인 부탁드립니다."),
    RETEST("retest", "재시험", "재시험 안내",
            "[{{academyName}}] 안녕하세요. {{studentName}} 학생은 오늘 수업 내용 중 재시험이 필요하여 안내드립니다.\n다음 수업 전까지 오답을 다시 확인할 수 있도록 지도 부탁드립니다."),
    MAKEUP("makeup", "보강 안내", "보강 안내 안내",
            "[{{academyName}}] 안녕하세요. {{studentName}} 학생 보강 일정 안내드립니다.\n가능하시면 {{makeupCandidateTime}} 시간으로 보강 진행 가능 여부 확인 부탁드립니다."),
    MATERIALS_MISSING("materials_missing", "준비물 미지참", "준비물 미지참 안내",
            "[{{academyName}}] 안녕하세요. 오늘 {{studentName}} 학생이 수업 준비물을 지참하지 않아 안내드립니다.\n다음 수업에는 교재와 필기구를 꼭 챙길 수 있도록 확인 부탁드립니다."),
    CLASS_ATTITUDE("class_attitude", "수업 태도", "수업 태도 안내",
            "[{{academyName}}] 안녕하세요. 오늘 {{studentName}} 학생의 수업 집중도와 참여도에 대해 확인이 필요하여 안내드립니다.\n담당 선생님이 수업 흐름을 다시 잡을 수 있도록 지도하겠습니다."),
    CONSULTATION("consultation", "상담 권장", "상담 권장 안내",
            "[{{academyName}}] 안녕하세요. {{studentName}} 학생의 최근 학습 흐름에 대해 간단한 상담이 필요하여 안내드립니다.\n가능하신 시간에 {{teacherName}}에게 연락 부탁드립니다.");

    private final String value;
    private final String label;
    private final String defaultTitle;
    private final String defaultTemplate;

    FollowupReason(String value, String label, String defaultTitle, String defaultTemplate) {
        this.value = value;
        this.label = label;
        this.defaultTitle = defaultTitle;
        this.defaultTemplate = defaultTemplate;
    }

    public String value() {
        return value;
    }

    public String label() {
        return label;
    }

    public String defaultTitle() {
        return defaultTitle;
    }

    public String defaultTemplate() {
        return defaultTemplate;
    }

    public static FollowupReason from(String value) {
        return Arrays.stream(values())
                .filter(reason -> reason.value.equals(value))
                .findFirst()
                .orElse(null);
    }
}
