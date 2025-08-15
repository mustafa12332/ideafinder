import React from 'react';
import { ProgressTooltipProps } from './types';

/**
 * Tooltip component that shows phase details on hover
 */
export const ProgressTooltip: React.FC<ProgressTooltipProps> = ({
  phase,
  isVisible,
  position
}) => {
  if (!isVisible) return null;

  const getStatusIcon = () => {
    switch (phase.status) {
      case 'done':
        return '✅';
      case 'running':
        return '🔄';
      case 'error':
        return '❌';
      case 'pending':
      default:
        return '⏳';
    }
  };

  const formatDuration = () => {
    if (phase.startTime && phase.endTime) {
      const duration = (phase.endTime.getTime() - phase.startTime.getTime()) / 1000 / 60;
      return `${Math.round(duration)}m`;
    }
    if (phase.estimatedDuration) {
      return `~${phase.estimatedDuration}m`;
    }
    return null;
  };

  return (
    <div
      className="absolute z-50 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full"
      style={{
        left: position.x,
        top: position.y - 8, // 8px gap above cursor
      }}
    >
      {/* Arrow pointing down */}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2">
        <div className="border-4 border-transparent border-t-gray-900"></div>
      </div>
      
      <div className="flex items-center space-x-2">
        <span>{getStatusIcon()}</span>
        <span className="font-semibold">{phase.label}</span>
      </div>
      
      <div className="mt-1 space-y-1">
        <div className="flex justify-between items-center space-x-3">
          <span>Progress:</span>
          <span className="font-mono">{phase.progress.toFixed(0)}%</span>
        </div>
        
        {formatDuration() && (
          <div className="flex justify-between items-center space-x-3">
            <span>Duration:</span>
            <span className="font-mono text-xs">{formatDuration()}</span>
          </div>
        )}
        
        {phase.description && (
          <div className="mt-2 text-xs text-gray-300 max-w-xs">
            {phase.description}
          </div>
        )}
      </div>
    </div>
  );
};
