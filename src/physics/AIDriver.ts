import type { InputState } from '@input/types';
import type { CarState } from './types';
import type { RacingLinePoint } from '@tracks/types';
import { DEFAULT_INPUT_STATE } from '@input/types';

/**
 * AI driver that generates input based on racing line.
 * Uses same input format as player, so physics behaves identically.
 */
export class AIDriver {
  private skillLevel: number; // 0-1, affects precision and reaction
  private aggressiveness: number; // 0-1, affects braking points and throttle
  private racingLine: RacingLinePoint[] = [];
  private maxSpeed: number;

  constructor(skillLevel: number = 0.8, aggressiveness: number = 0.7, maxSpeed: number = 500) {
    this.skillLevel = Math.max(0, Math.min(1, skillLevel));
    this.aggressiveness = Math.max(0, Math.min(1, aggressiveness));
    this.maxSpeed = maxSpeed;
  }

  /**
   * Set the racing line for this AI to follow.
   */
  setRacingLine(racingLine: RacingLinePoint[]): void {
    this.racingLine = racingLine;
  }

  /**
   * Generate input state based on car position and racing line.
   * Returns the same InputState format that the player keyboard generates.
   */
  generateInput(car: CarState): InputState {
    if (this.racingLine.length === 0) {
      return { ...DEFAULT_INPUT_STATE };
    }

    // Start with default (all false)
    const input: InputState = { ...DEFAULT_INPUT_STATE };
    
    // Find look-ahead point on racing line
    const lookAheadPoint = this.findLookAheadPoint(car);
    
    // Calculate steering to target
    const targetAngle = Math.atan2(
      lookAheadPoint.position.y - car.y,
      lookAheadPoint.position.x - car.x
    );
    
    let angleDiff = targetAngle - car.rotation;
    // Normalize to -PI to PI
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
    
    // Steering threshold - steer if angle difference is significant
    const steerThreshold = 0.05 + (1 - this.skillLevel) * 0.1; // Better skill = tighter threshold
    
    if (angleDiff < -steerThreshold) {
      input.steerLeft = true;
    } else if (angleDiff > steerThreshold) {
      input.steerRight = true;
    }
    
    // Add imperfection for low skill - occasionally steer wrong or miss corrections
    if (Math.random() > this.skillLevel * 1.2) {
      // Randomly flip or remove steering input
      if (Math.random() > 0.5) {
        const temp = input.steerLeft;
        input.steerLeft = input.steerRight;
        input.steerRight = temp;
      }
    }
    
    // Throttle/brake based on upcoming corner speed
    const cornerSpeedFactor = this.calculateUpcomingCornerSpeed(car);
    const currentSpeedRatio = car.speed / this.maxSpeed;
    
    // Target speed based on corner and aggressiveness
    const targetSpeedRatio = cornerSpeedFactor * (0.5 + this.aggressiveness * 0.5);
    
    // Brake if going too fast for upcoming corner
    if (currentSpeedRatio > targetSpeedRatio + 0.1) {
      input.brake = true;
      input.accelerate = false;
    } else {
      // Accelerate based on aggressiveness
      // More aggressive drivers always accelerate, cautious ones lift off sometimes
      const shouldAccelerate = Math.random() < (0.7 + this.aggressiveness * 0.3);
      input.accelerate = shouldAccelerate;
      input.brake = false;
    }
    
    // Lift off throttle when steering hard (traction management)
    if ((input.steerLeft || input.steerRight) && car.speed > this.maxSpeed * 0.6) {
      if (Math.random() > this.aggressiveness) {
        input.accelerate = false;
      }
    }
    
    return input;
  }

  private findLookAheadPoint(car: CarState): RacingLinePoint {
    // Find closest point first
    let closestIdx = 0;
    let minDist = Infinity;
    
    for (let i = 0; i < this.racingLine.length; i++) {
      const dx = this.racingLine[i].position.x - car.x;
      const dy = this.racingLine[i].position.y - car.y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        closestIdx = i;
      }
    }
    
    // Look ahead based on speed (faster = look further ahead)
    const baseLookAhead = 8;
    const speedBonus = Math.floor(car.speed / 40) * 2;
    const lookAheadDistance = baseLookAhead + speedBonus;
    const lookAheadIdx = (closestIdx + lookAheadDistance) % this.racingLine.length;
    
    return this.racingLine[lookAheadIdx];
  }

  private calculateUpcomingCornerSpeed(car: CarState): number {
    // Find closest point
    let closestIdx = 0;
    let minDist = Infinity;
    
    for (let i = 0; i < this.racingLine.length; i++) {
      const dx = this.racingLine[i].position.x - car.x;
      const dy = this.racingLine[i].position.y - car.y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        closestIdx = i;
      }
    }
    
    // Look ahead and find minimum speed factor (tightest upcoming corner)
    let minSpeedFactor = 1;
    const lookAhead = 25; // Check next ~25 points
    
    for (let i = 0; i < lookAhead; i++) {
      const idx = (closestIdx + i) % this.racingLine.length;
      minSpeedFactor = Math.min(minSpeedFactor, this.racingLine[idx].speedFactor);
    }
    
    return minSpeedFactor;
  }

  /** Get current skill level */
  getSkillLevel(): number {
    return this.skillLevel;
  }

  /** Adjust skill level at runtime */
  setSkillLevel(level: number): void {
    this.skillLevel = Math.max(0, Math.min(1, level));
  }

  /** Adjust aggressiveness at runtime */
  setAggressiveness(level: number): void {
    this.aggressiveness = Math.max(0, Math.min(1, level));
  }
}
