/**
 * TempoMapper: Maps commit frequency and activity to BPM
 * BOC-3: Music Mapping Engine
 */

import { TEMPO_MAPPINGS } from '../constants/mappings';

export class TempoMapper {
  /**
   * Map commit frequency to BPM
   * @param commitsPerHour - Number of commits per hour
   * @returns BPM value
   */
  static commitFrequencyToBPM(commitsPerHour: number): number {
    // Find the appropriate tempo range
    for (const mapping of TEMPO_MAPPINGS) {
      if (commitsPerHour >= mapping.minCommits && commitsPerHour < mapping.maxCommits) {
        // Linear interpolation within the range
        const ratio =
          (commitsPerHour - mapping.minCommits) / (mapping.maxCommits - mapping.minCommits);
        return Math.round(mapping.minBPM + ratio * (mapping.maxBPM - mapping.minBPM));
      }
    }

    // Fallback to max BPM if above all ranges
    const lastMapping = TEMPO_MAPPINGS[TEMPO_MAPPINGS.length - 1];
    return lastMapping.maxBPM;
  }

  /**
   * Calculate commits per hour from time window
   * @param commitCount - Number of commits
   * @param timeWindowMs - Time window in milliseconds
   * @returns Commits per hour
   */
  static calculateCommitsPerHour(commitCount: number, timeWindowMs: number): number {
    const hours = timeWindowMs / (1000 * 60 * 60);
    return hours > 0 ? commitCount / hours : 0;
  }

  /**
   * Adjust BPM based on emotion modifier
   * @param baseBPM - Base BPM value
   * @param modifier - BPM modifier from emotion mapping
   * @returns Adjusted BPM
   */
  static applyEmotionModifier(baseBPM: number, modifier: number): number {
    return Math.max(40, Math.min(200, baseBPM + modifier));
  }

  /**
   * Calculate BPM from activity level (0-1)
   * @param activityLevel - Normalized activity level (0-1)
   * @returns BPM value
   */
  static activityToBPM(activityLevel: number): number {
    const minBPM = 60;
    const maxBPM = 180;
    const clampedActivity = Math.max(0, Math.min(1, activityLevel));
    return Math.round(minBPM + clampedActivity * (maxBPM - minBPM));
  }

  /**
   * Get tempo description from BPM
   * @param bpm - BPM value
   * @returns Tempo description (e.g., 'Andante', 'Allegro')
   */
  static getTempoDescription(bpm: number): string {
    if (bpm < 60) return 'Largo'; // Very slow
    if (bpm < 80) return 'Adagio'; // Slow
    if (bpm < 100) return 'Andante'; // Walking pace
    if (bpm < 120) return 'Moderato'; // Moderate
    if (bpm < 140) return 'Allegro'; // Fast
    if (bpm < 160) return 'Vivace'; // Lively
    return 'Presto'; // Very fast
  }

  /**
   * Calculate swing ratio from event irregularity
   * @param irregularity - Measure of timing irregularity (0-1)
   * @returns Swing ratio (0.5 = straight, higher = more swing)
   */
  static calculateSwing(irregularity: number): number {
    const minSwing = 0.5; // Straight
    const maxSwing = 0.67; // Triplet swing
    const clampedIrregularity = Math.max(0, Math.min(1, irregularity));
    return minSwing + clampedIrregularity * (maxSwing - minSwing);
  }
}
