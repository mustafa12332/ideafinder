import React from 'react';
import type { DiscoveryEdge } from '../../lib/discovery';

interface MindMapEdgeProps {
  edge: DiscoveryEdge;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  isHighlighted: boolean;
}

export function MindMapEdge({
  edge,
  sourceX,
  sourceY,
  targetX,
  targetY,
  isHighlighted,
}: MindMapEdgeProps) {
  const getEdgeStyle = () => {
    switch (edge.relationship) {
      case 'contains':
        return {
          stroke: '#374151', // gray-700
          strokeWidth: isHighlighted ? 3 : 2,
          strokeDasharray: 'none',
        };
      case 'related-to':
        return {
          stroke: '#059669', // emerald-600
          strokeWidth: isHighlighted ? 3 : 2,
          strokeDasharray: '5,5',
        };
      case 'derived-from':
        return {
          stroke: '#7C3AED', // violet-600
          strokeWidth: isHighlighted ? 3 : 2,
          strokeDasharray: '10,2',
        };
      default:
        return {
          stroke: '#6B7280', // gray-500
          strokeWidth: isHighlighted ? 3 : 1,
          strokeDasharray: 'none',
        };
    }
  };

  const style = getEdgeStyle();

  // Create family tree style connections (stepped lines)
  const midY = sourceY + (targetY - sourceY) * 0.5;
  
  // Create a stepped path: down from source, across, then down to target
  const pathData = `M ${sourceX} ${sourceY} L ${sourceX} ${midY} L ${targetX} ${midY} L ${targetX} ${targetY}`;

  return (
    <path
      d={pathData}
      fill="none"
      stroke={style.stroke}
      strokeWidth={style.strokeWidth}
      strokeDasharray={style.strokeDasharray}
      className={`transition-all duration-200 ${isHighlighted ? 'opacity-100' : 'opacity-70'}`}
      markerEnd="url(#arrowhead)"
    />
  );
}
