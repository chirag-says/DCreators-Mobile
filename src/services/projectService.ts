// ============================================
// Project Service — Production-grade
// All Supabase queries related to projects,
// payments, submissions, and project lifecycle.
// ============================================

import { supabase } from '../lib/supabase';
import type { Project, ProjectStatus, Payment, Submission } from '../types';

/** Project with joined consultant info for client views */
export interface ProjectWithConsultant extends Project {
  consultant_profiles?: {
    display_name: string;
    code: string;
    avatar_url?: string | null;
    category?: string;
  } | null;
}

/** Project with joined client info for consultant views */
export interface ProjectWithClient extends Project {
  profiles?: {
    name: string;
    email: string;
    avatar_url?: string | null;
  } | null;
}

/** Active statuses for consultant dashboard (CONSULTANT_PROJECT_MANAGEMENT_SCREEN) */
const CONSULTANT_ACTIVE_STATUSES: ProjectStatus[] = [
  'assigned', 'advance_pending', 'advance_paid',
  'work_order_generated', 'work_order_accepted',
  'in_progress', 'review_1', 'review_2', 'final_review',
];

/** Active statuses for client dashboard */
const CLIENT_ACTIVE_STATUSES: ProjectStatus[] = [
  'draft', 'assigned', 'advance_pending', 'advance_paid',
  'work_order_generated', 'work_order_accepted',
  'in_progress', 'review_1', 'review_2', 'final_review',
  'final_approved', 'balance_pending',
];

/** Completed statuses for history */
const COMPLETED_STATUSES: ProjectStatus[] = [
  'balance_paid', 'delivered', 'completed',
];


// ─── Project Queries ─────────────────────────────────────────

/**
 * Fetch active projects assigned to a consultant.
 */
export async function fetchConsultantProjects(consultantId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('consultant_id', consultantId)
    .in('status', CONSULTANT_ACTIVE_STATUSES)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[ProjectService] fetchConsultantProjects error:', error.message);
    throw new Error(error.message);
  }

  return (data ?? []) as Project[];
}

/**
 * Fetch active projects for a client, with consultant info joined.
 */
export async function fetchClientProjects(clientId: string): Promise<ProjectWithConsultant[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*, consultant_profiles(display_name, code, avatar_url, category)')
    .eq('client_id', clientId)
    .in('status', CLIENT_ACTIVE_STATUSES)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[ProjectService] fetchClientProjects error:', error.message);
    throw new Error(error.message);
  }

  return (data ?? []) as ProjectWithConsultant[];
}

/**
 * Fetch completed projects for history view.
 */
export async function fetchProjectHistory(userId: string, role: 'client' | 'consultant'): Promise<Project[]> {
  const column = role === 'client' ? 'client_id' : 'consultant_id';
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq(column, userId)
    .in('status', [...COMPLETED_STATUSES, 'cancelled', 'rejected'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[ProjectService] fetchProjectHistory error:', error.message);
    throw new Error(error.message);
  }

  return (data ?? []) as Project[];
}

/**
 * Fetch a single project by ID with full details.
 */
export async function fetchProjectById(projectId: string): Promise<ProjectWithConsultant | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*, consultant_profiles(display_name, code, avatar_url, category)')
    .eq('id', projectId)
    .single();

  if (error) {
    console.error('[ProjectService] fetchProjectById error:', error.message);
    return null;
  }

  return data as ProjectWithConsultant;
}

// ─── Status Machine ──────────────────────────────────────────

/**
 * Canonical status machine — spec-locked.
 * Every arrow in the spec maps to an entry here.
 * Key = current status, Value = valid next statuses.
 * NEVER add a transition not in the spec.
 */
const STATUS_TRANSITIONS: Partial<Record<ProjectStatus, ProjectStatus[]>> = {
  // CLIENT_ASSIGN_PROJECT_SCREEN → CLIENT_CONSULTANT_MATCHING_SCREEN
  draft: ['assigned', 'cancelled'],

  // CLIENT_CONSULTANT_MATCHING_SCREEN: consultant selected
  assigned: ['advance_pending', 'cancelled'],

  // CLIENT_ADVANCE_PAYMENT_SCREEN: client submits payment
  advance_pending: ['advance_paid', 'cancelled'],

  // CLIENT_GENERATE_WORK_ORDER_SCREEN: WO created
  advance_paid: ['work_order_generated'],

  // CONSULTANT_WORK_ORDER_SCREEN: consultant accepts WO
  work_order_generated: ['work_order_accepted'],

  // CLIENT_WORK_ORDER_APPROVAL_SCREEN: client approves WO → project starts
  work_order_accepted: ['in_progress'],

  // CONSULTANT_FIRST_REVIEW_UPLOAD_SCREEN: upload draft 1
  in_progress: ['review_1'],

  // CLIENT_DESIGN_REVIEW_SCREEN round 1
  review_1: ['review_2', 'in_progress'],   // revert = in_progress

  // CLIENT_DESIGN_REVIEW_SCREEN round 2
  review_2: ['final_review', 'in_progress'],

  // CLIENT_DESIGN_REVIEW_SCREEN round 3 (FINAL — max 3 rounds)
  final_review: ['final_approved', 'in_progress'],

  // CLIENT_BALANCE_PAYMENT_SCREEN: payment initiated
  final_approved: ['balance_pending'],

  // CLIENT_FINAL_PAYMENT_SUCCESS_SCREEN: download unlocked
  balance_pending: ['balance_paid'],

  // CLIENT_FINAL_PAYMENT_SUCCESS_SCREEN → download
  balance_paid: ['delivered'],

  // CLIENT_REVIEW_CONSULTANT_SCREEN: review submitted
  delivered: ['completed'],
};


