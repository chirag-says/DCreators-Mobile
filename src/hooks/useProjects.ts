// ============================================
// useProjects Hook
// Manages project data for both dashboards
// ============================================

import { useState, useEffect, useCallback } from 'react';
import {
  fetchConsultantProjects,
  fetchClientProjects,
  updateProjectStatus,
} from '../services/projectService';
import type { Project, ProjectStatus } from '../types';
import type { ProjectWithConsultant } from '../services/projectService';

// ─── Consultant Projects Hook ────────────────────────────────

export interface UseConsultantProjectsReturn {
  projects: Project[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  handleAction: (projectId: string, action: 'accept' | 'reject') => Promise<{ success: boolean; error?: string }>;
}

export function useConsultantProjects(consultantId: string | undefined): UseConsultantProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!consultantId) {
      setProjects([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchConsultantProjects(consultantId);
      setProjects(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load projects';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [consultantId]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleAction = useCallback(async (
    projectId: string,
    action: 'accept' | 'reject',
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Spec: assigned → advance_pending (consultant accepts)
      //       assigned → rejected (consultant rejects)
      const newStatus: ProjectStatus = action === 'accept' ? 'advance_pending' : 'rejected';
      await updateProjectStatus(projectId, newStatus);
      await fetch();
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Action failed';
      return { success: false, error: message };
    }
  }, [fetch]);

  return { projects, loading, error, refresh: fetch, handleAction };
}

// ─── Client Projects Hook ────────────────────────────────────

export interface UseClientProjectsReturn {
  projects: ProjectWithConsultant[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useClientProjects(clientId: string | undefined): UseClientProjectsReturn {
  const [projects, setProjects] = useState<ProjectWithConsultant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!clientId) {
      setProjects([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchClientProjects(clientId);
      setProjects(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load projects';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { projects, loading, error, refresh: fetch };
}
