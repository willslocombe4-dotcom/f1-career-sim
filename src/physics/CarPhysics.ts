/**
 * Car physics calculations.
 * Pure functions for arcade-style car movement.
 */

import type { CarState, CarConfig } from './types';
import type { InputState } from '@input/types';
import type { Point } from '@tracks/types';

/**
 * Apply acceleration or braking based on input.
 */
export function applyAcceleration(
  state: CarState,
  input: InputState,
  config: CarConfig,
  dt: number
): CarState {
  let speed = state.speed;

  if (input.accelerate) {
    speed += config.acceleration * dt;
  }

  if (input.brake) {
    speed -= config.braking * dt;
  }

  // Clamp speed
  speed = Math.max(0, Math.min(config.maxSpeed, speed));

  return { ...state, speed };
}

/**
 * Apply steering based on input.
 * Steering is reduced at high speeds for stability.
 */
export function applySteering(
  state: CarState,
  input: InputState,
  config: CarConfig,
  dt: number
): CarState {
  // Need minimum speed to turn
  if (state.speed < config.minTurnSpeed) {
    return state;
  }

  let steerDirection = 0;
  if (input.steerLeft) steerDirection -= 1;
  if (input.steerRight) steerDirection += 1;

  if (steerDirection === 0) {
    return state;
  }

  // Calculate turn rate based on speed
  // At low speed: full turn rate
  // At high speed: reduced turn rate
  const speedRatio = state.speed / config.maxSpeed;
  const turnMultiplier = 1 - (speedRatio * config.turnSpeedFalloff);
  const turnRate = config.turnSpeed * turnMultiplier;

  const newRotation = state.rotation + (steerDirection * turnRate * dt);

  // Check for drift conditions
  const isDrifting = speedRatio > config.driftThreshold && Math.abs(steerDirection) > 0;

  return {
    ...state,
    rotation: newRotation,
    drifting: isDrifting,
  };
}

/**
 * Apply drag (natural deceleration).
 */
export function applyDrag(
  state: CarState,
  config: CarConfig,
  dt: number
): CarState {
  if (state.speed <= 0) {
    return { ...state, speed: 0 };
  }

  const newSpeed = Math.max(0, state.speed - config.drag * dt);
  return { ...state, speed: newSpeed };
}

/**
 * Update velocity based on current speed and rotation.
 * Handles drift by blending forward velocity with slide.
 */
export function updateVelocity(
  state: CarState,
  config: CarConfig
): CarState {
  // Forward direction based on rotation
  const forwardX = Math.cos(state.rotation);
  const forwardY = Math.sin(state.rotation);

  // Target velocity (where the car wants to go)
  const targetVelX = forwardX * state.speed;
  const targetVelY = forwardY * state.speed;

  // If drifting, blend current velocity with target
  let newVelX: number;
  let newVelY: number;

  if (state.drifting) {
    // Drift: car slides, velocity lags behind rotation
    const driftBlend = 1 - config.driftFactor;
    newVelX = state.velocityX * config.driftFactor + targetVelX * driftBlend;
    newVelY = state.velocityY * config.driftFactor + targetVelY * driftBlend;
  } else {
    // Normal: velocity follows rotation with high grip
    const gripBlend = config.grip;
    newVelX = state.velocityX * (1 - gripBlend) + targetVelX * gripBlend;
    newVelY = state.velocityY * (1 - gripBlend) + targetVelY * gripBlend;
  }

  return {
    ...state,
    velocityX: newVelX,
    velocityY: newVelY,
  };
}

/**
 * Update position based on velocity.
 */
export function updatePosition(
  state: CarState,
  dt: number
): CarState {
  return {
    ...state,
    x: state.x + state.velocityX * dt,
    y: state.y + state.velocityY * dt,
  };
}

/**
 * Apply cornering speed limit.
 * If turning too fast for the current speed, scrub off speed (simulates tire grip limit).
 * This makes corners require actual braking.
 */
