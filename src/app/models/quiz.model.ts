export type QuizStatus = 'draft' | 'scheduled' | 'published';

/**
 * An assembled daily quiz.
 *
 * `quizDate` is a UTC yyyy-mm-dd — the day it is served. That is a different
 * thing from an event's game date, which is the local date a game was played.
 */
export interface Quiz {
  quizDate: string;
  questionIds: string[];
  status: QuizStatus;
  /** Counts per sport, e.g. { mlb: 3, nhl: 1, f1: 1 }. */
  sportMix?: Record<string, number>;
  tierLadder?: number[];
  /** What the assembler had to relax to fill this day. */
  warnings?: string[];
  relaxedConstraints?: string[];
  publishedAt?: string;
  updatedAt?: string;
}
