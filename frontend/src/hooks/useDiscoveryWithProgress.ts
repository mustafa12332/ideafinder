import { useEffect, useRef } from 'react';
import { useDiscovery } from './useDiscovery';
import { useProjectProgress } from './useProjectProgress';

/**
 * Enhanced discovery hook that integrates with global project progress
 */
export function useDiscoveryWithProgress() {
  const discovery = useDiscovery();
  const progress = useProjectProgress();
  const lastProgressRef = useRef<string>('');

  // Sync discovery state with global progress (combined effect to prevent loops)
  useEffect(() => {
    const discoveryPhase = progress.phases.find(p => p.id === 'discovery');
    if (!discoveryPhase) {
      console.warn('Discovery phase not found in progress phases');
      return;
    }

    // Create a unique key for current state to prevent unnecessary updates
    const currentStateKey = JSON.stringify({
      isConfigured: discovery.isConfigured,
      isStarting: discovery.isStarting,
      isDiscovering: discovery.isDiscovering,
      isComplete: discovery.isComplete,
      isError: discovery.isError,
      currentLevel: discovery.currentLevel,
      progress: discovery.progress,
      phaseStatus: discoveryPhase.status
    });

    // Only update if state actually changed
    if (lastProgressRef.current === currentStateKey) {
      return;
    }
    lastProgressRef.current = currentStateKey;

    console.log('Discovery state sync:', {
      isConfigured: discovery.isConfigured,
      isStarting: discovery.isStarting,
      isDiscovering: discovery.isDiscovering,
      isComplete: discovery.isComplete,
      isError: discovery.isError,
      phaseStatus: discoveryPhase.status,
      totalNodes: discovery.graph?.nodes.length || 0
    });

    // Update progress based on discovery state
    if (discovery.isConfigured && discoveryPhase.status === 'pending') {
      console.log('Setting discovery progress to 10% (configured)');
      progress.updatePhaseProgress('discovery', 10);
    } else if (discovery.isStarting) {
      console.log('Starting discovery phase');
      progress.startPhase('discovery');
      progress.updatePhaseProgress('discovery', 15);
    } else if (discovery.isDiscovering) {
      if (discoveryPhase.status !== 'running') {
        console.log('Discovery is running, starting phase');
        progress.startPhase('discovery');
      }
      
      // Calculate progress based on level completion, node discovery, and sub-analysis progress
      const maxLevels = discovery.config?.maxLevels || 3;
      const currentLevel = discovery.currentLevel || 0;
      const levelProgress = discovery.progress || {};
      const subAnalysis = discovery.subAnalysis;
      
      let totalProgress = 15; // Base progress for starting
      
      // Add progress for completed levels (each level gets equal weight)
      const progressPerLevel = 80 / maxLevels; // 80% total for all levels, 15% for starting, 5% for completion
      
      for (let level = 0; level < currentLevel; level++) {
        totalProgress += progressPerLevel;
      }
      
      // Add progress for current level being worked on
      if (currentLevel < maxLevels) {
        let currentLevelProgress = levelProgress[currentLevel] || 0;
        
        // Enhance current level progress with sub-analysis details
        if (subAnalysis && subAnalysis.totalItems > 0) {
          const itemProgress = (subAnalysis.completedItems / subAnalysis.totalItems);
          const currentItemProgress = (subAnalysis.currentItemProgress || 0) / 100;
          const subAnalysisProgress = itemProgress + (currentItemProgress / subAnalysis.totalItems);
          
          // Use the more detailed progress if available
          currentLevelProgress = Math.max(currentLevelProgress, subAnalysisProgress);
          
          console.log('Enhanced progress calculation:', {
            level: currentLevel,
            basicLevelProgress: levelProgress[currentLevel] || 0,
            subAnalysisProgress: subAnalysisProgress.toFixed(3),
            itemsCompleted: `${subAnalysis.completedItems}/${subAnalysis.totalItems}`,
            currentItemProgress: `${subAnalysis.currentItemProgress || 0}%`,
            finalLevelProgress: currentLevelProgress.toFixed(3)
          });
        }
        
        totalProgress += currentLevelProgress * progressPerLevel;
      }
      
      const clampedProgress = Math.min(95, Math.max(15, totalProgress));
      
      console.log('Calculating discovery progress:', { 
        currentLevel, 
        maxLevels, 
        levelProgress, 
        totalProgress: totalProgress.toFixed(1),
        clampedProgress: clampedProgress.toFixed(1),
        totalNodes: discovery.graph?.nodes.length || 0
      });
      
      progress.updatePhaseProgress('discovery', clampedProgress);
    } else if (discovery.isComplete) {
      console.log('Discovery completed, marking phase as done');
      progress.completePhase('discovery');
      
      const nextPhase = progress.phases.find(p => p.status === 'pending');
      if (nextPhase?.id === 'trends') {
        progress.updatePhase('trends', { 
          status: 'pending',
          description: 'Ready to analyze trends from discovered sub-niches'
        });
      }
    } else if (discovery.isError) {
      console.log('Discovery failed, setting error');
      progress.setPhaseError('discovery', 'Discovery process encountered an error');
    }
  }, [
    discovery.isConfigured,
    discovery.isStarting,
    discovery.isDiscovering,
    discovery.isComplete,
    discovery.isError,
    discovery.currentLevel,
    discovery.graph?.nodes.length,
    discovery.config?.maxLevels,
    JSON.stringify(discovery.progress),
    JSON.stringify(discovery.subAnalysis), // Include sub-analysis for granular progress
    JSON.stringify(progress.phases.find(p => p.id === 'discovery')?.status)
  ]);

  return {
    ...discovery,
    progress
  };
};
