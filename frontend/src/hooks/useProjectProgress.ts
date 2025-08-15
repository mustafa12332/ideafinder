import { useState, useCallback, useEffect } from 'react';
import { ProjectPhase, PhaseStatus } from '../components/progress/types';

/**
 * Hook to manage global project progress across all workflow phases
 */
export const useProjectProgress = () => {
  const [phases, setPhases] = useState<ProjectPhase[]>([
    {
      id: 'discovery',
      label: 'Sub-Niche Discovery',
      progress: 0,
      status: 'pending',
      description: 'Discovering sub-niches and topics using Reddit analysis',
      estimatedDuration: 3
    },
    {
      id: 'trends',
      label: 'Trend Analysis',
      progress: 0,
      status: 'pending',
      description: 'Analyzing market trends and growth patterns',
      estimatedDuration: 5
    },
    {
      id: 'problems',
      label: 'Problem Extraction',
      progress: 0,
      status: 'pending',
      description: 'Identifying key problems and pain points',
      estimatedDuration: 4
    },
    {
      id: 'ideas',
      label: 'Idea Generation',
      progress: 0,
      status: 'pending',
      description: 'Generating innovative solutions and business ideas',
      estimatedDuration: 6
    }
  ]);

  // Update a specific phase
  const updatePhase = useCallback((phaseId: string, updates: Partial<ProjectPhase>) => {
    setPhases(prev => {
      const updated = prev.map(phase => 
        phase.id === phaseId 
          ? { 
              ...phase, 
              ...updates,
              // Auto-set timestamps
              ...(updates.status === 'running' && !phase.startTime ? { startTime: new Date() } : {}),
              ...(updates.status === 'done' && !phase.endTime ? { endTime: new Date() } : {})
            }
          : phase
      );
      return updated;
    });
  }, []);

  // Start a phase
  const startPhase = useCallback((phaseId: string) => {
    console.log(`Starting phase: ${phaseId}`);
    updatePhase(phaseId, { 
      status: 'running', 
      progress: 0,
      startTime: new Date() 
    });
  }, [updatePhase]);

  // Complete a phase
  const completePhase = useCallback((phaseId: string) => {
    updatePhase(phaseId, { 
      status: 'done', 
      progress: 100,
      endTime: new Date() 
    });
  }, [updatePhase]);

  // Set phase error
  const setPhaseError = useCallback((phaseId: string, error?: string) => {
    updatePhase(phaseId, { 
      status: 'error',
      description: error || 'An error occurred during this phase'
    });
  }, [updatePhase]);

  // Update phase progress
  const updatePhaseProgress = useCallback((phaseId: string, progress: number) => {
    const clampedProgress = Math.max(0, Math.min(100, progress));
    console.log(`Updating phase ${phaseId} progress to ${clampedProgress}%`);
    updatePhase(phaseId, { progress: clampedProgress });
  }, [updatePhase]);

  // Reset all phases
  const resetAllPhases = useCallback(() => {
    setPhases(prev => prev.map(phase => ({
      ...phase,
      progress: 0,
      status: 'pending' as PhaseStatus,
      startTime: undefined,
      endTime: undefined
    })));
  }, []);

  // Get current active phase
  const getCurrentPhase = useCallback(() => {
    const runningPhase = phases.find(phase => phase.status === 'running');
    if (runningPhase) return runningPhase;
    
    const lastCompletedIndex = phases.map(p => p.status === 'done').lastIndexOf(true);
    if (lastCompletedIndex >= 0 && lastCompletedIndex < phases.length - 1) {
      return phases[lastCompletedIndex + 1];
    }
    
    return phases.find(phase => phase.status === 'pending') || phases[0];
  }, [phases]);

  // Calculate overall progress
  const getOverallProgress = useCallback(() => {
    if (phases.length === 0) return 0;
    const totalProgress = phases.reduce((sum, phase) => sum + phase.progress, 0);
    return Math.round(totalProgress / phases.length);
  }, [phases]);

  return {
    phases,
    updatePhase,
    startPhase,
    completePhase,
    setPhaseError,
    updatePhaseProgress,
    resetAllPhases,
    getCurrentPhase,
    getOverallProgress
  };
};
