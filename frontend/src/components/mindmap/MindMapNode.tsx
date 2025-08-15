import React from 'react';
import type { DiscoveryNode } from '../../lib/discovery';

interface MindMapNodeProps {
  node: DiscoveryNode;
  x: number;
  y: number;
  isSelected: boolean;
  onClick: (node: DiscoveryNode) => void;
  onHover: (node: DiscoveryNode | null) => void;
}

export function MindMapNode({ 
  node, 
  x, 
  y, 
  isSelected, 
  onClick, 
  onHover 
}: MindMapNodeProps) {
  const getNodeStyle = () => {
    const baseClasses = "absolute cursor-pointer transition-all duration-200 rounded-lg border-2 flex items-center justify-center text-center p-3 shadow-lg mx-2";
    
    switch (node.type) {
      case 'niche':
        return `${baseClasses} bg-blue-500 text-white border-blue-600 min-w-36 h-16 font-bold text-lg max-w-48`;
      case 'sub-niche':
        return `${baseClasses} bg-green-400 text-white border-green-500 min-w-32 h-12 font-semibold max-w-44`;
      case 'topic':
        return `${baseClasses} bg-purple-300 text-gray-800 border-purple-400 min-w-28 h-10 text-sm max-w-40`;
      default:
        return `${baseClasses} bg-gray-300 text-gray-800 border-gray-400 min-w-28 h-10 max-w-40`;
    }
  };

  const getSelectedStyle = () => {
    return isSelected ? "ring-4 ring-yellow-400 ring-opacity-75 scale-110" : "hover:scale-105";
  };

  return (
    <div
      className={`${getNodeStyle()} ${getSelectedStyle()}`}
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
      }}
      onClick={() => onClick(node)}
      onMouseEnter={() => onHover(node)}
      onMouseLeave={() => onHover(null)}
    >
      <span className="break-words max-w-full">
        {node.label}
      </span>
    </div>
  );
}
