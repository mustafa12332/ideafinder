import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { MindMapNode } from './MindMapNode';
import { MindMapEdge } from './MindMapEdge';
import type { DiscoveryGraph, DiscoveryNode } from '../../lib/discovery';

interface NodePosition {
  id: string;
  x: number;
  y: number;
  node: DiscoveryNode;
}

interface MindMapProps {
  graph: DiscoveryGraph;
  width?: number;
  height?: number;
  onNodeClick?: (node: DiscoveryNode) => void;
}

export function MindMap({ 
  graph, 
  width = 800, 
  height = 600, 
  onNodeClick 
}: MindMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodePositions, setNodePositions] = useState<NodePosition[]>([]);
  const [selectedNode, setSelectedNode] = useState<DiscoveryNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<DiscoveryNode | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });

  // Calculate positions using family tree layout
  const calculatePositions = useCallback(() => {
    if (!graph.nodes.length) return;

    const positions: NodePosition[] = [];
    
    // Group nodes by level
    const nodesByLevel = graph.nodes.reduce((acc, node) => {
      if (!acc[node.level]) acc[node.level] = [];
      acc[node.level].push(node);
      return acc;
    }, {} as Record<number, DiscoveryNode[]>);

    const levels = Object.keys(nodesByLevel).map(Number).sort((a, b) => a - b);
    const maxLevel = Math.max(...levels);
    
    // Layout parameters for family tree with better spacing
    const topMargin = 80;
    const levelHeight = Math.min(150, (height - topMargin * 2) / (maxLevel + 1));
    const nodeWidth = 200; // Increased spacing between nodes
    
    levels.forEach((level) => {
      const nodesInLevel = nodesByLevel[level];
      const nodeCount = nodesInLevel.length;
      
      // Calculate Y position for this level
      const y = topMargin + level * levelHeight;
      
      // Calculate total width needed for all nodes at this level with minimum spacing
      const minSpacing = Math.max(nodeWidth, width / Math.max(nodeCount, 8)); // Ensure minimum spacing
      const totalWidth = nodeCount * minSpacing;
      const startX = (width - totalWidth) / 2 + minSpacing / 2;
      
      nodesInLevel.forEach((node, index) => {
        // Distribute nodes evenly across the width with proper spacing
        const x = startX + index * minSpacing;
        
        positions.push({
          id: node.id,
          x,
          y,
          node,
        });
      });
    });

    setNodePositions(positions);
  }, [graph.nodes, width, height]);

  useEffect(() => {
    calculatePositions();
  }, [calculatePositions]);

  // Setup zoom and pan behavior
  useEffect(() => {
    if (!containerRef.current) return;

    const container = d3.select(containerRef.current);
    
    const zoom = d3.zoom<HTMLDivElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        setTransform(event.transform);
      });

    container.call(zoom);

    return () => {
      container.on('.zoom', null);
    };
  }, []);

  const handleNodeClick = (node: DiscoveryNode) => {
    setSelectedNode(selectedNode?.id === node.id ? null : node);
    onNodeClick?.(node);
  };

  const handleNodeHover = (node: DiscoveryNode | null) => {
    setHoveredNode(node);
  };

  // Get edges connected to hovered/selected node
  const getHighlightedEdges = () => {
    const targetNode = hoveredNode || selectedNode;
    if (!targetNode) return new Set();
    
    return new Set(
      graph.edges
        .filter(edge => edge.source === targetNode.id || edge.target === targetNode.id)
        .map(edge => edge.id)
    );
  };

  const highlightedEdges = getHighlightedEdges();

  // Get position for a node by ID
  const getNodePosition = (nodeId: string) => {
    const position = nodePositions.find(pos => pos.id === nodeId);
    return position ? { x: position.x, y: position.y } : { x: 0, y: 0 };
  };

  const resetView = () => {
    if (!containerRef.current) return;
    
    const container = d3.select(containerRef.current);
    container.transition()
      .duration(750)
      .call(
        d3.zoom<HTMLDivElement, unknown>().transform,
        d3.zoomIdentity
      );
  };

  return (
    <div className="relative bg-gray-50 border-2 border-gray-200 rounded-lg overflow-hidden">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={resetView}
          className="px-3 py-1 bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 text-sm"
        >
          Reset View
        </button>
        <button
          onClick={calculatePositions}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          Reorganize Layout
        </button>
      </div>

      {/* Legend */}
      <div className="absolute top-4 left-4 z-10 bg-white p-3 rounded-lg shadow-lg border text-sm max-w-xs">
        <div className="mb-3">
          <h3 className="font-semibold mb-2">Hierarchy Levels</h3>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded border"></div>
              <span>Niche (Top Level)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-400 rounded border"></div>
              <span>Sub-niche</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-300 rounded border"></div>
              <span>Sub-sub-niche</span>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="font-semibold mb-2">Family Tree</h3>
          <div className="space-y-1 text-xs text-gray-600">
            <p>• Nodes arranged top to bottom</p>
            <p>• Each level shows sub-categories</p>
            <p>• Stepped lines show hierarchy</p>
          </div>
        </div>
      </div>

      {/* Main container */}
      <div
        ref={containerRef}
        className="relative cursor-move"
        style={{ width, height }}
      >
        {/* SVG for edges */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={width}
          height={height}
        >
          {/* Arrow marker definitions */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#374151"
              />
            </marker>
          </defs>
          
          <g style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
          }}>
            {graph.edges.map((edge, index) => {
              const sourcePos = getNodePosition(edge.source);
              const targetPos = getNodePosition(edge.target);
              
              // Debug logging for first few edges
              if (index < 2) {
                console.log(`Edge ${edge.id}: source(${sourcePos.x}, ${sourcePos.y}) -> target(${targetPos.x}, ${targetPos.y})`);
              }
              
              // Get source and target nodes to determine their heights
              const sourceNode = graph.nodes.find(n => n.id === edge.source);
              const targetNode = graph.nodes.find(n => n.id === edge.target);
              
              // Calculate node heights based on type (these match the CSS heights)
              const getNodeHeight = (node?: DiscoveryNode) => {
                if (!node) return 40;
                switch (node.type) {
                  case 'niche': return 64;   // h-16
                  case 'sub-niche': return 48; // h-12
                  case 'topic': return 40;   // h-10
                  default: return 40;
                }
              };
              
              const sourceHeight = getNodeHeight(sourceNode);
              const targetHeight = getNodeHeight(targetNode);
              
              // Since nodes use translate(-50%, -50%), they're centered at x,y
              // Connect from bottom center of source to top center of target
              const sourceX = sourcePos.x;
              const sourceY = sourcePos.y + sourceHeight / 2;
              const targetX = targetPos.x;
              const targetY = targetPos.y - targetHeight / 2;
              
              return (
                <MindMapEdge
                  key={edge.id}
                  edge={edge}
                  sourceX={sourceX}
                  sourceY={sourceY}
                  targetX={targetX}
                  targetY={targetY}
                  isHighlighted={highlightedEdges.has(edge.id)}
                />
              );
            })}
          </g>
        </svg>

        {/* Container for nodes */}
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
          }}
        >
          {nodePositions.map(({ id, x, y, node }) => (
            <MindMapNode
              key={id}
              node={node}
              x={x}
              y={y}
              isSelected={selectedNode?.id === id}
              onClick={handleNodeClick}
              onHover={handleNodeHover}
            />
          ))}
        </div>
      </div>

      {/* Node details panel */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 bg-white p-4 rounded-lg shadow-lg border max-w-sm">
          <h3 className="font-semibold text-lg mb-2">{selectedNode.label}</h3>
          <div className="space-y-1 text-sm text-gray-600">
            <p><strong>Type:</strong> {selectedNode.type}</p>
            <p><strong>Level:</strong> {selectedNode.level}</p>
            <p><strong>ID:</strong> {selectedNode.id}</p>
            {selectedNode.metadata && (
              <div>
                <strong>Metadata:</strong>
                <pre className="mt-1 text-xs bg-gray-100 p-2 rounded">
                  {JSON.stringify(selectedNode.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 right-4 bg-white p-3 rounded-lg shadow-lg border text-xs text-gray-600 max-w-xs">
        <p><strong>Family Tree View:</strong></p>
        <p>• Top-down hierarchy structure</p>
        <p>• Click nodes to select and view details</p>
        <p>• Drag to pan, scroll to zoom</p>
        <p>• Hover to highlight parent-child links</p>
      </div>
    </div>
  );
}
