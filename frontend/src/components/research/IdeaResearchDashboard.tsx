import React, { FormEvent, memo, useMemo, useState } from 'react';
import { useIdeaResearch } from '../../hooks/useIdeaResearch';
import type {
  AgentStage,
  MarketVerification,
  ProblemSignal,
  ResearchRequest,
  ResearchResponse,
  SubNiche,
} from '../../lib/research/types';

interface IdeaResearchDashboardProps {
  initialNiche?: string;
}

interface AgentPipelineProps {
  stages: AgentStage[];
  isLoading: boolean;
}

interface ResearchResultsProps {
  result: ResearchResponse;
}

interface MetricCardProps {
  label: string;
  value: string;
  description: string;
  tone: 'blue' | 'green' | 'purple' | 'orange';
}

interface SubNicheMapProps {
  subNiches: SubNiche[];
}

interface ProblemSignalsProps {
  signals: ProblemSignal[];
}

interface MarketPanelProps {
  market: MarketVerification;
}

export function IdeaResearchDashboard({ initialNiche = 'AI productivity tools' }: IdeaResearchDashboardProps) {
  const { result, isLoading, error, runResearch } = useIdeaResearch();
  const [form, setForm] = useState<ResearchRequest>({
    niche: initialNiche,
    maxDepth: 3,
    maxBranches: 6,
  });

  const activeStages = useMemo(() => {
    if (result) {
      return result.stages;
    }

    return defaultStages.map((stage, index) => ({
      ...stage,
      status: isLoading && index === 0 ? 'running' as const : stage.status,
    }));
  }, [isLoading, result]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    runResearch(form);
  };

  return (
    <section className={styles.shell}>
      <div className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Reddit to validated app idea</p>
          <h1 className={styles.heading}>Ideafinder</h1>
          <p className={styles.subheading}>
            Enter a niche. The app explores sub-niches, mines Reddit pain signals, drafts a solution, checks
            similar products, and estimates demand volume in one visual workflow.
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label} htmlFor="research-niche">
            Niche or market to research
          </label>
          <input
            id="research-niche"
            value={form.niche}
            onChange={(event) => setForm({ ...form, niche: event.target.value })}
            className={styles.input}
            placeholder="Example: AI tools for real estate agents"
            disabled={isLoading}
          />

          <div className={styles.formGrid}>
            <label className={styles.compactLabel}>
              Depth
              <input
                type="number"
                min={1}
                max={4}
                value={form.maxDepth}
                onChange={(event) => setForm({ ...form, maxDepth: Number(event.target.value) })}
                className={styles.input}
                disabled={isLoading}
              />
            </label>
            <label className={styles.compactLabel}>
              Branches
              <input
                type="number"
                min={2}
                max={12}
                value={form.maxBranches}
                onChange={(event) => setForm({ ...form, maxBranches: Number(event.target.value) })}
                className={styles.input}
                disabled={isLoading}
              />
            </label>
          </div>

          <button className={styles.primaryButton} disabled={isLoading || form.niche.trim().length < 2}>
            {isLoading ? 'Agents researching...' : 'Find validated idea'}
          </button>
          <p className={styles.helperText}>
            Configure OPENAI_API_KEY and REDDIT_BEARER_TOKEN on the backend for live agent research.
          </p>
        </form>
      </div>

      {error && (
        <div className={styles.errorBox} role="alert">
          {error}
        </div>
      )}

      <AgentPipeline stages={activeStages} isLoading={isLoading} />

      {result ? (
        <ResearchResults result={result} />
      ) : (
        <div className={styles.emptyState}>
          <h2 className={styles.sectionTitle}>Ready for a niche</h2>
          <p className={styles.mutedText}>
            Results will appear as a visual brief with sub-niches, pain evidence, market verification, and an MVP plan.
          </p>
        </div>
      )}
    </section>
  );
}

const AgentPipeline = memo(function AgentPipeline({ stages, isLoading }: AgentPipelineProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.sectionTitle}>Agent workflow</h2>
        <span className={isLoading ? styles.statusRunning : styles.statusReady}>
          {isLoading ? 'Running' : 'Ready'}
        </span>
      </div>
      <div className={styles.pipelineGrid}>
        {stages.map((stage, index) => (
          <div className={styles.stageCard} key={stage.id}>
            <div className={styles.stageTopline}>
              <span className={styles.stageNumber}>{index + 1}</span>
              <span className={getStageStatusClassName(stage.status)}>{stage.status}</span>
            </div>
            <h3 className={styles.cardTitle}>{stage.label}</h3>
            <p className={styles.mutedText}>{stage.summary}</p>
          </div>
        ))}
      </div>
    </div>
  );
});

