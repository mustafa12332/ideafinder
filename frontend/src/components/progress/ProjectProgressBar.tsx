import React, { useState, useCallback, useMemo } from 'react';
import { ProjectProgressBarProps, ProjectPhase, PhaseColors } from './types';
import { ProgressTooltip } from './ProgressTooltip';

/**
 * Global project progress bar that shows completion across all workflow phases
 */
export const ProjectProgressBar: React.FC<ProjectProgressBarProps> = ({
  phases,
  className = '',
  showMiniStepper = true,
  onPhaseClick
}) => {
  const [hoveredPhase, setHoveredPhase] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Phase color configuration
  const phaseColors: PhaseColors = {
    pending: 'bg-gray-300',
    running: {
      start: 'from-blue-400',
      end: 'to-blue-600'
    },
    done: 'bg-green-500',
    error: 'bg-red-500'
  };

  // Calculate overall progress as weighted average
  const overallProgress = useMemo(() => {
    if (phases.length === 0) return 0;
    const totalProgress = phases.reduce((sum, phase) => sum + phase.progress, 0);
    const result = Math.round(totalProgress / phases.length);
    console.log('Progress calculation:', { phases: phases.map(p => ({ id: p.id, progress: p.progress })), totalProgress, result });
    return result;
  }, [phases]);

  // Get current active phase
  const currentPhase = useMemo(() => {
    const runningPhase = phases.find(phase => phase.status === 'running');
    if (runningPhase) return runningPhase;
    
    const lastCompletedIndex = phases.map(p => p.status === 'done').lastIndexOf(true);
    if (lastCompletedIndex >= 0 && lastCompletedIndex < phases.length - 1) {
      return phases[lastCompletedIndex + 1];
    }
    
    return phases.find(phase => phase.status === 'pending') || phases[0];
  }, [phases]);

  // Handle mouse events for tooltip
  const handleMouseEnter = useCallback((phaseId: string, event: React.MouseEvent) => {
    setHoveredPhase(phaseId);
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredPhase(null);
  }, []);

  // Calculate segment widths (equal distribution)
  const segmentWidth = 100 / phases.length;

  const getSegmentClasses = (phase: ProjectPhase) => {
    const baseClasses = "absolute h-full transition-all duration-700 ease-out";
    
    switch (phase.status) {
      case 'done':
        return `${baseClasses} ${phaseColors.done}`;
      case 'running':
        return `${baseClasses} bg-gradient-to-r ${phaseColors.running.start} ${phaseColors.running.end}`;
      case 'error':
        return `${baseClasses} ${phaseColors.error} bg-opacity-90`;
      case 'pending':
      default:
        return `${baseClasses} ${phaseColors.pending}`;
    }
  };

  const getStatusBadge = (phase: ProjectPhase) => {
    const badgeClasses = "inline-flex items-center justify-center w-5 h-5 text-xs rounded-full";
    
    switch (phase.status) {
      case 'done':
        return <span className={`${badgeClasses} bg-green-100 text-green-800`}>✓</span>;
      case 'running':
        return <span className={`${badgeClasses} bg-blue-100 text-blue-800 animate-pulse`}>●</span>;
      case 'error':
        return <span className={`${badgeClasses} bg-red-100 text-red-800`}>!</span>;
      case 'pending':
      default:
        return <span className={`${badgeClasses} bg-gray-100 text-gray-500`}>○</span>;
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Main Progress Bar */}
      <div className="relative">
        {/* Progress Bar Container */}
        <div className="relative h-6 w-full rounded-full bg-gray-200 dark:bg-gray-800 shadow-inner overflow-hidden">
          {phases.map((phase, index) => {
            const leftOffset = index * segmentWidth;
            const actualWidth = (phase.progress / 100) * segmentWidth;
            
            return (
              <div
                key={phase.id}
                className={getSegmentClasses(phase)}
                style={{
                  left: `${leftOffset}%`,
                  width: `${actualWidth}%`,
                }}
                onMouseEnter={(e) => handleMouseEnter(phase.id, e)}
                onMouseLeave={handleMouseLeave}
                onClick={() => onPhaseClick?.(phase.id)}
              />
            );
          })}

          {/* Phase Boundaries */}
          {phases.slice(0, -1).map((_, index) => (
            <div
              key={`boundary-${index}`}
              className="absolute top-0 bottom-0 w-px bg-white bg-opacity-30"
              style={{ left: `${(index + 1) * segmentWidth}%` }}
            />
          ))}
        </div>

        {/* Progress Text Overlay */}
        <div className="absolute inset-0 flex items-center justify-between px-3 text-sm font-medium">
          <span className="text-gray-700 dark:text-gray-300">
            {overallProgress}%
          </span>
          <span className="text-gray-600 dark:text-gray-400 text-xs">
            {currentPhase?.label || 'Ready'}
          </span>
        </div>
      </div>

      {/* Mini Stepper */}
      {showMiniStepper && (
        <div className="flex justify-between text-xs text-gray-500 mt-2 px-1">
          {phases.map((phase) => (
            <div
              key={phase.id}
              className={`flex flex-col items-center space-y-1 cursor-pointer transition-colors duration-200 ${
                phase.status === 'running' ? 'text-blue-600 dark:text-blue-400' : ''
              } ${
                onPhaseClick ? 'hover:text-gray-700 dark:hover:text-gray-300' : ''
              }`}
              onClick={() => onPhaseClick?.(phase.id)}
              style={{ width: `${segmentWidth}%` }}
            >
              {getStatusBadge(phase)}
              <span className="text-center leading-tight max-w-full truncate">
                {phase.label}
              </span>
              {phase.status === 'running' && (
                <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
                  {phase.progress}%
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tooltip */}
      {hoveredPhase && (
        <ProgressTooltip
          phase={phases.find(p => p.id === hoveredPhase)!}
          isVisible={!!hoveredPhase}
          position={tooltipPosition}
        />
      )}
    </div>
  );
};
