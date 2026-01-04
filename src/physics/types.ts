/**
 * Car physics type definitions.
 * Defines car state, configuration, and physics constants.
 */

// ============================================
// Car State Types
// ============================================

/** Complete state of a car for physics simulation */
export interface CarState {
  /** X position in world coordinates */
  x: number;
  /** Y position in world coordinates */
  y: number;
  /** Rotation in radians (0 = facing right) */
  rotation: number;
  /** X component of velocity */
  velocityX: number;
  /** Y component of velocity */
  velocityY: number;
  /** Angular velocity (radians per second) */
  angularVelocity: number;
  /** Current speed (magnitude of velocity) */
  speed: number;
  /** Whether the car is currently drifting */
  drifting: boolean;
}

/** Create a new car state at a position */
export function createCarState(x: number, y: number, rotation: number = 0): CarState {
  return {
    x,
    y,
    rotation,
    velocityX: 0,
    velocityY: 0,
    angularVelocity: 0,
    speed: 0,
    drifting: false,
  };
}

// ============================================
// Car Configuration Types
// ============================================

/** Configuration for car physics behavior */
export interface CarConfig {
  /** Maximum speed in units per second */
  maxSpeed: number;
  /** Acceleration rate in units per second squared */
  acceleration: number;
  /** Braking rate in units per second squared */
  braking: number;
  /** Natural deceleration (drag) when not accelerating */
  drag: number;
  /** Turn speed in radians per second at low speed */
  turnSpeed: number;
  /** How much turn speed decreases at high speed (0-1) */
  turnSpeedFalloff: number;
  /** Minimum speed to allow turning */
  minTurnSpeed: number;
  /** Grip level (0-1, affects drift threshold) */
  grip: number;
  /** Speed threshold for drift to start (as fraction of max speed) */
  driftThreshold: number;
  /** How quickly the car slides when drifting */
  driftFactor: number;
  /** Car length (front to back) for collision */
  length: number;
  /** Car width (side to side) for collision */
  width: number;
}

/** Default arcade-style car configuration */
export const DEFAULT_CAR_CONFIG: CarConfig = {
  maxSpeed: 360,           // 2x speed for faster racing
  acceleration: 240,       // 2x acceleration to match
  braking: 400,            // 2x braking to match
  drag: 60,                // 2x drag to match
  turnSpeed: 4.5,          // Faster turning for high speed (was 3.0)
  turnSpeedFalloff: 0.2,   // Steering stays responsive at speed (was 0.4)
  minTurnSpeed: 5,         // Low threshold to turn
  grip: 0.95,              // Higher grip for better control (was 0.85)
  driftThreshold: 0.85,    // Higher threshold before drift (was 0.7)
  driftFactor: 0.08,       // Less slidey when drifting (was 0.15)
  length: 40,              // Car length for collision
  width: 20,               // Car width for collision
};

// ============================================
// Track Collision Types
// ============================================

/** Result of a track boundary check */
export interface BoundaryCheckResult {
  /** Whether the car is on the track */
  onTrack: boolean;
  /** If off track, the nearest point on the track boundary */
  nearestBoundaryPoint?: { x: number; y: number };
  /** Distance to nearest boundary (negative if outside) */
  distanceToBoundary: number;
}
