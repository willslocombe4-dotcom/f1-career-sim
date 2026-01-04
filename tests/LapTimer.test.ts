import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LapTimer } from '../src/core/LapTimer';

describe('LapTimer', () => {
  let timer: LapTimer;

  beforeEach(() => {
    timer = new LapTimer();
  });

  describe('formatTime', () => {
    it('should format milliseconds correctly', () => {
      expect(LapTimer.formatTime(90000)).toBe('1:30.000');
      expect(LapTimer.formatTime(65432)).toBe('1:05.432');
      expect(LapTimer.formatTime(59999)).toBe('0:59.999');
    });

    it('should handle zero', () => {
      expect(LapTimer.formatTime(0)).toBe('0:00.000');
    });

    it('should handle large times', () => {
      expect(LapTimer.formatTime(3661234)).toBe('61:01.234');
    });
  });

  describe('timer state', () => {
    it('should not be running initially', () => {
      expect(timer.isTimerRunning()).toBe(false);
    });

    it('should be running after startLap', () => {
      timer.startLap();
      expect(timer.isTimerRunning()).toBe(true);
    });

    it('should stop running after completeLap', () => {
      timer.startLap();
      timer.completeLap();
      expect(timer.isTimerRunning()).toBe(false);
    });
  });

  describe('sector recording', () => {
    it('should return null when timer not running', () => {
      expect(timer.recordSector()).toBeNull();
    });

    it('should return sector time when running', () => {
      timer.startLap();
      const sector = timer.recordSector();
      expect(sector).not.toBeNull();
      expect(typeof sector).toBe('number');
    });

    it('should track sector count', () => {
      timer.startLap();
      expect(timer.getCurrentSectorCount()).toBe(0);
      
      timer.recordSector();
      expect(timer.getCurrentSectorCount()).toBe(1);
      
      timer.recordSector();
      expect(timer.getCurrentSectorCount()).toBe(2);
      
      timer.recordSector();
      expect(timer.getCurrentSectorCount()).toBe(3);
    });

    it('should record sector times in lap', () => {
      timer.startLap();
      timer.recordSector();
      timer.recordSector();
      timer.recordSector();
      const lap = timer.completeLap();
      
      expect(lap?.sector1).not.toBeNull();
      expect(lap?.sector2).not.toBeNull();
      expect(lap?.sector3).not.toBeNull();
    });
  });

  describe('lap recording', () => {
    it('should start with no laps', () => {
      expect(timer.getLapCount()).toBe(0);
      expect(timer.getLaps()).toEqual([]);
    });

    it('should return null when completing without starting', () => {
      expect(timer.completeLap()).toBeNull();
    });

    it('should record a complete lap with all sectors', () => {
      timer.startLap();
      timer.recordSector();
      timer.recordSector();
      timer.recordSector();
      const lap = timer.completeLap();
      
      expect(lap).not.toBeNull();
      expect(lap?.lapNumber).toBe(1);
      expect(lap?.isValid).toBe(true);
      expect(timer.getLapCount()).toBe(1);
    });

    it('should auto-invalidate lap with missing sectors', () => {
      timer.startLap();
      // No sectors recorded
      const lap = timer.completeLap();
      
      expect(lap?.isValid).toBe(false);
      expect(lap?.sector1).toBeNull();
      expect(lap?.sector2).toBeNull();
      expect(lap?.sector3).toBeNull();
    });

    it('should auto-invalidate lap with partial sectors', () => {
      timer.startLap();
      timer.recordSector(); // Only S1
      const lap = timer.completeLap();
      
      expect(lap?.isValid).toBe(false);
      expect(lap?.sector1).not.toBeNull();
      expect(lap?.sector2).toBeNull();
      expect(lap?.sector3).toBeNull();
    });

    it('should track multiple laps', () => {
      timer.startLap();
      timer.recordSector();
      timer.recordSector();
      timer.recordSector();
      timer.completeLap();
      
      timer.startLap();
      timer.recordSector();
      timer.recordSector();
      timer.recordSector();
      timer.completeLap();
      
      expect(timer.getLapCount()).toBe(2);
      expect(timer.getLaps()[1].lapNumber).toBe(2);
    });
  });

  describe('getCurrentLapTime', () => {
    it('should return null when not running', () => {
      expect(timer.getCurrentLapTime()).toBeNull();
    });

    it('should return elapsed time when running', () => {
      timer.startLap();
      const time = timer.getCurrentLapTime();
      expect(time).not.toBeNull();
      expect(time).toBeGreaterThanOrEqual(0);
    });
  });

  describe('fastest lap', () => {
    it('should return null when no laps recorded', () => {
      expect(timer.getFastestLap()).toBeNull();
    });

    it('should return null when only invalid laps', () => {
      timer.startLap();
      timer.completeLap(false);
      
      expect(timer.getFastestLap()).toBeNull();
    });

    it('should return the fastest valid lap', () => {
      // We need to mock time to control lap durations
      const mockNow = vi.spyOn(Date, 'now');
      let time = 0;
      mockNow.mockImplementation(() => time);

      // Lap 1: 90000ms (1:30)
      time = 0;
      timer.startLap();
      time = 30000;
      timer.recordSector();
      time = 60000;
      timer.recordSector();
      time = 90000;
      timer.recordSector();
      timer.completeLap();

      // Lap 2: 85000ms (1:25) - faster
      time = 100000;
      timer.startLap();
      time = 128000;
      timer.recordSector();
      time = 156000;
      timer.recordSector();
      time = 185000;
      timer.recordSector();
      timer.completeLap();

      // Lap 3: 95000ms (1:35) - slower
      time = 200000;
      timer.startLap();
      time = 232000;
      timer.recordSector();
      time = 264000;
      timer.recordSector();
      time = 295000;
      timer.recordSector();
      timer.completeLap();

      const fastest = timer.getFastestLap();
      expect(fastest?.lapNumber).toBe(2);
      expect(fastest?.time).toBe(85000);

      mockNow.mockRestore();
    });
  });

  describe('average lap time', () => {
    it('should return 0 when no valid laps', () => {
      expect(timer.getAverageLapTime()).toBe(0);
    });

    it('should calculate average of valid laps', () => {
      const mockNow = vi.spyOn(Date, 'now');
      let time = 0;
      mockNow.mockImplementation(() => time);

      // Lap 1: 80000ms
      time = 0;
      timer.startLap();
      time = 25000;
      timer.recordSector();
      time = 50000;
      timer.recordSector();
      time = 80000;
      timer.recordSector();
      timer.completeLap();

      // Lap 2: 100000ms
      time = 100000;
      timer.startLap();
      time = 133000;
      timer.recordSector();
      time = 166000;
      timer.recordSector();
      time = 200000;
      timer.recordSector();
      timer.completeLap();

      // Average should be (80000 + 100000) / 2 = 90000
      expect(timer.getAverageLapTime()).toBe(90000);

      mockNow.mockRestore();
    });

    it('should exclude invalid laps from average', () => {
      const mockNow = vi.spyOn(Date, 'now');
      let time = 0;
      mockNow.mockImplementation(() => time);

      // Valid lap: 80000ms
      time = 0;
      timer.startLap();
      time = 25000;
      timer.recordSector();
      time = 50000;
      timer.recordSector();
      time = 80000;
      timer.recordSector();
      timer.completeLap();

      // Invalid lap (no sectors): would be 50000ms but invalid
      time = 100000;
      timer.startLap();
      time = 150000;
      timer.completeLap(); // No sectors = invalid

      // Average should only include the valid lap
      expect(timer.getAverageLapTime()).toBe(80000);

      mockNow.mockRestore();
    });
  });

  describe('reset', () => {
    it('should clear all laps', () => {
      timer.startLap();
      timer.recordSector();
      timer.recordSector();
      timer.recordSector();
      timer.completeLap();
      timer.reset();
      
      expect(timer.getLapCount()).toBe(0);
      expect(timer.isTimerRunning()).toBe(false);
    });

    it('should stop running timer', () => {
      timer.startLap();
      expect(timer.isTimerRunning()).toBe(true);
      
      timer.reset();
      expect(timer.isTimerRunning()).toBe(false);
    });
  });
});
