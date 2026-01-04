import type { InputState } from '@input/types';
import type { CarState } from './types';
import type { RacingLinePoint, RacingLineType } from '@tracks/types';
import { DEFAULT_INPUT_STATE } from '@input/types';

/**
 * AI driver that generates input based on racing line.
 * Uses same input format as player, so physics behaves identically.
 * Supports multiple racing line strategies for different situations.
 */
export class AIDriver {
  private skillLevel: number; // 0-1, affects precision and reaction
  private aggressiveness: number; // 0-1, affects braking points and throttle
  private racingLine: RacingLinePoint[] = [];
  private racingLines: Record<RacingLineType, RacingLinePoint[]> | null = null;
  private currentLineType: RacingLineType = 'optimal';
  private maxSpeed: number;
  
  // Overtaking state
  private overtakeCommitTime: number = 0; // Frames committed to current overtake line
  private readonly OVERTAKE_COMMIT_DURATION = 60; // Stay committed for ~1 second at 60fps
  
  // Mistake states - only one active at a time
  private mistakeType: 'none' | 'understeer' | 'oversteer' | 'lockup' | 'wheelspin' = 'none';
  private mistakeFrames: number = 0; // Frames remaining in current mistake
  private mistakeSeverity: number = 0; // 0-1, intensity of the mistake

  constructor(skillLevel: number = 0.8, aggressiveness: number = 0.7, maxSpeed: number = 500) {
    this.skillLevel = Math.max(0, Math.min(1, skillLevel));
    this.aggressiveness = Math.max(0, Math.min(1, aggressiveness));
    this.maxSpeed = maxSpeed;
  }

  /**
   * Set the racing line for this AI to follow (single line, backward compat).
   */
  setRacingLine(racingLine: RacingLinePoint[]): void {
    this.racingLine = racingLine;
  }

  /**
   * Set all racing line variants. AI will use currentLineType to pick which one.
   */
  setRacingLines(lines: Record<RacingLineType, RacingLinePoint[]>): void {
    this.racingLines = lines;
    this.racingLine = lines[this.currentLineType];
  }

  /**
   * Switch to a different racing line strategy.
   */
  setLineType(lineType: RacingLineType): void {
    this.currentLineType = lineType;
    if (this.racingLines) {
      this.racingLine = this.racingLines[lineType];
    }
  }

  /**
   * Get current racing line type.
   */
  getLineType(): RacingLineType {
    return this.currentLineType;
  }

