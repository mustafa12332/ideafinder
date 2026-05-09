import { fireEvent, renderWithProviders, screen, waitFor } from '../../../test/test-utils';
import { IdeaResearchDashboard } from '../IdeaResearchDashboard';
import type { ResearchResponse } from '../../../lib/research/types';

const researchResponse: ResearchResponse = {
  niche: 'AI tools for accountants',
  generatedAt: '2026-05-09T10:00:00.000Z',
  stages: [
    {
      id: 'explorer',
      label: 'Sub-niche explorer',
      status: 'complete',
      summary: 'Mapped sub-niches.',
    },
    {
      id: 'sentiment',
      label: 'Pain and sentiment miner',
      status: 'complete',
      summary: 'Found repeated pain.',
    },
    {
      id: 'synthesis',
      label: 'Solution agent',
      status: 'complete',
      summary: 'Created an app concept.',
    },
    {
      id: 'market',
      label: 'Market verifier',
      status: 'complete',
      summary: 'Estimated market volume.',
    },
  ],
  subNiches: [
    {
      name: 'Tax workflow automation',
      depth: 1,
      demandScore: 82,
      evidenceCount: 12,
    },
  ],
  problemSignals: [
    {
      problem: 'Accountants spend too much time chasing missing client documents.',
      audience: 'Tax workflow automation',
      sentiment: 'negative',
      intensity: 88,
      evidence: [
        {
          title: 'Clients keep sending tax documents late',
          subreddit: 'r/taxpros',
          url: 'https://www.reddit.com/r/taxpros/example',
          score: 42,
          comments: 19,
          excerpt: 'I need a better workflow.',
        },
      ],
    },
  ],
  idea: {
    title: 'TaxFlow Copilot',
    targetAudience: 'Small accounting firms',
    painPoint: 'Missing client documents delay tax preparation.',
    solution: 'A client document chasing workspace for accountants.',
    keyFeatures: ['Client reminders', 'Document checklist', 'Status dashboard'],
    whyNow: 'AI can personalize reminders and extract missing document context.',
    monetization: 'Subscription per firm.',
    mvpScope: ['Checklist builder', 'Reminder queue'],
    risks: ['Seasonal usage'],
  },
  market: {
    similarProducts: ['Practice management tools'],
    unmetGap: 'Broad tools do not focus on document chasing.',
    demandLevel: 'high',
    monthlyDiscussionEstimate: 450,
    validationScore: 84,
    volumeRationale: 'Reddit posts show repeated seasonal frustration.',
  },
  confidenceScore: 86,
};

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => researchResponse,
  }) as unknown as typeof fetch;
});

test('runs idea research and displays the validated idea', async () => {
  renderWithProviders(<IdeaResearchDashboard initialNiche="AI tools for accountants" />);

  fireEvent.click(screen.getByRole('button', { name: /find validated idea/i }));

  await waitFor(() => {
    expect(screen.getByText('TaxFlow Copilot')).toBeInTheDocument();
  });

  expect(screen.getByText(/450 monthly discussions estimated/i)).toBeInTheDocument();
  expect(screen.getByText('Tax workflow automation')).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith('/api/research', expect.objectContaining({
    method: 'POST',
  }));
});
