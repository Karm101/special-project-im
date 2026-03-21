/**
 * lib/api.ts
 * Centralized API client for DRMS Django backend.
 * Place this file at: special-project-im/lib/api.ts
 *
 * All Next.js pages import from here instead of writing fetch() directly.
 * Base URL: ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api
 */

const BASE = "${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api";

async function apiFetch(path: string, options?: RequestInit) {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("drms_token")
      : null;

  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Token ${token}` } : {}),
    },
    ...options,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `HTTP ${res.status}`);
  }

  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function staffLogin(username: string, password: string) {
  const data = await apiFetch("/auth/staff-login/", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  // Save token to localStorage for subsequent requests
  if (data.token) {
    localStorage.setItem("drms_token", data.token);
    localStorage.setItem("drms_staff", JSON.stringify(data));
  }
  return data;
}

export async function studentLogin(student_number: string) {
  const data = await apiFetch("/auth/student-login/", {
    method: "POST",
    body: JSON.stringify({ student_number }),
  });
  if (data.requester_id) {
    localStorage.setItem("drms_student", JSON.stringify(data));
  }
  return data;
}

export function logout() {
  localStorage.removeItem("drms_token");
  localStorage.removeItem("drms_staff");
  localStorage.removeItem("drms_student");
}

export function getCurrentStaff() {
  if (typeof window === "undefined") return null;
  const s = localStorage.getItem("drms_staff");
  return s ? JSON.parse(s) : null;
}

export function getCurrentStudent() {
  if (typeof window === "undefined") return null;
  const s = localStorage.getItem("drms_student");
  return s ? JSON.parse(s) : null;
}

// ── Document Requests ─────────────────────────────────────────────────────────

/** GET /api/requests/ — paginated list for dashboard table */
export const getRequests = (params = "") =>
  apiFetch(`/requests/${params}`);

/** GET /api/requests/?academic_level=College — filter by dept */
export const getRequestsByLevel = (level: "College" | "SHS") =>
  apiFetch(`/requests/?academic_level=${level}`);

/** GET /api/requests/?current_status=Processing */
export const getRequestsByStatus = (statusValue: string) =>
  apiFetch(`/requests/?current_status=${encodeURIComponent(statusValue)}`);

/** GET /api/requests/{id}/ — full detail (nested requester, docs, payment, etc.) */
export const getRequest = (id: number) =>
  apiFetch(`/requests/${id}/`);

/** POST /api/requests/ — create new request */
export const createRequest = (data: object) =>
  apiFetch("/requests/", {
    method: "POST",
    body: JSON.stringify(data),
  });

/**
 * PATCH /api/requests/{id}/update_status/
 * Changes status AND logs the change in request_status_log.
 */
export const updateRequestStatus = (
  id: number,
  statusValue: string,
  remarks: string,
  staff_id: number
) =>
  apiFetch(`/requests/${id}/update_status/`, {
    method: "PATCH",
    body: JSON.stringify({ status: statusValue, remarks, staff_id }),
  });

/** GET /api/track/{id}/ — public, no auth required */
export const trackRequest = (id: number) =>
  apiFetch(`/track/${id}/`);

// ── Requesters ────────────────────────────────────────────────────────────────

export const getRequesters = (search = "") =>
  apiFetch(`/requesters/${search ? `?search=${search}` : ""}`);

export const createRequester = (data: object) =>
  apiFetch("/requesters/", { method: "POST", body: JSON.stringify(data) });

// ── Staff ─────────────────────────────────────────────────────────────────────

/** GET /api/staff/ — used for assignment dropdowns */
export const getStaffList = () => apiFetch("/staff/");

// ── Document Types ────────────────────────────────────────────────────────────

/** GET /api/document-types/ — populate New Request document checklist */
export const getDocumentTypes = () => apiFetch("/document-types/");

// ── Payments ──────────────────────────────────────────────────────────────────

export const getPayments = (statusFilter = "") =>
  apiFetch(`/payments/${statusFilter ? `?payment_status=${statusFilter}` : ""}`);

export const updatePayment = (id: number, data: object) =>
  apiFetch(`/payments/${id}/`, { method: "PATCH", body: JSON.stringify(data) });

// ── Clearances ────────────────────────────────────────────────────────────────

/** GET /api/clearances/?request={requestId} — all offices for one TC request */
export const getClearancesForRequest = (requestId: number) =>
  apiFetch(`/clearances/?request=${requestId}`);

/** PATCH /api/clearances/{id}/ — mark an office as Cleared */
export const updateClearance = (id: number, data: object) =>
  apiFetch(`/clearances/${id}/`, { method: "PATCH", body: JSON.stringify(data) });

// ── Claim Slips ───────────────────────────────────────────────────────────────

export const getClaimSlips = () => apiFetch("/claimslips/");

/** GET /api/claimslips/expiring_soon/ — slips expiring within 7 days */
export const getExpiringSoon = () => apiFetch("/claimslips/expiring_soon/");

// ── Notifications ─────────────────────────────────────────────────────────────

export const getNotifications = (recipientType?: "Staff" | "Student") =>
  apiFetch(
    `/notifications/${recipientType ? `?recipient_type=${recipientType}` : ""}`
  );

export const markNotificationRead = (id: number) =>
  apiFetch(`/notifications/${id}/mark_read/`, { method: "PATCH" });
