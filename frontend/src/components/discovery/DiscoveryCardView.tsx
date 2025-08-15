import React, { useState } from 'react';
import type { DiscoveryNode, DiscoveryGraph } from '../../lib/discovery';

interface DiscoveryCardViewProps {
  graph: DiscoveryGraph;
  selectedNode: DiscoveryNode | null;
  onNodeSelect: (node: DiscoveryNode) => void;
}

export function DiscoveryCardView({ graph, selectedNode, onNodeSelect }: DiscoveryCardViewProps) {
  const [selectedLevel, setSelectedLevel] = useState<number | 'all'>('all');

  // Group nodes by level
  const nodesByLevel = graph.nodes.reduce((acc, node) => {
    if (!acc[node.level]) acc[node.level] = [];
    acc[node.level].push(node);
    return acc;
  }, {} as Record<number, DiscoveryNode[]>);

  const levels = Object.keys(nodesByLevel).map(Number).sort((a, b) => a - b);

  const getFilteredNodes = () => {
    if (selectedLevel === 'all') {
      return graph.nodes;
    }
    return nodesByLevel[selectedLevel] || [];
  };

  const getNodeIcon = (node: DiscoveryNode) => {
    switch (node.type) {
      case 'niche':
        return '🎯';
      case 'sub-niche':
        return '🔍';
      case 'topic':
        return '💡';
      default:
        return '📌';
    }
  };

  const getNodeTypeLabel = (node: DiscoveryNode) => {
    switch (node.type) {
      case 'niche':
        return 'Main Niche';
      case 'sub-niche':
        return 'Sub-Niche';
      case 'topic':
        return 'Topic';
      default:
        return 'Item';
    }
  };

  const getNodeCardStyle = (node: DiscoveryNode) => {
    const isSelected = selectedNode?.id === node.id;
    const baseClasses = "p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:shadow-lg";
    
    let typeClasses = "";
    switch (node.type) {
      case 'niche':
        typeClasses = isSelected 
          ? "bg-blue-100 border-blue-400 shadow-lg" 
          : "bg-blue-50 border-blue-200 hover:border-blue-300";
        break;
      case 'sub-niche':
        typeClasses = isSelected 
          ? "bg-green-100 border-green-400 shadow-lg" 
          : "bg-green-50 border-green-200 hover:border-green-300";
        break;
      case 'topic':
        typeClasses = isSelected 
          ? "bg-purple-100 border-purple-400 shadow-lg" 
          : "bg-purple-50 border-purple-200 hover:border-purple-300";
        break;
      default:
        typeClasses = isSelected 
          ? "bg-gray-100 border-gray-400 shadow-lg" 
          : "bg-gray-50 border-gray-200 hover:border-gray-300";
    }
    
    return `${baseClasses} ${typeClasses}`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600 bg-green-100";
    if (confidence >= 0.6) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const filteredNodes = getFilteredNodes().sort((a, b) => b.confidence - a.confidence);

  if (graph.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-4">🔍</div>
          <div>No discovery data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header with filters */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Sub-Niche Discovery</h3>
            <p className="text-sm text-gray-600 mt-1">
              {graph.nodes.length} niches discovered • Showing {filteredNodes.length} items
            </p>
          </div>
        </div>

        {/* Level filter tabs */}
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedLevel('all')}
            className={`px-3 py-2 text-sm rounded-lg whitespace-nowrap transition-colors ${
              selectedLevel === 'all'
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Levels ({graph.nodes.length})
          </button>
          {levels.map(level => (
            <button
              key={level}
              onClick={() => setSelectedLevel(level)}
              className={`px-3 py-2 text-sm rounded-lg whitespace-nowrap transition-colors ${
                selectedLevel === level
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Level {level} ({nodesByLevel[level]?.length || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Cards grid */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
          {filteredNodes.map(node => (
            <div
              key={node.id}
              className={getNodeCardStyle(node)}
              onClick={() => onNodeSelect(node)}
            >
              {/* Card header */}
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl flex-shrink-0">{getNodeIcon(node)}</span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 text-sm leading-tight mb-1">
                    {node.label}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="bg-gray-100 px-2 py-1 rounded">
                      {getNodeTypeLabel(node)}
                    </span>
                    <span>Level {node.level}</span>
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Confidence</span>
                  <span className={`text-xs px-2 py-1 rounded ${getConfidenceColor(node.confidence)}`}>
                    {(node.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                
                {node.popularity && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Popularity</span>
                    <span className="text-xs text-gray-900 font-medium">
                      {node.popularity.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Reasoning/Description */}
              {node.data?.reasoning && (
                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded italic">
                  {node.data.reasoning}
                </div>
              )}

              {/* Source info */}
              {node.data?.original_subreddit && (
                <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                  <span>📍</span>
                  <span>r/{node.data.original_subreddit}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredNodes.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <div className="text-2xl mb-2">🔍</div>
            <div>No items found for the selected level</div>
          </div>
        )}
      </div>
    </div>
  );
}