/**
 * Update a project's status with validation against the status machine.
 */
export async function updateProjectStatus(
  projectId: string,
  newStatus: ProjectStatus,
  extraFields?: Record<string, unknown>,
): Promise<void> {
  const { data: project, error: fetchErr } = await supabase
    .from('projects')
    .select('status')
    .eq('id', projectId)
    .single();

  if (fetchErr || !project) {
    throw new Error(fetchErr?.message || 'Project not found');
  }

  const currentStatus = project.status as ProjectStatus;
  const allowedNext = STATUS_TRANSITIONS[currentStatus];

  if (!allowedNext || !allowedNext.includes(newStatus)) {
    throw new Error(
      `Invalid transition: ${currentStatus} → ${newStatus}. Allowed: ${allowedNext?.join(', ') || 'none'}`
    );
  }

  const { error } = await supabase
    .from('projects')
    .update({ status: newStatus, updated_at: new Date().toISOString(), ...extraFields })
    .eq('id', projectId);

  if (error) {
    throw new Error(error.message);
  }
}

// ─── Payment Queries ─────────────────────────────────────────

/**
 * Fetch payments for a project.
 */
export async function fetchProjectPayments(projectId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[ProjectService] fetchProjectPayments error:', error.message);
    throw new Error(error.message);
  }

  return (data ?? []) as Payment[];
}

/**
 * Fetch consultant's total earnings (completed payments where they are the consultant).
 */
export async function fetchConsultantEarnings(consultantUserId: string): Promise<{
  total: number;
  pending: number;
  thisMonth: number;
}> {
  // consultant_id in projects = auth user_id (not consultant_profiles.id row)
  const { data: projects, error: projErr } = await supabase
    .from('projects')
    .select('id')
    .eq('consultant_id', consultantUserId);

  if (projErr || !projects?.length) {
    return { total: 0, pending: 0, thisMonth: 0 };
  }

  const projectIds = projects.map(p => p.id);

  // Get all completed payments for these projects
  const { data: payments, error: payErr } = await supabase
    .from('payments')
    .select('amount, status, created_at')
    .in('project_id', projectIds);

  if (payErr || !payments?.length) {
    return { total: 0, pending: 0, thisMonth: 0 };
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  let total = 0;
  let pending = 0;
  let thisMonth = 0;

  for (const p of payments) {
    if (p.status === 'completed') {
      total += p.amount;
      if (p.created_at >= monthStart) {
        thisMonth += p.amount;
      }
    } else if (p.status === 'pending') {
      pending += p.amount;
    }
  }

  return { total, pending, thisMonth };
}

// ─── Submission Queries ──────────────────────────────────────

/**
 * Fetch all submissions for a project.
 */
export async function fetchProjectSubmissions(projectId: string): Promise<Submission[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[ProjectService] fetchProjectSubmissions error:', error.message);
    throw new Error(error.message);
  }

  return (data ?? []) as Submission[];
}

/**
 * Create a new submission for a project round.
 */
export async function createSubmission(submission: {
  project_id: string;
  round: 'review_1' | 'review_2' | 'final';
  files: string[];
  consultant_note?: string;
}): Promise<Submission> {
  const { data, error } = await supabase
    .from('submissions')
    .insert(submission)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Submission;
}

/**
 * Update a submission with client feedback/action.
 */
export async function updateSubmissionFeedback(
  submissionId: string,
  feedback: {
    client_action: 'approve' | 'revert' | 'hold' | 'cancel';
    feedback_colour?: boolean;
    feedback_concept?: boolean;
    feedback_design_look?: boolean;
    feedback_text?: string;
    selected_option?: number;
  },
): Promise<void> {
  const { error } = await supabase
    .from('submissions')
    .update(feedback)
    .eq('id', submissionId);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Fetch reviews left for a consultant (for the feedback section).
 */
export async function fetchConsultantReviews(consultantUserId: string): Promise<Array<{
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  profiles?: { name: string } | null;
}>> {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, rating, review_text, created_at, profiles(name)')
    .eq('consultant_id', consultantUserId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('[ProjectService] fetchConsultantReviews error:', error.message);
    return [];
  }

  return (data ?? []) as any[];
}