const ResearchResults = memo(function ResearchResults({ result }: ResearchResultsProps) {
  return (
    <div className={styles.resultsGrid}>
      <div className={styles.ideaPanel}>
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.eyebrow}>Recommended app</p>
            <h2 className={styles.ideaTitle}>{result.idea.title}</h2>
          </div>
          <span className={styles.confidenceBadge}>{result.confidenceScore}% confidence</span>
        </div>

        <p className={styles.solutionText}>{result.idea.solution}</p>

        <div className={styles.metricGrid}>
          <MetricCard
            label="Audience"
            value={result.idea.targetAudience}
            description="Buyer segment found from research"
            tone="blue"
          />
          <MetricCard
            label="Demand"
            value={result.market.demandLevel}
            description={`${result.market.monthlyDiscussionEstimate} monthly discussions estimated`}
            tone="green"
          />
          <MetricCard
            label="Validation"
            value={`${result.market.validationScore}%`}
            description="Market verifier score"
            tone="purple"
          />
          <MetricCard
            label="Signals"
            value={String(result.problemSignals.length)}
            description="Pain clusters discovered"
            tone="orange"
          />
        </div>

        <div className={styles.twoColumn}>
          <ListPanel title="Key features" items={result.idea.keyFeatures} />
          <ListPanel title="MVP scope" items={result.idea.mvpScope} />
        </div>

        <div className={styles.noteBox}>
          <h3 className={styles.cardTitle}>Why now</h3>
          <p className={styles.mutedText}>{result.idea.whyNow}</p>
        </div>
      </div>

      <MarketPanel market={result.market} />
      <SubNicheMap subNiches={result.subNiches} />
      <ProblemSignals signals={result.problemSignals} />
    </div>
  );
});

const MetricCard = memo(function MetricCard({ label, value, description, tone }: MetricCardProps) {
  return (
    <div className={`${styles.metricCard} ${metricToneClassNames[tone]}`}>
      <p className={styles.metricLabel}>{label}</p>
      <p className={styles.metricValue}>{value}</p>
      <p className={styles.metricDescription}>{description}</p>
    </div>
  );
});

