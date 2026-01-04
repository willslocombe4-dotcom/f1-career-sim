/**
 * LapTimer - Tracks lap times and calculates statistics for race sessions
 */

export interface LapTime {
  lapNumber: number;
  time: number; // in milliseconds
  sector1: number | null;
  sector2: number | null;
  sector3: number | null;
  isValid: boolean;
  timestamp: Date;
}

export class LapTimer {
  private laps: LapTime[] = [];
  private currentLapStart: number = 0;
  private sectorTimes: (number | null)[] = [];
  private isRunning: boolean = false;

  constructor() {
    this.reset();
  }

  /**
   * Start timing a new lap
   */
  startLap(): void {
    this.currentLapStart = Date.now();
    this.sectorTimes = [];
    this.isRunning = true;
  }

  /**
   * Record a sector time
   * @returns The sector time in ms, or null if timer is not running
   */
  recordSector(): number | null {
    if (!this.isRunning) return null;
    
    const sectorTime = Math.max(0, Date.now() - this.currentLapStart - this.getTotalSectorTime());
    this.sectorTimes.push(sectorTime);
    return sectorTime;
  }

  /**
   * Complete the current lap and record it
   * @param isValid - Whether the lap should be marked valid (will be auto-invalidated if sectors missing)
   * @returns The completed lap, or null if timer is not running
   */
  completeLap(isValid: boolean = true): LapTime | null {
    if (!this.isRunning) return null;

    const totalTime = Date.now() - this.currentLapStart;
    
    // Check if all 3 sectors were recorded - auto-invalidate if not
    const hasAllSectors = this.sectorTimes.length === 3;
    const lapIsValid = isValid && hasAllSectors;

    const lap: LapTime = {
      lapNumber: this.laps.length + 1,
      time: totalTime,
      sector1: this.sectorTimes[0] ?? null,
      sector2: this.sectorTimes[1] ?? null,
      sector3: this.sectorTimes[2] ?? null,
      isValid: lapIsValid,
      timestamp: new Date(this.currentLapStart)
    };

    this.laps.push(lap);
    this.isRunning = false;
    return lap;
  }

  /**
   * Get the current lap time while timing is in progress
   * @returns Current elapsed time in ms, or null if not running
   */
  getCurrentLapTime(): number | null {
    if (!this.isRunning) return null;
    return Date.now() - this.currentLapStart;
  }

  /**
   * Check if timer is currently running
   */
  isTimerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get number of sectors recorded in current lap
   */
  getCurrentSectorCount(): number {
    return this.sectorTimes.length;
  }

  /**
   * Get the fastest lap
   */
  getFastestLap(): LapTime | null {
    const validLaps = this.laps.filter(lap => lap.isValid);
    if (validLaps.length === 0) return null;
    
    return validLaps.reduce((fastest, lap) => 
      lap.time < fastest.time ? lap : fastest
    );
  }

  /**
   * Get average lap time
   */
  getAverageLapTime(): number {
    const validLaps = this.laps.filter(lap => lap.isValid);
    if (validLaps.length === 0) return 0;
    
    const total = validLaps.reduce((sum, lap) => sum + lap.time, 0);
    return total / validLaps.length;
  }

  /**
   * Get all laps
   */
  getLaps(): LapTime[] {
    return [...this.laps];
  }

  /**
   * Get lap count
   */
  getLapCount(): number {
    return this.laps.length;
  }

  /**
   * Format time as MM:SS.mmm
   */
  static formatTime(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }

  /**
   * Reset the timer
   */
  reset(): void {
    this.laps = [];
    this.currentLapStart = 0;
    this.sectorTimes = [];
    this.isRunning = false;
  }

  private getTotalSectorTime(): number {
    return this.sectorTimes.reduce((sum: number, time) => sum + (time ?? 0), 0);
  }
}
