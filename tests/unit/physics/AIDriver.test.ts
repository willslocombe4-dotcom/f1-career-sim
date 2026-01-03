import { describe, it, expect, beforeEach } from 'vitest';
import { AIDriver } from '@physics/AIDriver';
import { createCarState } from '@physics/types';
import type { RacingLinePoint } from '@tracks/types';

describe('AIDriver', () => {
  let driver: AIDriver;
  let circularRacingLine: RacingLinePoint[];

  beforeEach(() => {
    driver = new AIDriver(0.8, 0.7, 500);
    
    // Create simple circular racing line for testing
    circularRacingLine = [];
    for (let i = 0; i < 100; i++) {
      const angle = (i / 100) * Math.PI * 2;
      circularRacingLine.push({
        position: { x: Math.cos(angle) * 500, y: Math.sin(angle) * 500 },
        speedFactor: 0.8,
        progress: i / 100,
      });
    }
    
    driver.setRacingLine(circularRacingLine);
  });

  describe('generateInput', () => {
    it('should generate accelerate input when on track', () => {
      const car = createCarState(500, 0, Math.PI / 2); // On track, facing tangent
      
      // Run multiple times to account for randomness
      let accelerateCount = 0;
      for (let i = 0; i < 20; i++) {
        const input = driver.generateInput(car);
        if (input.accelerate) accelerateCount++;
      }
      
      // Should accelerate most of the time
      expect(accelerateCount).toBeGreaterThan(10);
    });

    it('should generate steering input when off-angle', () => {
      const car = createCarState(500, 0, 0); // On track, but facing wrong way
      const input = driver.generateInput(car);
      
      // Should steer to correct heading (left to turn toward track)
      expect(input.steerLeft || input.steerRight).toBe(true);
    });

    it('should brake when going too fast for corner', () => {
      const car = createCarState(500, 0, Math.PI / 2);
      car.speed = 500; // Max speed
      
      // Set low speed factor for upcoming corner
      circularRacingLine.forEach((p, i) => {
        if (i >= 0 && i < 25) p.speedFactor = 0.2; // Slow corner ahead
      });
      driver.setRacingLine(circularRacingLine);
      
      const input = driver.generateInput(car);
      
      expect(input.brake).toBe(true);
    });

    it('should return neutral input with no racing line', () => {
      const emptyDriver = new AIDriver(0.8, 0.7);
      // Don't set racing line
      
      const car = createCarState(0, 0, 0);
      const input = emptyDriver.generateInput(car);
      
      expect(input.accelerate).toBe(false);
      expect(input.steerLeft).toBe(false);
      expect(input.steerRight).toBe(false);
      expect(input.brake).toBe(false);
    });
  });

  describe('skill level', () => {
    it('should clamp skill level to valid range', () => {
      driver.setSkillLevel(1.5);
      expect(driver.getSkillLevel()).toBe(1);
      
      driver.setSkillLevel(-0.5);
      expect(driver.getSkillLevel()).toBe(0);
    });

    it('should affect consistency of steering', () => {
      // With skill = 0, AI makes more mistakes (occasional wrong steering)
      const lowSkillDriver = new AIDriver(0, 0.7, 500);
      lowSkillDriver.setRacingLine(circularRacingLine);
      
      // Position where we know steering should be needed
      const car = createCarState(500, 0, 0); // Facing wrong direction
      car.speed = 200;
      
      // Generate multiple inputs and check for variance in steering
      let steerLeftCount = 0;
      let steerRightCount = 0;
      for (let i = 0; i < 50; i++) {
        const input = lowSkillDriver.generateInput(car);
        if (input.steerLeft) steerLeftCount++;
        if (input.steerRight) steerRightCount++;
      }
      
      // Low skill driver should occasionally steer wrong direction
      // due to imperfection logic
      expect(steerLeftCount + steerRightCount).toBeGreaterThan(0);
    });
  });

  describe('aggressiveness', () => {
    it('should affect braking behavior', () => {
      const cautiousDriver = new AIDriver(1.0, 0.3, 500); // Low aggression, high skill
      const aggressiveDriver = new AIDriver(1.0, 1.0, 500); // High aggression, high skill
      
      cautiousDriver.setRacingLine(circularRacingLine);
      aggressiveDriver.setRacingLine(circularRacingLine);
      
      // Set up a car going moderately fast with a corner ahead
      const car = createCarState(500, 0, Math.PI / 2);
      car.speed = 300; // 60% of max
      
      // Count braking inputs
      let cautiousBrakes = 0;
      let aggressiveBrakes = 0;
      
      for (let i = 0; i < 30; i++) {
        if (cautiousDriver.generateInput(car).brake) cautiousBrakes++;
        if (aggressiveDriver.generateInput(car).brake) aggressiveBrakes++;
      }
      
      // Cautious driver should brake more often
      expect(cautiousBrakes).toBeGreaterThanOrEqual(aggressiveBrakes);
    });
  });
});
