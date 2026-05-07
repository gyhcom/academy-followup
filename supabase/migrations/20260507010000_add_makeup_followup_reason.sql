-- 보강 안내 팔로업 사유입니다.
-- 학생 스케줄에서 후보 시간을 고른 뒤 학부모 안내 문자를 만들 때 사용합니다.

alter type public.followup_reason add value if not exists 'makeup';
