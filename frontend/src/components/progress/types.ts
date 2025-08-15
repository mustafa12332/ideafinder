/**
 * Types for the global project progress bar system
 */

export type PhaseStatus = 'pending' | 'running' | 'done' | 'error';

export interface ProjectPhase {
  id: string;                        // 'discovery', 'trends', 'problems', 'ideas'
  label: string;                     // Display label
  progress: number;                  // 0-100 for that phase
  status: PhaseStatus;
  description?: string;              // Optional detailed description
  estimatedDuration?: number;        // Optional estimated time in minutes
  startTime?: Date;                  // When phase started
  endTime?: Date;                    // When phase completed
}

export interface ProjectProgressBarProps {
  phases: ProjectPhase[];
  className?: string;
  showMiniStepper?: boolean;
  onPhaseClick?: (phaseId: string) => void;
}

export interface PhaseColors {
  pending: string;
  running: {
    start: string;
    end: string;
  };
  done: string;
  error: string;
}

export interface ProgressTooltipProps {
  phase: ProjectPhase;
  isVisible: boolean;
  position: { x: number; y: number };
}
