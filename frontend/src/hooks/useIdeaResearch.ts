import { useState } from 'react';
import { httpPost } from '../lib/api/http';
import type { ResearchRequest, ResearchResponse } from '../lib/research/types';

interface IdeaResearchState {
  result: ResearchResponse | null;
  isLoading: boolean;
  error: string | null;
}

export function useIdeaResearch() {
  const [state, setState] = useState<IdeaResearchState>({
    result: null,
    isLoading: false,
    error: null,
  });

  const runResearch = async (request: ResearchRequest) => {
    setState((currentState) => ({
      ...currentState,
      isLoading: true,
      error: null,
    }));

    try {
      const result = await httpPost<ResearchResponse, ResearchRequest>('/api/research', request);
      setState({
        result,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState((currentState) => ({
        ...currentState,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Research failed',
      }));
    }
  };

  return {
    ...state,
    runResearch,
  };
}
