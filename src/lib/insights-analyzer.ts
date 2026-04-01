/**
 * Winner detection and composite scoring for Meta ads
 */

export interface AdWithMetrics {
  ad_id: string;
  ad_name: string;
  adset_name: string;
  campaign_name: string;
  status: string;
  spend: number;
  impressions: number;
  unique_outbound_clicks: number;
  unique_outbound_ctr: number;
  cost_per_unique_outbound_click: number;
  applications_submitted: number;
  cost_per_application: number;
  cpm: number;
  roas: number;
  leads: number;
  purchases: number;
  purchase_value: number;
  clicks_all: number;
  primary_text?: string;
  headline?: string;
  [key: string]: unknown;
}

export interface ScoredAd extends AdWithMetrics {
  composite_score: number;
  verdict: string;
}

type PrimaryMetric = 'roas' | 'cost_per_application' | 'unique_outbound_ctr' | 'cost_per_unique_outbound_click' | 'cost_per_lead';

interface WeightConfig {
  primary: number;
  supporting: Array<{ metric: string; weight: number }>;
}

const WEIGHT_CONFIGS: Record<PrimaryMetric, WeightConfig> = {
  roas: {
    primary: 0.6,
    supporting: [
      { metric: 'cost_per_application', weight: 0.2 },
      { metric: 'unique_outbound_ctr', weight: 0.1 },
      { metric: 'volume', weight: 0.1 },
    ],
  },
  cost_per_application: {
    primary: 0.6,
    supporting: [
      { metric: 'unique_outbound_ctr', weight: 0.2 },
      { metric: 'volume', weight: 0.1 },
      { metric: 'roas', weight: 0.1 },
    ],
  },
  unique_outbound_ctr: {
    primary: 0.6,
    supporting: [
      { metric: 'cost_per_unique_outbound_click', weight: 0.2 },
      { metric: 'volume', weight: 0.1 },
      { metric: 'roas', weight: 0.1 },
    ],
  },
  cost_per_unique_outbound_click: {
    primary: 0.6,
    supporting: [
      { metric: 'unique_outbound_ctr', weight: 0.2 },
      { metric: 'volume', weight: 0.1 },
      { metric: 'roas', weight: 0.1 },
    ],
  },
  cost_per_lead: {
    primary: 0.6,
    supporting: [
      { metric: 'unique_outbound_ctr', weight: 0.2 },
      { metric: 'volume', weight: 0.1 },
      { metric: 'roas', weight: 0.1 },
    ],
  },
};

/**
 * Score a single metric value on a 0-100 scale
 */
function scoreMetric(metric: string, value: number, medianValues: Record<string, number>): number {
  switch (metric) {
    case 'roas':
      // 3x ROAS = perfect score
      return Math.min(100, (value / 3.0) * 100);

    case 'unique_outbound_ctr':
      // 5% unique outbound CTR = perfect score
      return Math.min(100, (value / 5.0) * 100);

    case 'cost_per_application': {
      // Lower is better; at median = 50, half median = 100
      const med = medianValues.cost_per_application || 1;
      return Math.max(0, 100 - (value / med) * 50);
    }

    case 'cost_per_unique_outbound_click': {
      const med = medianValues.cost_per_unique_outbound_click || 1;
      return Math.max(0, 100 - (value / med) * 50);
    }

    case 'cost_per_lead': {
      const med = medianValues.cost_per_lead || 1;
      return Math.max(0, 100 - (value / med) * 50);
    }

    case 'volume':
      // $100+ spend = full volume credit
      return Math.min(100, (value / 100) * 100);

    default:
      return 50;
  }
}

/**
 * Compute median of an array of numbers
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Assign verdict based on composite score
 */
function getVerdict(score: number): string {
  if (score >= 80) return 'Strong winner — consider scaling';
  if (score >= 60) return 'Promising — monitor and consider duplicating';
  if (score >= 40) return 'Average performer';
  return 'Underperformer — consider pausing';
}

/**
 * Rank ads by composite performance score
 */
export function rankAds(
  ads: AdWithMetrics[],
  primaryMetric: PrimaryMetric,
  minSpend: number = 10,
  topN: number = 10
): ScoredAd[] {
  // Filter by minimum spend for statistical significance
  const qualifying = ads.filter(ad => ad.spend >= minSpend);

  if (qualifying.length === 0) {
    return [];
  }

  // Compute medians for relative scoring
  const medianValues: Record<string, number> = {
    cost_per_application: median(qualifying.filter(a => a.cost_per_application > 0).map(a => a.cost_per_application)),
    cost_per_unique_outbound_click: median(qualifying.filter(a => a.cost_per_unique_outbound_click > 0).map(a => a.cost_per_unique_outbound_click)),
    cost_per_lead: median(qualifying.filter(a => (a.cost_per_lead as number || 0) > 0).map(a => a.cost_per_lead as number || 0)),
  };

  const config = WEIGHT_CONFIGS[primaryMetric];

  const scored: ScoredAd[] = qualifying.map(ad => {
    // Score primary metric
    const primaryScore = scoreMetric(primaryMetric, ad[primaryMetric] as number, medianValues);

    // Score supporting metrics
    let supportingScore = 0;
    for (const { metric, weight } of config.supporting) {
      const value = metric === 'volume' ? ad.spend : (ad as unknown as Record<string, number>)[metric] ?? 0;
      supportingScore += scoreMetric(metric, value, medianValues) * weight;
    }

    const compositeScore = Math.round(primaryScore * config.primary + supportingScore);

    return {
      ...ad,
      composite_score: compositeScore,
      verdict: getVerdict(compositeScore),
    };
  });

  // Sort by composite score descending and return top N
  return scored.sort((a, b) => b.composite_score - a.composite_score).slice(0, topN);
}
