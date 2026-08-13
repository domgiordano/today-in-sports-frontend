/**
 * A detected notable event — the layer between a raw game row and a question.
 *
 * Browsing these is how you tell "the templates are weak" from "the detectors
 * found nothing here", which are very different problems with very different
 * fixes.
 */
export interface SportEvent {
  gameId: string | number;
  gameDate: string;
  mmdd: string;
  year: number;
  sport: string;
  league: string;
  isNegroLeagues?: boolean;
  /** Which detector fired. */
  reason: string;
  notabilityScore: number;
  title: string;
  facts?: Record<string, unknown>;
  sourceName: string;
  sourceDatasetRef: string;
  needsRegeneration?: boolean;
}
