import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProjectProgressBar } from '../ProjectProgressBar';
import { ProjectPhase } from '../types';

const mockPhases: ProjectPhase[] = [
  {
    id: 'discovery',
    label: 'Discovery',
    progress: 100,
    status: 'done',
    description: 'Finding sub-niches',
    estimatedDuration: 3
  },
  {
    id: 'trends',
    label: 'Trend Analysis',
    progress: 60,
    status: 'running',
    description: 'Analyzing market trends',
    estimatedDuration: 5
  },
  {
    id: 'problems',
    label: 'Problem Extraction',
    progress: 0,
    status: 'pending',
    description: 'Identifying problems',
    estimatedDuration: 4
  }
];

describe('ProjectProgressBar', () => {
  it('renders all phases correctly', () => {
    render(<ProjectProgressBar phases={mockPhases} />);
    
    expect(screen.getByText('Discovery')).toBeInTheDocument();
    expect(screen.getByText('Trend Analysis')).toBeInTheDocument();
    expect(screen.getByText('Problem Extraction')).toBeInTheDocument();
  });

  it('displays correct overall progress percentage', () => {
    render(<ProjectProgressBar phases={mockPhases} />);
    
    // Overall progress should be (100 + 60 + 0) / 3 = 53%
    expect(screen.getByText('53%')).toBeInTheDocument();
  });

  it('shows current active phase', () => {
    render(<ProjectProgressBar phases={mockPhases} />);
    
    // Should show the running phase
    expect(screen.getByText('Trend Analysis')).toBeInTheDocument();
  });

  it('calls onPhaseClick when phase is clicked', () => {
    const handlePhaseClick = jest.fn();
    render(
      <ProjectProgressBar 
        phases={mockPhases} 
        onPhaseClick={handlePhaseClick}
      />
    );
    
    const discoveryPhase = screen.getByText('Discovery');
    fireEvent.click(discoveryPhase);
    
    expect(handlePhaseClick).toHaveBeenCalledWith('discovery');
  });

  it('displays correct status badges', () => {
    render(<ProjectProgressBar phases={mockPhases} />);
    
    // Should have checkmark for completed, dot for running, circle for pending
    expect(screen.getByText('✓')).toBeInTheDocument(); // Done
    expect(screen.getByText('●')).toBeInTheDocument(); // Running
    expect(screen.getByText('○')).toBeInTheDocument(); // Pending
  });

  it('hides mini stepper when showMiniStepper is false', () => {
    render(
      <ProjectProgressBar 
        phases={mockPhases} 
        showMiniStepper={false}
      />
    );
    
    // Status badges should not be visible
    expect(screen.queryByText('✓')).not.toBeInTheDocument();
  });

  it('handles empty phases array', () => {
    render(<ProjectProgressBar phases={[]} />);
    
    // Should show 0% progress
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('handles error phase correctly', () => {
    const errorPhases: ProjectPhase[] = [
      {
        id: 'discovery',
        label: 'Discovery',
        progress: 50,
        status: 'error',
        description: 'Failed during discovery'
      }
    ];

    render(<ProjectProgressBar phases={errorPhases} />);
    
    expect(screen.getByText('!')).toBeInTheDocument(); // Error badge
  });
});
