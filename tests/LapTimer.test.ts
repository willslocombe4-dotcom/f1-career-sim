import { describe, it, expect, beforeEach } from 'vitest';
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
  });

  describe('lap recording', () => {
    it('should start with no laps', () => {
      expect(timer.getLapCount()).toBe(0);
      expect(timer.getLaps()).toEqual([]);
    });

    it('should record a lap', () => {
      timer.startLap();
      const lap = timer.completeLap();
      
      expect(lap).not.toBeNull();
      expect(lap?.lapNumber).toBe(1);
      expect(timer.getLapCount()).toBe(1);
    });

    it('should track multiple laps', () => {
      timer.startLap();
      timer.completeLap();
      timer.startLap();
      timer.completeLap();
      
      expect(timer.getLapCount()).toBe(2);
    });
  });

  describe('fastest lap', () => {
    it('should return null when no laps recorded', () => {
      expect(timer.getFastestLap()).toBeNull();
    });

    it('should ignore invalid laps', () => {
      timer.startLap();
      timer.completeLap(false); // invalid lap
      
      expect(timer.getFastestLap()).toBeNull();
    });
  });

  describe('average lap time', () => {
    it('should return 0 when no valid laps', () => {
      expect(timer.getAverageLapTime()).toBe(0);
    });
  });

  describe('reset', () => {
    it('should clear all laps', () => {
      timer.startLap();
      timer.completeLap();
      timer.reset();
      
      expect(timer.getLapCount()).toBe(0);
    });
  });
});