export function applyCorneringLimit(
  state: CarState,
  input: InputState,
  config: CarConfig,
  dt: number
): CarState {
  // Only apply if actually steering
  const isSteering = input.steerLeft || input.steerRight;
  if (!isSteering || state.speed < 20) {
    return state;
  }
  
  // Calculate how hard we're turning relative to speed
  const speedRatio = state.speed / config.maxSpeed;
  
  // Cornering force increases with speed squared
  // At high speed + hard steering = massive grip demand
  // If grip demand exceeds available grip, scrub speed
  
  // Grip available (0.95 default = very grippy)
  const availableGrip = config.grip;
  
  // Grip required: increases dramatically with speed while turning
  // speedRatio^2 because centripetal force = mv²/r
  const gripRequired = speedRatio * speedRatio * 1.2;
  
  // If we need more grip than we have, lose speed
  if (gripRequired > availableGrip) {
    const gripDeficit = gripRequired - availableGrip;
    // Speed loss proportional to how much we exceed grip
    // More aggressive: lose 300-600 units/sec when really pushing
    const speedLoss = gripDeficit * config.maxSpeed * 1.5 * dt;
    const newSpeed = state.speed - speedLoss;
    
    return {
      ...state,
      speed: Math.max(20, newSpeed), // Don't go below 20
    };
  }
  
  return state;
}

/**
 * Full physics update for one frame.
 * Combines all physics steps in the correct order.
 */
export function updateCarPhysics(
  state: CarState,
  input: InputState,
  config: CarConfig,
  dt: number
): CarState {
  // 1. Apply acceleration/braking
  let newState = applyAcceleration(state, input, config, dt);

  // 2. Apply steering
  newState = applySteering(newState, input, config, dt);

  // 3. Apply cornering speed limit (can't corner flat out at high speed)
  newState = applyCorneringLimit(newState, input, config, dt);

  // 4. Apply drag if not accelerating
  if (!input.accelerate) {
    newState = applyDrag(newState, config, dt);
  }

  // 5. Update velocity based on speed and rotation
  newState = updateVelocity(newState, config);

  // 6. Update position
  newState = updatePosition(newState, dt);

  return newState;
}

/**
 * Normalize angle to -PI to PI range.
 */
export function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

// ============================================
// Track Boundary Collision
// ============================================

/**
 * Check if a point is inside a polygon using ray casting algorithm.
 */
export function isPointInPolygon(x: number, y: number, polygon: Point[]): boolean {
  if (polygon.length < 3) return false;
  
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Distance-based track boundary check.
 * This approach works better for complex track shapes with tight chicanes.
 * 
 * @param x Car X position
 * @param y Car Y position  
 * @param trackPath Track centerline points with width info
 * @returns Object with isOnTrack status, distance from centerline, and track width at that point
 */
export function checkTrackBoundaryDistance(
  x: number,
  y: number,
  trackPath: Array<{ position: Point; width: number }>
): { isOnTrack: boolean; distanceFromCenter: number; trackWidthAtPoint: number; nearestPointIndex: number } {
  if (trackPath.length === 0) {
    return { isOnTrack: true, distanceFromCenter: 0, trackWidthAtPoint: 0, nearestPointIndex: 0 };
  }

  // Find the nearest point on the track centerline
  let nearestDist = Infinity;
  let nearestIdx = 0;

  for (let i = 0; i < trackPath.length; i++) {
    const p = trackPath[i].position;
    const dist = (x - p.x) ** 2 + (y - p.y) ** 2;
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestIdx = i;
    }
  }

  const actualDist = Math.sqrt(nearestDist);
  const trackWidth = trackPath[nearestIdx].width;
  const halfWidth = trackWidth / 2;

  return {
    isOnTrack: actualDist <= halfWidth,
    distanceFromCenter: actualDist,
    trackWidthAtPoint: trackWidth,
    nearestPointIndex: nearestIdx,
  };
}

/**
 * Find the nearest point on a polygon boundary to a given point.
 */
export function findNearestPointOnBoundary(
  x: number,
  y: number,
  polygon: Point[]
): Point {
  if (polygon.length === 0) return { x, y };
  
  let nearestPoint: Point = polygon[0];
  let nearestDist = Infinity;

  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % n];

    // Find nearest point on line segment p1-p2
    const nearest = nearestPointOnSegment(x, y, p1, p2);
    const dist = Math.sqrt((x - nearest.x) ** 2 + (y - nearest.y) ** 2);

    if (dist < nearestDist) {
      nearestDist = dist;
      nearestPoint = nearest;
    }
  }

  return nearestPoint;
}

/**
 * Find the nearest point on a line segment to a given point.
 */
