"use client";

import { useEffect, useRef, useState } from "react";
import { reportFeedbackApi, type ReportFeedbackRow } from "@/features/feedback/api";
import type { ExpandedReportContent } from "@/features/feedback/components/deposit-feedback-panel";
import type { EmployerSelection } from "@/lib/session/app-store";
import { errorMessage } from "@/lib/api/error-messages";

/** Expanded report deposits, paging and manufacturer filtering for one employer. */
export function useReportDeposits(scope: EmployerSelection) {
  const [expandedKeys, setExpandedKeys] = useState<ReadonlySet<string>>(new Set());
  const [expandedContent, setExpandedContent] = useState<Record<string, ExpandedReportContent>>({});
  const [expandedLoading, setExpandedLoading] = useState<Record<string, boolean>>({});
  const [expandedErrors, setExpandedErrors] = useState<Record<string, string>>({});
  const [expandedMoreLoading, setExpandedMoreLoading] = useState<Record<string, boolean>>({});
  const [expandedManufacturerInput, setExpandedManufacturerInput] = useState<Record<string, string>>({});
  const [expandedManufacturerFilter, setExpandedManufacturerFilter] = useState<Record<string, string>>({});
  const expandedRequests = useRef(new Map<string, symbol>());

  async function loadExpanded(report: ReportFeedbackRow, force = false, manufacturerOverride?: string) {
    if (!scope || (!force && (expandedRequests.current.has(report.id) || expandedContent[report.id]))) return;
    const request = Symbol();
    expandedRequests.current.set(report.id, request);
    setExpandedLoading((previous) => ({ ...previous, [report.id]: true }));
    setExpandedErrors((previous) => ({ ...previous, [report.id]: "" }));
    try {
      const manufacturer = manufacturerOverride ?? expandedManufacturerFilter[report.id] ?? "";
      const deposits = await reportFeedbackApi.deposits(
        scope.organizationId, scope.employerId, report.id, "", 0, 100, manufacturer,
      );
      if (expandedRequests.current.get(report.id) !== request) return;
      setExpandedContent((previous) => ({
        ...previous,
        [report.id]: {
          deposits: deposits.items,
          hasMore: deposits.hasMore,
          manufacturers: deposits.manufacturers,
        },
      }));
    } catch (err) {
      if (expandedRequests.current.get(report.id) === request)
        setExpandedErrors((previous) => ({ ...previous, [report.id]: errorMessage(err, "טעינת ההפקדות נכשלה") }));
    } finally {
      if (expandedRequests.current.get(report.id) === request) {
        expandedRequests.current.delete(report.id);
        setExpandedLoading((previous) => ({ ...previous, [report.id]: false }));
        setExpandedMoreLoading((previous) => ({ ...previous, [report.id]: false }));
      }
    }
  }

  async function loadMoreDeposits(report: ReportFeedbackRow) {
    if (!scope || expandedRequests.current.has(report.id) || expandedMoreLoading[report.id] || !expandedContent[report.id]?.hasMore) return;
    const request = Symbol();
    expandedRequests.current.set(report.id, request);
    setExpandedMoreLoading((previous) => ({ ...previous, [report.id]: true }));
    try {
      const current = expandedContent[report.id];
      const next = await reportFeedbackApi.deposits(
        scope.organizationId,
        scope.employerId,
        report.id,
        "",
        current.deposits.length,
        100,
        expandedManufacturerFilter[report.id] ?? "",
      );
      if (expandedRequests.current.get(report.id) !== request) return;
      setExpandedContent((previous) => ({
        ...previous,
        [report.id]: {
          deposits: [...previous[report.id].deposits, ...next.items],
          hasMore: next.hasMore,
          manufacturers: next.manufacturers,
        },
      }));
    } catch (err) {
      if (expandedRequests.current.get(report.id) === request)
        setExpandedErrors((previous) => ({ ...previous, [report.id]: errorMessage(err, "טעינת הפקדות נוספות נכשלה") }));
    } finally {
      if (expandedRequests.current.get(report.id) === request) {
        expandedRequests.current.delete(report.id);
        setExpandedMoreLoading((previous) => ({ ...previous, [report.id]: false }));
      }
    }
  }

  function changeExpandedManufacturer(report: ReportFeedbackRow, value: string) {
    setExpandedManufacturerInput((previous) => ({ ...previous, [report.id]: value }));

    const normalized = value.trim();
    const manufacturers = expandedContent[report.id]?.manufacturers ?? [];
    const isExactManufacturer = manufacturers.some(
      (manufacturer) => manufacturer.localeCompare(normalized, "he", { sensitivity: "base" }) === 0,
    );
    if (normalized && !isExactManufacturer) return;

    const nextFilter = isExactManufacturer
      ? manufacturers.find((manufacturer) =>
          manufacturer.localeCompare(normalized, "he", { sensitivity: "base" }) === 0) ?? normalized
      : "";
    if ((expandedManufacturerFilter[report.id] ?? "") === nextFilter) return;

    setExpandedManufacturerFilter((previous) => ({ ...previous, [report.id]: nextFilter }));
    void loadExpanded(report, true, nextFilter);
  }

  useEffect(() => {
    const requests = expandedRequests.current;
    return () => requests.clear();
  }, []);

  function removeReport(reportId: string) {
    expandedRequests.current.delete(reportId);
    setExpandedKeys(current => new Set([...current].filter(id => id !== reportId)));
    setExpandedContent(current => {
      const next = { ...current };
      delete next[reportId];
      return next;
    });
  }

  function setExpanded(report: ReportFeedbackRow, expanded: boolean) {
    if (report.feedbackStatus === "not-sent") return;
    setExpandedKeys(current => {
      const next = new Set(current);
      if (expanded) next.add(report.id);
      else next.delete(report.id);
      return next;
    });
    if (expanded) void loadExpanded(report);
  }

  return {
    expandedKeys, setExpanded, expandedContent, expandedLoading, expandedErrors,
    expandedMoreLoading, expandedManufacturerInput,
    loadExpanded, loadMoreDeposits, changeExpandedManufacturer, removeReport,
  };
}