const SubNicheMap = memo(function SubNicheMap({ subNiches }: SubNicheMapProps) {
  const groupedSubNiches = useMemo(() => {
    return subNiches.reduce<Record<number, SubNiche[]>>((groups, subNiche) => {
      const currentGroup = groups[subNiche.depth] ?? [];
      groups[subNiche.depth] = [...currentGroup, subNiche];
      return groups;
    }, {});
  }, [subNiches]);

  return (
    <div className={styles.panel}>
      <h2 className={styles.sectionTitle}>Sub-niche map</h2>
      <div className={styles.depthList}>
        {Object.entries(groupedSubNiches).map(([depth, items]) => (
          <div key={depth}>
            <h3 className={styles.depthHeading}>Depth {depth}</h3>
            <div className={styles.chipGrid}>
              {items.map((subNiche) => (
                <div className={styles.subNicheChip} key={`${subNiche.depth}-${subNiche.name}`}>
                  <span>{subNiche.name}</span>
                  <span className={styles.chipScore}>{subNiche.demandScore}/100</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

const ProblemSignals = memo(function ProblemSignals({ signals }: ProblemSignalsProps) {
  return (
    <div className={styles.panel}>
      <h2 className={styles.sectionTitle}>Pain evidence</h2>
      <div className={styles.signalList}>
        {signals.map((signal) => (
          <article className={styles.signalCard} key={`${signal.audience}-${signal.problem}`}>
            <div className={styles.panelHeader}>
              <div>
                <h3 className={styles.cardTitle}>{signal.audience}</h3>
                <p className={styles.mutedText}>{signal.problem}</p>
              </div>
              <span className={styles.intensityBadge}>{signal.intensity}/100</span>
            </div>
            <div className={styles.evidenceList}>
              {signal.evidence.slice(0, 3).map((item) => (
                <a className={styles.evidenceItem} href={item.url} key={item.url} rel="noreferrer" target="_blank">
                  <span className={styles.evidenceTitle}>{item.title}</span>
                  <span className={styles.evidenceMeta}>
                    {item.subreddit} - {item.score} points - {item.comments} comments
                  </span>
                </a>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
});

const MarketPanel = memo(function MarketPanel({ market }: MarketPanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.sectionTitle}>Market verification</h2>
        <span className={styles.confidenceBadge}>{market.demandLevel} demand</span>
      </div>
      <p className={styles.solutionText}>{market.unmetGap}</p>
      <p className={styles.mutedText}>{market.volumeRationale}</p>
      <ListPanel title="Similar products or categories" items={market.similarProducts} />
    </div>
  );
});

function ListPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className={styles.listPanel}>
      <h3 className={styles.cardTitle}>{title}</h3>
      <ul className={styles.bulletList}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function getStageStatusClassName(status: AgentStage['status']) {
  if (status === 'complete') {
    return styles.statusComplete;
  }

  if (status === 'running') {
    return styles.statusRunning;
  }

  if (status === 'error') {
    return styles.statusError;
  }

  return styles.statusReady;
}

const defaultStages: AgentStage[] = [
  {
    id: 'explorer',
    label: 'Sub-niche explorer',
    status: 'pending',
    summary: 'Finds sub-niches and sub-sub-niches from the starting market.',
  },
  {
    id: 'sentiment',
    label: 'Pain and sentiment miner',
    status: 'pending',
    summary: 'Looks for frustrated Reddit posts, help requests, and repeated manual workflows.',
  },
  {
    id: 'synthesis',
    label: 'Solution agent',
    status: 'pending',
    summary: 'Turns the strongest pain cluster into a focused app recommendation.',
  },
  {
    id: 'market',
    label: 'Market verifier',
    status: 'pending',
    summary: 'Checks competition and estimates discussion volume for the idea.',
  },
];

const metricToneClassNames = {
  blue: 'border-blue-100 bg-blue-50 text-blue-900',
  green: 'border-green-100 bg-green-50 text-green-900',
  purple: 'border-purple-100 bg-purple-50 text-purple-900',
  orange: 'border-orange-100 bg-orange-50 text-orange-900',
};

const styles = {
  shell: 'mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8',
  hero: 'grid gap-6 rounded-3xl bg-slate-950 p-6 text-white shadow-xl lg:grid-cols-[1.4fr_1fr] lg:p-8',
  heroCopy: 'flex flex-col justify-center',
  eyebrow: 'text-sm font-semibold uppercase tracking-wide text-blue-300',
  heading: 'mt-2 text-4xl font-bold tracking-tight sm:text-5xl',
  subheading: 'mt-4 max-w-3xl text-base leading-7 text-slate-300',
  form: 'rounded-2xl bg-white p-5 text-slate-900 shadow-lg',
  label: 'block text-sm font-semibold text-slate-700',
  compactLabel: 'block text-sm font-semibold text-slate-700',
  input: 'mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 shadow-sm focus:border-blue-500',
  formGrid: 'mt-4 grid grid-cols-2 gap-3',
  primaryButton: 'mt-5 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50',
  helperText: 'mt-3 text-xs leading-5 text-slate-500',
  errorBox: 'rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800',
  panel: 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm',
  panelHeader: 'mb-4 flex flex-wrap items-start justify-between gap-3',
  sectionTitle: 'text-xl font-bold text-slate-900',
  pipelineGrid: 'grid gap-4 md:grid-cols-2 xl:grid-cols-4',
  stageCard: 'rounded-2xl border border-slate-100 bg-slate-50 p-4',
  stageTopline: 'mb-3 flex items-center justify-between',
  stageNumber: 'flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white',
  statusReady: 'rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-600',
  statusRunning: 'rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase text-blue-700',
  statusComplete: 'rounded-full bg-green-100 px-3 py-1 text-xs font-semibold uppercase text-green-700',
  statusError: 'rounded-full bg-red-100 px-3 py-1 text-xs font-semibold uppercase text-red-700',
  cardTitle: 'text-base font-bold text-slate-900',
  mutedText: 'text-sm leading-6 text-slate-600',
  emptyState: 'rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center',
  resultsGrid: 'grid gap-6 lg:grid-cols-2',
  ideaPanel: 'rounded-2xl border border-blue-100 bg-white p-5 shadow-sm lg:col-span-2',
  ideaTitle: 'mt-1 text-3xl font-bold text-slate-950',
  confidenceBadge: 'rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold capitalize text-blue-700',
  solutionText: 'mb-4 text-base leading-7 text-slate-700',
  metricGrid: 'grid gap-3 md:grid-cols-2 xl:grid-cols-4',
  metricCard: 'rounded-2xl border p-4',
  metricLabel: 'text-xs font-semibold uppercase tracking-wide opacity-75',
  metricValue: 'mt-2 text-2xl font-bold capitalize',
  metricDescription: 'mt-1 text-xs leading-5 opacity-75',
  twoColumn: 'mt-5 grid gap-4 md:grid-cols-2',
  listPanel: 'rounded-2xl border border-slate-100 bg-slate-50 p-4',
  bulletList: 'mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700',
  noteBox: 'mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4',
  depthList: 'space-y-5',
  depthHeading: 'mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500',
  chipGrid: 'flex flex-wrap gap-2',
  subNicheChip: 'flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700',
  chipScore: 'rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-blue-700',
  signalList: 'space-y-4',
  signalCard: 'rounded-2xl border border-slate-100 bg-slate-50 p-4',
  intensityBadge: 'rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-700',
  evidenceList: 'mt-3 space-y-2',
  evidenceItem: 'block rounded-xl border border-slate-200 bg-white p-3 hover:border-blue-200 hover:bg-blue-50',
  evidenceTitle: 'block text-sm font-semibold text-slate-900',
  evidenceMeta: 'mt-1 block text-xs text-slate-500',
};