function nearestPointOnSegment(
  px: number,
  py: number,
  p1: Point,
  p2: Point
): Point {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    return p1; // Segment is a point
  }

  // Project point onto line, clamped to segment
  let t = ((px - p1.x) * dx + (py - p1.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));

  return {
    x: p1.x + t * dx,
    y: p1.y + t * dy,
  };
}

/**
 * Constrain a car to stay within track boundaries using polygon-based check.
 * If the car is outside, push it back to the nearest boundary point.
 * 
 * NOTE: This approach has issues with complex track shapes that have tight chicanes.
 * Use constrainToTrackByDistance for better results with complex tracks.
 */
export function constrainToTrack(
  state: CarState,
  outerBoundary: Point[],
  innerBoundary: Point[]
): CarState {
  // Check if inside outer boundary
  const insideOuter = isPointInPolygon(state.x, state.y, outerBoundary);
  
  if (!insideOuter) {
    // Outside outer boundary - push back in
    const nearest = findNearestPointOnBoundary(state.x, state.y, outerBoundary);
    return {
      ...state,
      x: nearest.x,
      y: nearest.y,
      // Reduce speed on collision
      speed: state.speed * 0.5,
      velocityX: state.velocityX * 0.5,
      velocityY: state.velocityY * 0.5,
    };
  }

  // Check if inside inner boundary (off track on the inside)
  if (innerBoundary.length > 0) {
    const insideInner = isPointInPolygon(state.x, state.y, innerBoundary);
    
    if (insideInner) {
      // Inside inner boundary - push back out
      const nearest = findNearestPointOnBoundary(state.x, state.y, innerBoundary);
      return {
        ...state,
        x: nearest.x,
        y: nearest.y,
        // Reduce speed on collision
        speed: state.speed * 0.5,
        velocityX: state.velocityX * 0.5,
        velocityY: state.velocityY * 0.5,
      };
    }
  }

  // Car is on track
  return state;
}

/**
 * Constrain a car to stay within track boundaries using distance-based check.
 * This approach works better for complex track shapes with tight chicanes.
 * 
 * @param state Current car state
 * @param trackPath Track centerline with position and width for each point
 * @returns Updated car state, constrained to track if necessary
 */
export function constrainToTrackByDistance(
  state: CarState,
  trackPath: Array<{ position: Point; width: number }>
): CarState {
  const check = checkTrackBoundaryDistance(state.x, state.y, trackPath);
  
  if (check.isOnTrack) {
    return state;
  }

  // Car is off track - find the direction back to the centerline
  const nearestPoint = trackPath[check.nearestPointIndex].position;
  const halfWidth = check.trackWidthAtPoint / 2;
  
  // Calculate direction from car to nearest centerline point
  const dx = nearestPoint.x - state.x;
  const dy = nearestPoint.y - state.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  if (dist === 0) {
    return state; // Already at centerline
  }

  // Move car to the edge of the track (half width from centerline)
  const dirX = dx / dist;
  const dirY = dy / dist;
  
  // Position car just inside the track edge
  const moveDistance = dist - halfWidth + 2; // +2 for small buffer inside track
  const newX = state.x + dirX * moveDistance;
  const newY = state.y + dirY * moveDistance;

  return {
    ...state,
    x: newX,
    y: newY,
    // Reduce speed on collision
    speed: state.speed * 0.5,
    velocityX: state.velocityX * 0.5,
    velocityY: state.velocityY * 0.5,
  };
}

// ============================================
// Car-to-Car Collision
// ============================================

/**
 * Check if two cars are colliding using oriented bounding box approximation.
 * Uses ellipse-based collision for simplicity (length/2 as semi-major, width/2 as semi-minor).
 */
export function checkCarCollision(
  car1: CarState,
  car1Config: CarConfig,
  car2: CarState,
  car2Config: CarConfig
): { colliding: boolean; overlap: number; normalX: number; normalY: number } {
  // Calculate distance between car centers
  const dx = car2.x - car1.x;
  const dy = car2.y - car1.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance === 0) {
    // Cars at same position, push apart in arbitrary direction
    return { colliding: true, overlap: 20, normalX: 1, normalY: 0 };
  }
  
  // Use average of length and width for collision radius (simplified)
  const radius1 = (car1Config.length + car1Config.width) / 4;
  const radius2 = (car2Config.length + car2Config.width) / 4;
  const minDistance = radius1 + radius2;
  
  if (distance >= minDistance) {
    return { colliding: false, overlap: 0, normalX: 0, normalY: 0 };
  }
  
  // Collision detected
  const overlap = minDistance - distance;
  const normalX = dx / distance;
  const normalY = dy / distance;
  
  return { colliding: true, overlap, normalX, normalY };
}

