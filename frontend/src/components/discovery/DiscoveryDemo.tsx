import { useState } from 'react';
import { useDiscovery } from '../../hooks/useDiscovery';
import { MindMap } from '../mindmap';
import { DiscoveryTreeView } from './DiscoveryTreeView';
import { DiscoveryCardView } from './DiscoveryCardView';
import { DiscoveryListView } from './DiscoveryListView';
import type { DiscoveryConfig, DiscoveryNode } from '../../lib/discovery';

interface DiscoveryDemoProps {
  discoveryHook?: ReturnType<typeof useDiscovery> & { progress?: any };
}

export function DiscoveryDemo({ discoveryHook }: DiscoveryDemoProps = {}) {
  const defaultDiscovery = useDiscovery();
  const discovery = discoveryHook || defaultDiscovery;
  const [configForm, setConfigForm] = useState<DiscoveryConfig>({
    niche: 'AI-powered productivity tools',
    maxLevels: 3,
    maxNodesPerLevel: 10,
    sources: ['reddit', 'twitter', 'github'],
  });
  const [selectedNode, setSelectedNode] = useState<DiscoveryNode | null>(null);
  const [viewMode, setViewMode] = useState<'config' | 'tree' | 'cards' | 'list' | 'mindmap'>('config');

  const handleConfigure = () => {
    discovery.actions.configure(configForm);
  };

  const handleRestoreSnapshot = (snapshotIndex: number) => {
    const snapshot = discovery.snapshots[snapshotIndex];
    if (snapshot) {
      discovery.actions.restoreSnapshot(snapshot);
    }
  };

  const handleNodeClick = (node: DiscoveryNode) => {
    setSelectedNode(node);
  };

  const showMindMap = discovery.totalNodes > 0;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Sub-Niche Discovery</h2>
          
          {/* View Mode Toggle */}
          {showMindMap && (
            <div className="flex bg-gray-200 rounded-lg p-1 overflow-x-auto">
              <button
                onClick={() => setViewMode('config')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  viewMode === 'config'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                ⚙️ Config
              </button>
              <button
                onClick={() => setViewMode('tree')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  viewMode === 'tree'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🌳 Tree
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  viewMode === 'cards'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🃏 Cards
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📋 Table
              </button>
              <button
                onClick={() => setViewMode('mindmap')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  viewMode === 'mindmap'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🧠 Mind Map
              </button>
            </div>
          )}
        </div>
        
        {/* State Display */}
        <div className="mb-4 p-3 bg-gray-100 rounded">
          <div>
            <strong>Current State:</strong> {
              discovery.isIdle ? 'Idle' :
              discovery.isConfigured ? 'Configured' :
              discovery.isStarting ? 'Starting' :
              discovery.isDiscovering ? 'Discovering' :
              discovery.isComplete ? 'Complete' :
              discovery.isError ? 'Error' :
              'Unknown'
            }
          </div>
          {discovery.error && (
            <div className="text-red-600 mt-2">
              <strong>Error:</strong> {discovery.error}
            </div>
          )}
        </div>

        {/* Configuration View */}
        {viewMode === 'config' && (
          <>
            {/* Configuration Form */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Niche</label>
              <input
                type="text"
                value={configForm.niche}
                onChange={(e) => setConfigForm({ ...configForm, niche: e.target.value })}
                className="w-full p-2 border rounded"
                disabled={discovery.isDiscovering}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Levels</label>
              <input
                type="number"
                value={configForm.maxLevels}
                onChange={(e) => setConfigForm({ ...configForm, maxLevels: parseInt(e.target.value) })}
                className="w-full p-2 border rounded"
                min="1"
                max="5"
                disabled={discovery.isDiscovering}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Nodes Per Level</label>
              <input
                type="number"
                value={configForm.maxNodesPerLevel}
                onChange={(e) => setConfigForm({ ...configForm, maxNodesPerLevel: parseInt(e.target.value) })}
                className="w-full p-2 border rounded"
                min="1"
                max="50"
                disabled={discovery.isDiscovering}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sources</label>
              <select
                multiple
                value={configForm.sources}
                onChange={(e) => setConfigForm({ 
                  ...configForm, 
                  sources: Array.from(e.target.selectedOptions, option => option.value)
                })}
                className="w-full p-2 border rounded"
                disabled={discovery.isDiscovering}
              >
                <option value="reddit">Reddit</option>
                <option value="twitter">Twitter</option>
                <option value="github">GitHub</option>
                <option value="hackernews">Hacker News</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={handleConfigure}
            disabled={discovery.isDiscovering}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Configure
          </button>
          
          <button
            onClick={discovery.actions.start}
            disabled={!discovery.canStart}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            Start Discovery
          </button>
          
          <button
            onClick={discovery.actions.pause}
            disabled={!discovery.canPause}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
          >
            Pause
          </button>
          
          <button
            onClick={discovery.actions.resume}
            disabled={!discovery.canResume}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Resume
          </button>
          
          <button
            onClick={discovery.actions.cancel}
            disabled={!discovery.canCancel}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            Cancel
          </button>
          
          <button
            onClick={discovery.actions.snapshot}
            disabled={!discovery.canSnapshot}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            Create Snapshot
          </button>
        </div>

        {/* Progress Display */}
        {discovery.isDiscovering && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Discovery Progress</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>Current Level: <span className="font-semibold text-blue-600">{discovery.currentLevel}</span></div>
                <div>Total Nodes: <span className="font-semibold text-green-600">{discovery.totalNodes}</span></div>
                <div>Total Edges: <span className="font-semibold text-purple-600">{discovery.totalEdges}</span></div>
              </div>
              
              {/* Level-by-level progress */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700">Level Progress:</h4>
                {Object.entries(discovery.progress).map(([level, progress]) => {
                  const safeProgress = typeof progress === 'number' ? progress : 0;
                  const isCurrentLevel = parseInt(level) === discovery.currentLevel;
                  return (
                    <div key={level} className={`flex items-center gap-2 p-2 rounded ${isCurrentLevel ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                      <span className={`w-16 text-sm font-medium ${isCurrentLevel ? 'text-blue-700' : 'text-gray-600'}`}>
                        Level {level}:
                      </span>
                      <div className="flex-1 bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all duration-500 ${
                            isCurrentLevel ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-green-500'
                          }`}
                          style={{ width: `${safeProgress * 100}%` }}
                        />
                      </div>
                      <span className={`text-sm font-mono w-12 ${isCurrentLevel ? 'text-blue-700 font-semibold' : 'text-gray-600'}`}>
                        {Math.round(safeProgress * 100)}%
                      </span>
                      {isCurrentLevel && (
                        <span className="text-xs text-blue-500 animate-pulse">●</span>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Current sub-analysis progress */}
              {discovery.subAnalysis && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h5 className="font-medium text-blue-800 mb-2">Current Analysis:</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-blue-700">Analyzing:</span>
                      <span className="font-mono text-blue-900">{discovery.subAnalysis.currentItem || 'Processing...'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-blue-700">Step:</span>
                      <span className="font-semibold text-blue-800 capitalize">
                        {discovery.subAnalysis.currentStep === 'fetching' ? '📡 Fetching Data' :
                         discovery.subAnalysis.currentStep === 'llm_analysis' ? '🤖 LLM Analysis' :
                         discovery.subAnalysis.currentStep === 'processing' ? '⚙️ Processing' :
                         discovery.subAnalysis.currentStep || 'Working...'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-blue-700">Progress:</span>
                      <span className="font-mono text-blue-900">
                        {discovery.subAnalysis.completedItems}/{discovery.subAnalysis.totalItems} items
                        {discovery.subAnalysis.currentItemProgress && 
                          ` (${discovery.subAnalysis.currentItemProgress}%)`}
                      </span>
                    </div>
                    {discovery.subAnalysis.currentItemProgress !== undefined && (
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${discovery.subAnalysis.currentItemProgress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Overall calculation display */}
              <div className="mt-3 p-3 bg-gray-100 rounded-lg">
                <div className="text-sm text-gray-600">
                  Overall Progress Calculation: 
                  {Object.entries(discovery.progress).map(([level, progress], index) => {
                    const safeProgress = typeof progress === 'number' ? progress : 0;
                    const maxLevels = discovery.config?.maxLevels || 3;
                    const contribution = (safeProgress * 100) / maxLevels;
                    return (
                      <span key={level} className="ml-1">
                        L{level}({Math.round(safeProgress * 100)}%→{contribution.toFixed(1)}%)
                        {index < Object.keys(discovery.progress).length - 1 ? ' + ' : ''}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Graph Summary */}
        {discovery.totalNodes > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Discovery Results</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded">
                <div className="text-2xl font-bold text-blue-600">{discovery.totalNodes}</div>
                <div className="text-sm text-blue-800">Nodes</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded">
                <div className="text-2xl font-bold text-green-600">{discovery.totalEdges}</div>
                <div className="text-sm text-green-800">Edges</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded">
                <div className="text-2xl font-bold text-purple-600">{Object.keys(discovery.levelCounts).length}</div>
                <div className="text-sm text-purple-800">Levels</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded">
                <div className="text-2xl font-bold text-orange-600">{discovery.snapshots.length}</div>
                <div className="text-sm text-orange-800">Snapshots</div>
              </div>
            </div>
          </div>
        )}

            {/* Snapshots */}
            {discovery.hasSnapshots && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Snapshots</h3>
                <div className="space-y-2">
                  {discovery.snapshots.map((snapshot, index) => (
                    <div key={snapshot.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <div className="font-medium">{snapshot.config.niche}</div>
                        <div className="text-sm text-gray-600">
                          {new Date(snapshot.timestamp).toLocaleString()} - 
                          Level {snapshot.currentLevel}, {snapshot.graph.nodes.length} nodes
                        </div>
                      </div>
                      <button
                        onClick={() => handleRestoreSnapshot(index)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Tree View */}
        {viewMode === 'tree' && showMindMap && (
          <div className="mb-6">
            <DiscoveryTreeView
              graph={discovery.graph}
              selectedNode={selectedNode}
              onNodeSelect={setSelectedNode}
            />
          </div>
        )}

        {/* Card View */}
        {viewMode === 'cards' && showMindMap && (
          <div className="mb-6">
            <DiscoveryCardView
              graph={discovery.graph}
              selectedNode={selectedNode}
              onNodeSelect={setSelectedNode}
            />
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && showMindMap && (
          <div className="mb-6">
            <DiscoveryListView
              graph={discovery.graph}
              selectedNode={selectedNode}
              onNodeSelect={setSelectedNode}
            />
          </div>
        )}

        {/* Mind Map View */}
        {viewMode === 'mindmap' && showMindMap && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Discovery Mind Map</h3>
            <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
              <MindMap
                graph={discovery.graph}
                width={800}
                height={600}
                onNodeClick={handleNodeClick}
              />
            </div>
          </div>
        )}

        {/* Selected Node Details - Show for all views except config */}
        {viewMode !== 'config' && selectedNode && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-lg text-blue-900 mb-2">
              Selected: {selectedNode.label}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-800">Type:</span>
                <p className="text-blue-700">{selectedNode.type}</p>
              </div>
              <div>
                <span className="font-medium text-blue-800">Level:</span>
                <p className="text-blue-700">{selectedNode.level}</p>
              </div>
              <div>
                <span className="font-medium text-blue-800">Confidence:</span>
                <p className="text-blue-700">{(selectedNode.confidence * 100).toFixed(0)}%</p>
              </div>
              <div>
                <span className="font-medium text-blue-800">Connections:</span>
                <p className="text-blue-700">
                  {discovery.graph.edges.filter(
                    edge => edge.source === selectedNode.id || edge.target === selectedNode.id
                  ).length} edges
                </p>
              </div>
            </div>
            {selectedNode.data?.reasoning && (
              <div className="mt-3">
                <span className="font-medium text-blue-800">Reasoning:</span>
                <p className="text-blue-700 text-sm italic mt-1">{selectedNode.data.reasoning}</p>
              </div>
            )}
            {selectedNode.data?.original_subreddit && (
              <div className="mt-2">
                <span className="font-medium text-blue-800">Source:</span>
                <p className="text-blue-700 text-sm">r/{selectedNode.data.original_subreddit}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
