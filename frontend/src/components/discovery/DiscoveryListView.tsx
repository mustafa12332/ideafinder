import React, { useState } from 'react';
import type { DiscoveryNode, DiscoveryGraph } from '../../lib/discovery';

interface DiscoveryListViewProps {
  graph: DiscoveryGraph;
  selectedNode: DiscoveryNode | null;
  onNodeSelect: (node: DiscoveryNode) => void;
}

type SortOption = 'confidence' | 'level' | 'popularity' | 'name';

export function DiscoveryListView({ graph, selectedNode, onNodeSelect }: DiscoveryListViewProps) {
  const [sortBy, setSortBy] = useState<SortOption>('confidence');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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

  const getNodeTypeColor = (node: DiscoveryNode) => {
    switch (node.type) {
      case 'niche':
        return 'text-blue-700 bg-blue-100';
      case 'sub-niche':
        return 'text-green-700 bg-green-100';
      case 'topic':
        return 'text-purple-700 bg-purple-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-700 bg-green-100";
    if (confidence >= 0.6) return "text-yellow-700 bg-yellow-100";
    return "text-red-700 bg-red-100";
  };

  const sortNodes = (nodes: DiscoveryNode[]): DiscoveryNode[] => {
    return [...nodes].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'confidence':
          comparison = a.confidence - b.confidence;
          break;
        case 'level':
          comparison = a.level - b.level;
          break;
        case 'popularity':
          comparison = (a.popularity || 0) - (b.popularity || 0);
          break;
        case 'name':
          comparison = a.label.localeCompare(b.label);
          break;
      }
      
      return sortDirection === 'desc' ? -comparison : comparison;
    });
  };

  const handleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(option);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (option: SortOption) => {
    if (sortBy !== option) return '↕️';
    return sortDirection === 'desc' ? '↓' : '↑';
  };

  const sortedNodes = sortNodes(graph.nodes);

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
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Sub-Niche Discovery</h3>
            <p className="text-sm text-gray-600 mt-1">
              {graph.nodes.length} niches discovered across {Math.max(...graph.nodes.map(n => n.level)) + 1} levels
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Table header */}
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left p-3 text-sm font-medium text-gray-700">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 hover:text-gray-900"
                >
                  Niche/Topic {getSortIcon('name')}
                </button>
              </th>
              <th className="text-left p-3 text-sm font-medium text-gray-700">
                Type
              </th>
              <th className="text-left p-3 text-sm font-medium text-gray-700">
                <button
                  onClick={() => handleSort('level')}
                  className="flex items-center gap-1 hover:text-gray-900"
                >
                  Level {getSortIcon('level')}
                </button>
              </th>
              <th className="text-left p-3 text-sm font-medium text-gray-700">
                <button
                  onClick={() => handleSort('confidence')}
                  className="flex items-center gap-1 hover:text-gray-900"
                >
                  Confidence {getSortIcon('confidence')}
                </button>
              </th>
              <th className="text-left p-3 text-sm font-medium text-gray-700">
                <button
                  onClick={() => handleSort('popularity')}
                  className="flex items-center gap-1 hover:text-gray-900"
                >
                  Popularity {getSortIcon('popularity')}
                </button>
              </th>
              <th className="text-left p-3 text-sm font-medium text-gray-700">
                Source
              </th>
            </tr>
          </thead>

          {/* Table body */}
          <tbody className="divide-y divide-gray-200">
            {sortedNodes.map(node => (
              <tr
                key={node.id}
                onClick={() => onNodeSelect(node)}
                className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                  selectedNode?.id === node.id ? 'bg-blue-50' : ''
                }`}
              >
                {/* Name */}
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{getNodeIcon(node)}</span>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {node.label}
                      </div>
                      {node.data?.reasoning && (
                        <div className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                          {node.data.reasoning}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Type */}
                <td className="p-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${getNodeTypeColor(node)}`}>
                    {node.type.replace('-', ' ')}
                  </span>
                </td>

                {/* Level */}
                <td className="p-3">
                  <span className="text-sm text-gray-600">
                    Level {node.level}
                  </span>
                </td>

                {/* Confidence */}
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          node.confidence >= 0.8 ? 'bg-green-500' :
                          node.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${node.confidence * 100}%` }}
                      />
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${getConfidenceColor(node.confidence)}`}>
                      {(node.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </td>

                {/* Popularity */}
                <td className="p-3">
                  <span className="text-sm text-gray-900">
                    {node.popularity ? node.popularity.toLocaleString() : '-'}
                  </span>
                </td>

                {/* Source */}
                <td className="p-3">
                  <div className="text-xs text-gray-500">
                    {node.data?.original_subreddit && (
                      <div className="flex items-center gap-1">
                        <span>📍</span>
                        <span>r/{node.data.original_subreddit}</span>
                      </div>
                    )}
                    {node.source && !node.data?.original_subreddit && (
                      <span>{node.source}</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div>Click on any row to view details</div>
          <div>Click column headers to sort</div>
        </div>
      </div>
    </div>
  );
}
