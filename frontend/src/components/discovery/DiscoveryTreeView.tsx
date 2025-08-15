import React, { useState } from 'react';
import type { DiscoveryNode, DiscoveryGraph } from '../../lib/discovery';

interface DiscoveryTreeViewProps {
  graph: DiscoveryGraph;
  selectedNode: DiscoveryNode | null;
  onNodeSelect: (node: DiscoveryNode) => void;
}

interface TreeNode {
  node: DiscoveryNode;
  children: TreeNode[];
  isExpanded: boolean;
}

export function DiscoveryTreeView({ graph, selectedNode, onNodeSelect }: DiscoveryTreeViewProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Build tree structure from graph
  const buildTree = (): TreeNode[] => {
    const nodeMap = new Map<string, TreeNode>();
    
    // Initialize all nodes
    graph.nodes.forEach(node => {
      nodeMap.set(node.id, {
        node,
        children: [],
        isExpanded: expandedNodes.has(node.id) || node.level === 0
      });
    });

    // Build parent-child relationships
    graph.edges.forEach(edge => {
      const parent = nodeMap.get(edge.source);
      const child = nodeMap.get(edge.target);
      if (parent && child) {
        parent.children.push(child);
      }
    });

    // Return root nodes (level 0)
    return Array.from(nodeMap.values()).filter(treeNode => treeNode.node.level === 0);
  };

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
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

  const getNodeStyle = (node: DiscoveryNode) => {
    const baseClasses = "flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 cursor-pointer";
    const isSelected = selectedNode?.id === node.id;
    
    let typeClasses = "";
    switch (node.type) {
      case 'niche':
        typeClasses = isSelected 
          ? "bg-blue-100 border-blue-300 text-blue-900" 
          : "bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100";
        break;
      case 'sub-niche':
        typeClasses = isSelected 
          ? "bg-green-100 border-green-300 text-green-900" 
          : "bg-green-50 border-green-200 text-green-800 hover:bg-green-100";
        break;
      case 'topic':
        typeClasses = isSelected 
          ? "bg-purple-100 border-purple-300 text-purple-900" 
          : "bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100";
        break;
      default:
        typeClasses = isSelected 
          ? "bg-gray-100 border-gray-300 text-gray-900" 
          : "bg-gray-50 border-gray-200 text-gray-800 hover:bg-gray-100";
    }
    
    return `${baseClasses} ${typeClasses}`;
  };

  const renderTreeNode = (treeNode: TreeNode, depth: number = 0): React.ReactNode => {
    const { node, children, isExpanded } = treeNode;
    const hasChildren = children.length > 0;
    const paddingLeft = depth * 24;

    return (
      <div key={node.id} className="w-full">
        {/* Node content */}
        <div 
          className={getNodeStyle(node)}
          style={{ marginLeft: `${paddingLeft}px` }}
          onClick={() => onNodeSelect(node)}
        >
          {/* Expand/collapse button */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
              className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-black hover:bg-opacity-10"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          {!hasChildren && <div className="w-6" />}
          
          {/* Node icon */}
          <span className="text-lg flex-shrink-0">{getNodeIcon(node)}</span>
          
          {/* Node content */}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm mb-1">{node.label}</div>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span>Level {node.level}</span>
              <span>Confidence: {(node.confidence * 100).toFixed(0)}%</span>
              {node.popularity && (
                <span>Popularity: {node.popularity.toLocaleString()}</span>
              )}
            </div>
            {node.data?.reasoning && (
              <div className="text-xs text-gray-500 mt-1 italic">
                {node.data.reasoning}
              </div>
            )}
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="mt-2 space-y-2">
            {children
              .sort((a, b) => b.node.confidence - a.node.confidence) // Sort by confidence
              .map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const treeData = buildTree();

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
          <div className="flex gap-2">
            <button
              onClick={() => setExpandedNodes(new Set(graph.nodes.map(n => n.id)))}
              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Expand All
            </button>
            <button
              onClick={() => setExpandedNodes(new Set())}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* Tree content */}
      <div className="p-4 max-h-96 overflow-y-auto">
        <div className="space-y-3">
          {treeData.map(treeNode => renderTreeNode(treeNode))}
        </div>
      </div>

      {/* Legend */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="flex items-center gap-6 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <span>🎯</span>
            <span>Main Niche</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🔍</span>
            <span>Sub-Niche</span>
          </div>
          <div className="flex items-center gap-1">
            <span>💡</span>
            <span>Topic/Opportunity</span>
          </div>
          <div className="flex items-center gap-1">
            <span>▶/▼</span>
            <span>Click to expand/collapse</span>
          </div>
        </div>
      </div>
    </div>
  );
}
