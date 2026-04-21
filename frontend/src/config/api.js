/**
 * Centralized API base URL configuration.
 *
 * Values are read from Vite environment variables so they can be
 * changed per environment without touching code.
 *
 * Port layout:
 *   8000  — Unified backend (Extraction, Interview, OnboardGuard)
 */

export const RECRO_API   = import.meta.env.VITE_RECRO_API   || 'http://localhost:8000';
export const ONBOARD_API = import.meta.env.VITE_ONBOARD_API || 'http://localhost:8000';
export const INTERVIEW_AI_API = import.meta.env.VITE_INTERVIEW_AI_API || 'http://localhost:8000';
