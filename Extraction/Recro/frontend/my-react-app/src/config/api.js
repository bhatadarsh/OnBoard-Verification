/**
 * Centralized API base URL configuration.
 *
 * Values are read from Vite environment variables so they can be
 * changed per environment without touching code.
 *
 * Port layout:
 *   8001  — Extraction/Recro backend  (candidate register, apply, interview scheduling)
 *   8002  — OnBoard-Verification       (document upload, AI extraction, form validation)
 *   8003  — Recro AI Interview engine  (start AI interview session)
 */

export const RECRO_API   = import.meta.env.VITE_RECRO_API   || 'http://localhost:8001';
export const ONBOARD_API = import.meta.env.VITE_ONBOARD_API || 'http://localhost:8002';
export const INTERVIEW_AI_API = import.meta.env.VITE_INTERVIEW_AI_API || 'http://localhost:8003';
