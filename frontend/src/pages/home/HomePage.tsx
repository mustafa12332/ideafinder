import React from 'react';
import { DiscoveryDemo } from '../../components/discovery/DiscoveryDemo';
import { ProjectProgressBar } from '../../components/progress';
import { useDiscoveryWithProgress } from '../../hooks/useDiscoveryWithProgress';

export function HomePage() {
  const discoveryWithProgress = useDiscoveryWithProgress();
  const { phases, getCurrentPhase, startPhase } = discoveryWithProgress.progress;
  const currentPhase = getCurrentPhase();

  const handlePhaseClick = (phaseId: string) => {
    // For now, only allow clicking on the discovery phase
    if (phaseId === 'discovery') {
      startPhase('discovery');
      // If discovery is configured, start it immediately
      if (discoveryWithProgress.canStart) {
        discoveryWithProgress.actions.start();
      }
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      {/* Fixed Global Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <ProjectProgressBar 
            phases={phases}
            onPhaseClick={handlePhaseClick}
            showMiniStepper={true}
            className="mb-1"
          />
        </div>
      </div>

      {/* Main Content with top padding to account for fixed progress bar */}
      <div className="pt-20">
        <section className="max-w-3xl mx-auto p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Ideafinder</h1>
              <p className="mt-2 text-gray-600">
                Discover and visualize sub-niches with interactive mind maps.
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Current Phase</div>
              <div className="text-lg font-semibold text-blue-600">
                {currentPhase?.label || 'Ready to Start'}
              </div>
            </div>
          </div>
        </section>
        
        <DiscoveryDemo discoveryHook={discoveryWithProgress} />
      </div>
    </main>
  );
}

export default HomePage;


