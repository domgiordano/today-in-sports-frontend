export type QuestionType = 'mc' | 'numeric' | 'not_happened' | 'ordering' | 'clue';
export type QuestionStatus = 'draft' | 'approved' | 'rejected' | 'used';

/**
 * Shape emitted by the backend generator. Every field below `sourceEventId`
 * is provenance: a question that cannot be traced back to a dataset row is not
 * reviewable, and the generator refuses to emit one.
 */
export interface Question {
  questionId: string;
  type: QuestionType;
  tier: 1 | 2 | 3 | 4 | 5;
  prompt: string;
  answer: string | number;
  distractors?: string[];
  numericAnswer?: number;
  tolerance?: number;

  sport: string;
  league: string;
  isNegroLeagues?: boolean;
  mmdd: string;
  year: number;

  sourceEventId: string | number;
  sourceReason: string;
  sourceName: string;
  sourceDatasetRef: string;

  status: QuestionStatus;
  rejectionReason?: string;
}

export interface QuestionBundle {
  generatedAt: string;
  total: number;
  questions: Question[];
}

export const TIER_LABEL: Record<number, string> = {
  1: 'Last year',
  2: '2-5 years',
  3: '5-15 years',
  4: '15-30 years',
  5: '30+ years',
};

/** Detector that produced the event behind a question. */
export const REASON_LABEL: Record<string, string> = {
  no_hitter: 'No-hitter',
  perfect_game: 'Perfect game',
  world_series_game: 'World Series',
  world_series_game7: 'World Series Game 7',
  postseason_shutout: 'Postseason shutout',
  postseason_extra_innings: 'Postseason extras',
  postseason_one_run: 'Postseason one-run',
  extra_innings_marathon: 'Extra-innings marathon',
  one_nothing_extras: '1-0 in extras',
  blowout: 'Blowout',
  slugfest: 'Slugfest',
};
