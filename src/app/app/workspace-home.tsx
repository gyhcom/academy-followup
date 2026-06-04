"use client";

import { useMemo, useState } from "react";
import {
  HomeDateControl,
  HomeHero,
  QuickActions,
  SharedSchedulePanel,
  TodayKpiCards,
  TodayScheduleSection,
  TodaySummaryPanel,
} from "@/app/app/workspace-home-sections";
import type {
  FollowupFilter,
  WorkspaceHomeProps,
} from "@/app/app/workspace-home-types";
import {
  buildHomeFollowupItems,
  buildHomeScheduleSummary,
  filterScheduleItemsForDate,
  getRoleHomeCopy,
} from "@/app/app/workspace-home-utils";

export function WorkspaceHome({
  academyName,
  teacherName,
  role,
  roleLabel,
  canManage,
  classes,
  scheduleItems,
  scheduleSummaryItems,
  selectedDate,
  records,
  loadState,
  onDateChange,
  onNavigate,
  onStudentSelect,
}: WorkspaceHomeProps) {
  const [expandedFilter, setExpandedFilter] = useState<FollowupFilter | null>(null);
  const followupItems = useMemo(
    () => buildHomeFollowupItems(classes, records),
    [classes, records],
  );
  const selectedScheduleItems = useMemo(
    () => filterScheduleItemsForDate(scheduleItems, selectedDate),
    [scheduleItems, selectedDate],
  );
  const selectedScheduleSummary = useMemo(
    () => buildHomeScheduleSummary(scheduleSummaryItems, selectedDate),
    [scheduleSummaryItems, selectedDate],
  );
  const sentCount = followupItems.filter((item) => item.followupStatus === "sent").length;
  const unsentCount = followupItems.length - sentCount;
  const copy = getRoleHomeCopy({ academyName, teacherName, role, roleLabel });
  const isStaffHome = role === "teacher" || role === "assistant";

  function toggleFilter(filter: FollowupFilter) {
    setExpandedFilter((current) => (current === filter ? null : filter));
  }

  return (
    <section className="mx-auto max-w-6xl space-y-4 bg-slate-50 sm:space-y-5">
      <HomeHero
        academyName={academyName}
        copy={copy}
        canManage={canManage}
        followupCount={followupItems.length}
        unsentCount={unsentCount}
        scheduleSummary={selectedScheduleSummary}
        onNavigate={onNavigate}
        onShowTargets={() => toggleFilter("all")}
      />

      <TodayKpiCards
        followupCount={followupItems.length}
        unsentCount={unsentCount}
        sentCount={sentCount}
        scheduleSummary={selectedScheduleSummary}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <main className="min-w-0 space-y-4">
          <HomeDateControl value={selectedDate} onChange={onDateChange} />
          <TodayScheduleSection
            items={selectedScheduleItems}
            summary={selectedScheduleSummary}
            selectedDate={selectedDate}
            isStaffHome={isStaffHome}
            onNavigate={onNavigate}
          />
        </main>

        <aside className="min-w-0 space-y-4">
          <SharedSchedulePanel
            items={selectedScheduleItems}
            summary={selectedScheduleSummary}
            selectedDate={selectedDate}
          />
          <QuickActions
            canManage={canManage}
            onNavigate={onNavigate}
            onShowTargets={() => toggleFilter("all")}
          />
          <TodaySummaryPanel
            selectedDate={selectedDate}
            recordsLength={records.length}
            loadState={loadState}
            followupItems={followupItems}
            unsentCount={unsentCount}
            sentCount={sentCount}
            expandedFilter={expandedFilter}
            onToggleFilter={toggleFilter}
            onCollapse={() => setExpandedFilter(null)}
            onDateChange={onDateChange}
            onStudentSelect={onStudentSelect}
          />
        </aside>
      </div>
    </section>
  );
}