/**
 * Resolve collision between two cars by pushing them apart and adjusting velocities.
 * Returns updated states for both cars.
 */
export function resolveCarCollision(
  car1: CarState,
  car1Config: CarConfig,
  car2: CarState,
  car2Config: CarConfig
): { car1: CarState; car2: CarState } {
  const collision = checkCarCollision(car1, car1Config, car2, car2Config);
  
  if (!collision.colliding) {
    return { car1, car2 };
  }
  
  const { overlap, normalX, normalY } = collision;
  
  // Push cars apart (each moves half the overlap distance)
  const pushDistance = overlap / 2 + 1; // +1 for small buffer
  
  const new1X = car1.x - normalX * pushDistance;
  const new1Y = car1.y - normalY * pushDistance;
  const new2X = car2.x + normalX * pushDistance;
  const new2Y = car2.y + normalY * pushDistance;
  
  // Calculate relative velocity along collision normal
  const relVelX = car2.velocityX - car1.velocityX;
  const relVelY = car2.velocityY - car1.velocityY;
  const relVelNormal = relVelX * normalX + relVelY * normalY;
  
  // Only resolve if cars are moving toward each other
  if (relVelNormal > 0) {
    return { car1, car2 };
  }
  
  // Simple elastic-ish collision (arcade style)
  // Transfer some velocity along collision normal
  const restitution = 0.3; // Bounciness (0 = no bounce, 1 = full bounce)
  const impulse = -(1 + restitution) * relVelNormal / 2;
  
  const impulseX = impulse * normalX;
  const impulseY = impulse * normalY;
  
  // Apply impulse to velocities
  const new1VelX = car1.velocityX - impulseX;
  const new1VelY = car1.velocityY - impulseY;
  const new2VelX = car2.velocityX + impulseX;
  const new2VelY = car2.velocityY + impulseY;
  
  // Recalculate speeds from new velocities
  const new1Speed = Math.sqrt(new1VelX * new1VelX + new1VelY * new1VelY);
  const new2Speed = Math.sqrt(new2VelX * new2VelX + new2VelY * new2VelY);
  
  // Cap speeds to max
  const capped1Speed = Math.min(new1Speed, car1Config.maxSpeed);
  const capped2Speed = Math.min(new2Speed, car2Config.maxSpeed);
  
  // Scale velocities if speed was capped
  const scale1 = new1Speed > 0 ? capped1Speed / new1Speed : 1;
  const scale2 = new2Speed > 0 ? capped2Speed / new2Speed : 1;
  
  return {
    car1: {
      ...car1,
      x: new1X,
      y: new1Y,
      velocityX: new1VelX * scale1,
      velocityY: new1VelY * scale1,
      speed: capped1Speed,
    },
    car2: {
      ...car2,
      x: new2X,
      y: new2Y,
      velocityX: new2VelX * scale2,
      velocityY: new2VelY * scale2,
      speed: capped2Speed,
    },
  };
}

/**
 * Resolve all car-to-car collisions in a list of cars.
 * Modifies states in place for efficiency.
 */
export function resolveAllCarCollisions(
  carStates: Map<string, CarState>,
  carConfigs: Map<string, CarConfig>,
  defaultConfig: CarConfig
): void {
  const carIds = Array.from(carStates.keys());
  const n = carIds.length;
  
  // Check all pairs
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const id1 = carIds[i];
      const id2 = carIds[j];
      
      const car1 = carStates.get(id1)!;
      const car2 = carStates.get(id2)!;
      const config1 = carConfigs.get(id1) ?? defaultConfig;
      const config2 = carConfigs.get(id2) ?? defaultConfig;
      
      const result = resolveCarCollision(car1, config1, car2, config2);
      
      // Update states if collision occurred
      if (result.car1 !== car1) {
        carStates.set(id1, result.car1);
      }
      if (result.car2 !== car2) {
        carStates.set(id2, result.car2);
      }
    }
  }
}