  /**
   * Generate input state based on car position and racing line.
   * Returns the same InputState format that the player keyboard generates.
   * Includes realistic AI mistakes based on skill level.
   */
  generateInput(car: CarState): InputState {
    if (this.racingLine.length === 0) {
      return { ...DEFAULT_INPUT_STATE };
    }

    // Start with default (all false)
    const input: InputState = { ...DEFAULT_INPUT_STATE };
    
    // === MISTAKE: Occasional "moment of hesitation" - no input at all ===
    // Lower skill = more frequent hesitation
    if (Math.random() > this.skillLevel * 1.1) {
      if (Math.random() < 0.15) {
        return input; // Return no input this frame
      }
    }
    
    // Find look-ahead point on racing line
    const lookAheadPoint = this.findLookAheadPoint(car);
    
    // === UPDATE MISTAKE STATE ===
    this.updateMistakes(car, lookAheadPoint);
    
    // Calculate steering to target
    const targetAngle = Math.atan2(
      lookAheadPoint.position.y - car.y,
      lookAheadPoint.position.x - car.x
    );
    
    let angleDiff = targetAngle - car.rotation;
    // Normalize to -PI to PI
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
    
    // === APPLY ACTIVE MISTAKE TO STEERING ===
    if (this.mistakeFrames > 0) {
      switch (this.mistakeType) {
        case 'understeer':
          // Car doesn't turn enough - reduced steering response, drifts wide
          const understeerEffect = 0.05 + (0.35 * (1 - this.mistakeSeverity));
          angleDiff *= understeerEffect;
          break;
          
        case 'oversteer':
          // Rear loses grip - car slides, reduced control, wobbles
          // AI tries to correct but over/under-corrects randomly
          const oversteerControl = 0.2 + (0.3 * (1 - this.mistakeSeverity)); // 20-50% control
          const wobble = (Math.random() - 0.5) * this.mistakeSeverity * 0.8; // Random wobble
          angleDiff = angleDiff * oversteerControl + wobble;
          // Lift off throttle in panic
          input.accelerate = false;
          break;
          
        case 'lockup':
          // Wheels locked under braking - car slides straight, minimal steering
          angleDiff *= 0.1; // Almost no steering response
          input.brake = true; // Stuck on brakes
          input.accelerate = false;
          break;
          
        case 'wheelspin':
          // Too much throttle on exit - loss of rear traction, car slides
          // Reduced control + wobble as rear steps out
          const wheelspinControl = 0.25 + (0.35 * (1 - this.mistakeSeverity));
          const slideWobble = (Math.random() - 0.5) * this.mistakeSeverity * 0.6;
          angleDiff = angleDiff * wheelspinControl + slideWobble;
          input.accelerate = true; // Still on throttle (causing the problem)
          break;
      }
      this.mistakeFrames--;
      if (this.mistakeFrames <= 0) {
        this.mistakeType = 'none';
      }
    }
    
    // === MISTAKE: Delayed reaction - sometimes use stale angle ===
    if (Math.random() > this.skillLevel && this.mistakeType === 'none') {
      angleDiff *= 0.7; // Under-correct
    }
    
    // Steering threshold - steer if angle difference is significant
    const steerThreshold = 0.05 + (1 - this.skillLevel) * 0.1; // Better skill = tighter threshold
    
    if (angleDiff < -steerThreshold) {
      input.steerLeft = true;
    } else if (angleDiff > steerThreshold) {
      input.steerRight = true;
    }
    
    // Throttle/brake based on upcoming corner speed
    const cornerSpeedFactor = this.calculateUpcomingCornerSpeed(car);
    const currentSpeedRatio = car.speed / this.maxSpeed;
    
    // Target speed based on corner and aggressiveness
    let targetSpeedRatio = cornerSpeedFactor * (0.5 + this.aggressiveness * 0.5);
    
    // Brake if going too fast for upcoming corner (tight threshold for responsive braking)
    if (currentSpeedRatio > targetSpeedRatio + 0.03) {
      input.brake = true;
      input.accelerate = false;
      
      // === MISTAKE: Lock up brakes (brake but also accelerate briefly) ===
      if (Math.random() > this.skillLevel * 1.1) {
        if (Math.random() < 0.2) {
          input.accelerate = true; // Panic - hit both pedals
        }
      }
    } else {
      // Accelerate based on aggressiveness
      const shouldAccelerate = Math.random() < (0.7 + this.aggressiveness * 0.3);
      input.accelerate = shouldAccelerate;
      input.brake = false;
      
      // === MISTAKE: Wheel spin - too eager on throttle out of corner ===
      if (car.speed < this.maxSpeed * 0.4 && Math.random() > this.skillLevel) {
        if (Math.random() < 0.25) {
          input.accelerate = false; // Lift to correct wheel spin
        }
      }
    }
    
    // Lift off throttle when steering hard (traction management)
    if ((input.steerLeft || input.steerRight) && car.speed > this.maxSpeed * 0.6) {
      if (Math.random() > this.aggressiveness) {
        input.accelerate = false;
      }
    }
    
    // === MISTAKE: Random snap oversteer / loss of control ===
    // More likely at high speed in corners
    if (car.speed > this.maxSpeed * 0.7 && (input.steerLeft || input.steerRight)) {
      if (Math.random() > this.skillLevel * 1.2) {
        if (Math.random() < 0.1) {
          // Snap oversteer - loss of rear
          input.steerLeft = !input.steerLeft;
          input.steerRight = !input.steerRight;
          input.accelerate = false;
          input.brake = true;
        }
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
    // Balanced look-ahead that works for various track types
    const baseLookAhead = 10;
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
    // Look further ahead at higher speeds to brake in time
    const speedRatio = car.speed / this.maxSpeed;
    const lookAhead = 25 + Math.floor(speedRatio * 15); // 25-40 points ahead
    
    let minSpeedFactor = 1;
    
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

  /**
   * Update racing line based on nearby cars for overtaking/defending.
   * Call this each frame with the AI's car state and all other car states.
   * 
   * @param myCar This AI's car state
   * @param otherCars Array of other car states (excluding this car)
   */
  updateOvertaking(myCar: CarState, otherCars: CarState[]): void {
    if (!this.racingLines) return;
    
    // If we're committed to an overtake, count down and stay on that line
    if (this.overtakeCommitTime > 0) {
      this.overtakeCommitTime--;
      return; // Stay on current overtake line
    }
    
    // Find if there's a car ahead that we need to pass
    const carAhead = this.findCarAhead(myCar, otherCars);
    
    if (!carAhead) {
      // No car ahead - return to optimal line for speed
      if (this.currentLineType !== 'optimal') {
        this.setLineType('optimal');
      }
      return;
    }
    
    // Car ahead detected! Check if we're faster (would catch them)
    const closingSpeed = myCar.speed - carAhead.speed;
    const shouldOvertake = closingSpeed > 5 || myCar.speed > carAhead.speed * 1.05;
    
    if (!shouldOvertake) {
      // Not faster, just follow
      return;
    }
    
    // We're faster - commit to an overtake!
    // More aggressive drivers commit longer
    this.overtakeCommitTime = Math.floor(this.OVERTAKE_COMMIT_DURATION * (0.5 + this.aggressiveness * 0.5));
    
    // Determine which side to pass on based on upcoming corner
    const passingSide = this.determinePassingSide(myCar, carAhead);
    
    if (passingSide === 'outside') {
      // Go wide - overtaking line has wider entry
      this.setLineType('overtaking');
    } else {
      // Dive inside - defensive line hugs inside
      this.setLineType('defensive');
    }
  }

  /**
   * Find a car that's directly ahead of us within overtaking range.
   */
  private findCarAhead(myCar: CarState, otherCars: CarState[]): CarState | null {
    const overtakeRange = 120; // Distance to start considering overtake (increased)
    const minRange = 10; // Too close, already alongside
    
    // Direction we're facing
    const myDirX = Math.cos(myCar.rotation);
    const myDirY = Math.sin(myCar.rotation);
    
    let closestAhead: CarState | null = null;
    let closestDist = Infinity;
    
    for (const other of otherCars) {
      // Vector to other car
      const dx = other.x - myCar.x;
      const dy = other.y - myCar.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < minRange || distance > overtakeRange) {
        continue;
      }
      
      // Check if other car is ahead of us (dot product with our forward direction)
      const dotProduct = dx * myDirX + dy * myDirY;
      
      if (dotProduct > 0) {
        // Car is ahead
        // Check how much they're in our path (cross product for lateral offset)
        const crossProduct = Math.abs(dx * myDirY - dy * myDirX);
        
        // Only consider if they're roughly in our path (within ~50 units laterally)
        if (crossProduct < 50 && distance < closestDist) {
          closestDist = distance;
          closestAhead = other;
        }
      }
    }
    
    return closestAhead;
  }

  /**
   * Update mistake state - triggers various driving errors.
   * Mistakes: understeer, oversteer, lock-up, wheelspin
   */
  private updateMistakes(car: CarState, lookAheadPoint: RacingLinePoint): void {
    // Already in a mistake, let it play out
    if (this.mistakeFrames > 0) return;
    
    const speedRatio = car.speed / this.maxSpeed;
    const inCorner = lookAheadPoint.speedFactor < 0.92;
    const cornerTightness = 1 - lookAheadPoint.speedFactor;
    
    // Base chance - frequent mistakes, multiple times per lap
    // Increased to compensate for splitting across 4 mistake types
    const baseChance = 0.06 + 0.24 * Math.pow(1 - this.skillLevel, 1.2);
    
    // Different mistakes have different triggers
    let mistakeToTrigger: 'understeer' | 'oversteer' | 'lockup' | 'wheelspin' | null = null;
    let triggerChance = 0;
    
    // UNDERSTEER - most common in corners when going too fast
    if (inCorner && speedRatio > 0.4) {
      const understeerChance = baseChance * (0.6 + speedRatio) * (1 + cornerTightness * 3) * (0.8 + this.aggressiveness * 0.4);
      if (Math.random() < understeerChance) {
        mistakeToTrigger = 'understeer';
        triggerChance = understeerChance;
      }
    }
    
    // OVERSTEER - mid-corner or corner exit, more likely with high aggression
    if (inCorner && speedRatio > 0.5 && !mistakeToTrigger) {
      const oversteerChance = baseChance * 0.7 * (0.5 + speedRatio) * (1 + cornerTightness * 2) * (0.6 + this.aggressiveness * 0.8);
      if (Math.random() < oversteerChance) {
        mistakeToTrigger = 'oversteer';
        triggerChance = oversteerChance;
      }
    }
    
    // LOCK-UP - heavy braking zones (approaching tight corners at high speed)
    if (speedRatio > 0.6 && cornerTightness > 0.3 && !mistakeToTrigger) {
      const lockupChance = baseChance * 0.6 * speedRatio * (1 + cornerTightness * 2) * (0.7 + this.aggressiveness * 0.5);
      if (Math.random() < lockupChance) {
        mistakeToTrigger = 'lockup';
        triggerChance = lockupChance;
      }
    }
    
    // WHEELSPIN - corner exit, low speed, high throttle application
    if (inCorner && speedRatio < 0.5 && speedRatio > 0.15 && !mistakeToTrigger) {
      const wheelspinChance = baseChance * 0.5 * (1 - speedRatio) * (0.5 + this.aggressiveness * 1.0);
      if (Math.random() < wheelspinChance) {
        mistakeToTrigger = 'wheelspin';
        triggerChance = wheelspinChance;
      }
    }
    
    // Trigger the mistake
    if (mistakeToTrigger) {
      this.mistakeType = mistakeToTrigger;
      
      // Duration varies by mistake type
      switch (mistakeToTrigger) {
        case 'understeer':
          this.mistakeFrames = 40 + Math.floor(Math.random() * 50); // 0.7-1.5s
          break;
        case 'oversteer':
          this.mistakeFrames = 25 + Math.floor(Math.random() * 35); // 0.4-1s (quicker, more dramatic)
          break;
        case 'lockup':
          this.mistakeFrames = 20 + Math.floor(Math.random() * 30); // 0.3-0.8s
          break;
        case 'wheelspin':
          this.mistakeFrames = 15 + Math.floor(Math.random() * 25); // 0.25-0.7s (snap and recover)
          break;
      }
      
      // Severity based on skill and aggression
      const baseSeverity = 0.5 + Math.random() * 0.35;
      const skillFactor = 1 + (1 - this.skillLevel) * 0.3;
      const aggressionBonus = 1 + this.aggressiveness * 0.15;
      this.mistakeSeverity = Math.min(1.0, baseSeverity * skillFactor * aggressionBonus);
    }
  }

  /**
   * Determine which side to pass on based on upcoming corner direction.
   */
  private determinePassingSide(myCar: CarState, _carAhead: CarState): 'inside' | 'outside' {
    if (this.racingLine.length === 0) {
      return 'outside';
    }
    
    // Find our position on the racing line
    let closestIdx = 0;
    let minDist = Infinity;
    
    for (let i = 0; i < this.racingLine.length; i++) {
      const dx = this.racingLine[i].position.x - myCar.x;
      const dy = this.racingLine[i].position.y - myCar.y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        closestIdx = i;
      }
    }
    
    // Look ahead to find the direction of the next corner
    const lookAhead = 30;
    let totalAngleChange = 0;
    
    for (let i = 0; i < lookAhead; i++) {
      const idx1 = (closestIdx + i) % this.racingLine.length;
      const idx2 = (closestIdx + i + 1) % this.racingLine.length;
      const idx3 = (closestIdx + i + 2) % this.racingLine.length;
      
      const p1 = this.racingLine[idx1].position;
      const p2 = this.racingLine[idx2].position;
      const p3 = this.racingLine[idx3].position;
      
      const angle1 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
      
      let angleDiff = angle2 - angle1;
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
      
      totalAngleChange += angleDiff;
    }
    
    // Positive angle = turning left, negative = turning right
    // For a left turn: inside is left, outside is right
    // For a right turn: inside is right, outside is left
    
    // Aggressive drivers prefer inside (late braking, divebomb)
    // Less aggressive prefer outside (safer, better exit)
    if (this.aggressiveness > 0.6) {
      // Aggressive - go for the inside
      return 'inside';
    } else {
      // Cautious - go around outside
      return 'outside';
    }
  }
}
