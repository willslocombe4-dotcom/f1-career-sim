import { describe, it, expect } from 'vitest';
import type { CarState } from '@physics/types';
import { DEFAULT_CAR_CONFIG, createCarState } from '@physics/types';
import type { InputState } from '@input/types';
import { DEFAULT_INPUT_STATE } from '@input/types';
import {
  isPointInPolygon,
  findNearestPointOnBoundary,
  constrainToTrack,
  checkTrackBoundaryDistance,
  applyAcceleration,
  applySteering,
  applyDrag,
  updateCarPhysics,
} from '@physics/CarPhysics';
import type { Point } from '@tracks/types';
import { TrackBuilder } from '@tracks/TrackBuilder';
import { defaultTrackLoader } from '@tracks/TrackLoader';

describe('Car Physics Types', () => {
  it('should define CarState with position, velocity, and rotation', () => {
    const state: CarState = {
      x: 0,
      y: 0,
      rotation: 0,
      velocityX: 0,
      velocityY: 0,
      angularVelocity: 0,
      speed: 0,
      drifting: false,
    };
    expect(state.x).toBe(0);
  });

  it('should have default car config', () => {
    expect(DEFAULT_CAR_CONFIG.maxSpeed).toBeGreaterThan(0);
    expect(DEFAULT_CAR_CONFIG.acceleration).toBeGreaterThan(0);
    expect(DEFAULT_CAR_CONFIG.braking).toBeGreaterThan(0);
    expect(DEFAULT_CAR_CONFIG.turnSpeed).toBeGreaterThan(0);
  });

  it('should create car state at position', () => {
    const state = createCarState(100, 200, Math.PI / 2);
    expect(state.x).toBe(100);
    expect(state.y).toBe(200);
    expect(state.rotation).toBe(Math.PI / 2);
    expect(state.speed).toBe(0);
  });
});

describe('CarPhysics', () => {
  const dt = 1 / 60; // 60 FPS

  describe('applyAcceleration()', () => {
    it('should increase speed when accelerating', () => {
      const state = createCarState(0, 0, 0);
      const input: InputState = { ...DEFAULT_INPUT_STATE, accelerate: true };
      
      const newState = applyAcceleration(state, input, DEFAULT_CAR_CONFIG, dt);
      
      expect(newState.speed).toBeGreaterThan(0);
    });

    it('should decrease speed when braking', () => {
      const state: CarState = { ...createCarState(0, 0, 0), speed: 100, velocityX: 100 };
      const input: InputState = { ...DEFAULT_INPUT_STATE, brake: true };
      
      const newState = applyAcceleration(state, input, DEFAULT_CAR_CONFIG, dt);
      
      expect(newState.speed).toBeLessThan(100);
    });

    it('should not exceed max speed', () => {
      const state: CarState = { ...createCarState(0, 0, 0), speed: DEFAULT_CAR_CONFIG.maxSpeed };
      const input: InputState = { ...DEFAULT_INPUT_STATE, accelerate: true };
      
      const newState = applyAcceleration(state, input, DEFAULT_CAR_CONFIG, dt);
      
      expect(newState.speed).toBeLessThanOrEqual(DEFAULT_CAR_CONFIG.maxSpeed);
    });

    it('should not go below zero speed', () => {
      const state: CarState = { ...createCarState(0, 0, 0), speed: 10 };
      const input: InputState = { ...DEFAULT_INPUT_STATE, brake: true };
      
      // Apply braking for a long time
      let newState = state;
      for (let i = 0; i < 100; i++) {
        newState = applyAcceleration(newState, input, DEFAULT_CAR_CONFIG, dt);
      }
      
      expect(newState.speed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('applySteering()', () => {
    it('should rotate car when steering left', () => {
      const state: CarState = { ...createCarState(0, 0, 0), speed: 100 };
      const input: InputState = { ...DEFAULT_INPUT_STATE, steerLeft: true };
      
      const newState = applySteering(state, input, DEFAULT_CAR_CONFIG, dt);
      
      expect(newState.rotation).toBeLessThan(0); // Left is negative rotation
    });

    it('should rotate car when steering right', () => {
      const state: CarState = { ...createCarState(0, 0, 0), speed: 100 };
      const input: InputState = { ...DEFAULT_INPUT_STATE, steerRight: true };
      
      const newState = applySteering(state, input, DEFAULT_CAR_CONFIG, dt);
      
      expect(newState.rotation).toBeGreaterThan(0); // Right is positive rotation
    });

    it('should not steer when stationary', () => {
      const state = createCarState(0, 0, 0); // speed = 0
      const input: InputState = { ...DEFAULT_INPUT_STATE, steerLeft: true };
      
      const newState = applySteering(state, input, DEFAULT_CAR_CONFIG, dt);
      
      expect(newState.rotation).toBe(0);
    });

    it('should steer slower at high speed', () => {
      const slowState: CarState = { ...createCarState(0, 0, 0), speed: 100 };
      const fastState: CarState = { ...createCarState(0, 0, 0), speed: 400 };
      const input: InputState = { ...DEFAULT_INPUT_STATE, steerRight: true };
      
      const slowResult = applySteering(slowState, input, DEFAULT_CAR_CONFIG, dt);
      const fastResult = applySteering(fastState, input, DEFAULT_CAR_CONFIG, dt);
      
      expect(Math.abs(slowResult.rotation)).toBeGreaterThan(Math.abs(fastResult.rotation));
    });
  });

  describe('applyDrag()', () => {
    it('should slow down car when not accelerating', () => {
      const state: CarState = { ...createCarState(0, 0, 0), speed: 100, velocityX: 100 };
      
      const newState = applyDrag(state, DEFAULT_CAR_CONFIG, dt);
      
      expect(newState.speed).toBeLessThan(100);
    });

    it('should not go below zero', () => {
      const state: CarState = { ...createCarState(0, 0, 0), speed: 1 };
      
      // Apply drag many times
      let newState = state;
      for (let i = 0; i < 100; i++) {
        newState = applyDrag(newState, DEFAULT_CAR_CONFIG, dt);
      }
      
      expect(newState.speed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('updateCarPhysics()', () => {
    it('should update position based on velocity', () => {
      const state: CarState = {
        ...createCarState(0, 0, 0),
        speed: 100,
        velocityX: 100,
        velocityY: 0,
      };
      const input: InputState = DEFAULT_INPUT_STATE;
      
      const newState = updateCarPhysics(state, input, DEFAULT_CAR_CONFIG, dt);
      
      expect(newState.x).toBeGreaterThan(0);
    });

    it('should update velocity direction when rotating', () => {
      const state: CarState = {
        ...createCarState(0, 0, Math.PI / 2), // Facing up
        speed: 100,
        velocityX: 0,
        velocityY: -100,
      };
      const input: InputState = { ...DEFAULT_INPUT_STATE, accelerate: true };
      
      const newState = updateCarPhysics(state, input, DEFAULT_CAR_CONFIG, dt);
      
      // Velocity should be mostly in the -Y direction (up in screen coords)
      expect(newState.velocityY).not.toBe(0);
    });

    it('should apply drag when not accelerating', () => {
      const state: CarState = {
        ...createCarState(0, 0, 0),
        speed: 100,
        velocityX: 100,
        velocityY: 0,
      };
      const input: InputState = DEFAULT_INPUT_STATE; // No acceleration
      
      const newState = updateCarPhysics(state, input, DEFAULT_CAR_CONFIG, dt);
      
      expect(newState.speed).toBeLessThan(100);
    });
  });
});

describe('Track Boundary Collision', () => {
  // Simple square track boundary for testing
  const squareBoundary: Point[] = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ];

  // Clockwise vs counter-clockwise square (same shape, different winding)
  const squareCW: Point[] = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ];
  const squareCCW: Point[] = [
    { x: 0, y: 0 },
    { x: 0, y: 100 },
    { x: 100, y: 100 },
    { x: 100, y: 0 },
  ];

  describe('isPointInPolygon()', () => {
    it('should return true for point inside polygon', () => {
      expect(isPointInPolygon(50, 50, squareBoundary)).toBe(true);
    });

    it('should return false for point outside polygon', () => {
      expect(isPointInPolygon(150, 50, squareBoundary)).toBe(false);
    });

    it('should handle point on edge', () => {
      // Edge cases can be tricky - just verify it doesn't crash
      const result = isPointInPolygon(50, 0, squareBoundary);
      expect(typeof result).toBe('boolean');
    });

    it('should handle complex polygon', () => {
      const triangle: Point[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 50, y: 100 },
      ];
      expect(isPointInPolygon(50, 30, triangle)).toBe(true);
      expect(isPointInPolygon(10, 80, triangle)).toBe(false);
    });

    it('should work regardless of winding direction (CW)', () => {
      expect(isPointInPolygon(50, 50, squareCW)).toBe(true);
      expect(isPointInPolygon(150, 50, squareCW)).toBe(false);
    });

    it('should work regardless of winding direction (CCW)', () => {
      expect(isPointInPolygon(50, 50, squareCCW)).toBe(true);
      expect(isPointInPolygon(150, 50, squareCCW)).toBe(false);
    });

    it('should handle oval-like track boundary', () => {
      // Simplified oval track (like a real track outer boundary)
      const ovalTrack: Point[] = [];
      const numPoints = 32;
      const radiusX = 200;
      const radiusY = 100;
      
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        ovalTrack.push({
          x: Math.cos(angle) * radiusX,
          y: Math.sin(angle) * radiusY,
        });
      }

      // Point at center (should be inside outer boundary)
      expect(isPointInPolygon(0, 0, ovalTrack)).toBe(true);
      
      // Point on the track surface (halfway between center and edge)
      expect(isPointInPolygon(100, 0, ovalTrack)).toBe(true);
      
      // Point outside the oval
      expect(isPointInPolygon(250, 0, ovalTrack)).toBe(false);
      expect(isPointInPolygon(0, 150, ovalTrack)).toBe(false);
    });

    it('should handle donut-shaped track area correctly', () => {
      // Outer boundary - larger oval
      const outer: Point[] = [];
      const inner: Point[] = [];
      const numPoints = 32;
      
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        outer.push({
          x: Math.cos(angle) * 200,
          y: Math.sin(angle) * 100,
        });
        inner.push({
          x: Math.cos(angle) * 140,
          y: Math.sin(angle) * 60,
        });
      }

      // Point on track surface (between inner and outer)
      // At angle 0: outer=200, inner=140, track surface around x=170
      const onTrack = { x: 170, y: 0 };
      expect(isPointInPolygon(onTrack.x, onTrack.y, outer)).toBe(true);
      expect(isPointInPolygon(onTrack.x, onTrack.y, inner)).toBe(false);

      // Point in infield (inside both boundaries)
      const inInfield = { x: 50, y: 0 };
      expect(isPointInPolygon(inInfield.x, inInfield.y, outer)).toBe(true);
      expect(isPointInPolygon(inInfield.x, inInfield.y, inner)).toBe(true);

      // Point outside track (outside outer boundary)
      const outside = { x: 250, y: 0 };
      expect(isPointInPolygon(outside.x, outside.y, outer)).toBe(false);
    });
  });

  describe('Distance-based track boundary tests', () => {
    it('should correctly identify points on track using distance approach', () => {
      const trackData = defaultTrackLoader.getTrack('porto-azzurro');
      const builder = new TrackBuilder(25);
      const computed = builder.build(trackData);

      // Convert path to the format needed by checkTrackBoundaryDistance
      const trackPath = computed.path.map(p => ({
        position: p.position,
        width: p.width,
      }));

      // Check that all path points are on track (distance approach)
      let offTrackCount = 0;
      for (const point of computed.path) {
        const check = checkTrackBoundaryDistance(point.position.x, point.position.y, trackPath);
        if (!check.isOnTrack) {
          offTrackCount++;
        }
      }

      // All centerline points should be on track (distance from centerline = 0)
      expect(offTrackCount).toBe(0);
    });

    it('should correctly identify points off track', () => {
      const trackPath = [
        { position: { x: 0, y: 0 }, width: 20 },
        { position: { x: 100, y: 0 }, width: 20 },
        { position: { x: 200, y: 0 }, width: 20 },
      ];

      // Point on track (y=5, within width/2=10)
      const onTrack = checkTrackBoundaryDistance(100, 5, trackPath);
      expect(onTrack.isOnTrack).toBe(true);
      
      // Point off track (y=15, outside width/2=10)
      const offTrack = checkTrackBoundaryDistance(100, 15, trackPath);
      expect(offTrack.isOnTrack).toBe(false);
    });

    it('racing line points should be within track width', () => {
      const trackData = defaultTrackLoader.getTrack('velocita');
      const builder = new TrackBuilder(25);
      const computed = builder.build(trackData);

      const trackPath = computed.path.map(p => ({
        position: p.position,
        width: p.width,
      }));

      let offTrackCount = 0;
      for (const point of computed.racingLine) {
        const check = checkTrackBoundaryDistance(point.position.x, point.position.y, trackPath);
        if (!check.isOnTrack) {
          offTrackCount++;
        }
      }

      // Racing line should be within track width
      // Allow some tolerance since racing line can be slightly offset from centerline
      const tolerance = computed.racingLine.length * 0.05; // 5% tolerance
      expect(offTrackCount).toBeLessThanOrEqual(tolerance);
    });
  });

  describe('findNearestPointOnBoundary()', () => {
    it('should find nearest point on boundary', () => {
      const nearest = findNearestPointOnBoundary(50, -10, squareBoundary);
      expect(nearest.x).toBeCloseTo(50);
      expect(nearest.y).toBeCloseTo(0);
    });

    it('should find nearest point on corner', () => {
      const nearest = findNearestPointOnBoundary(-10, -10, squareBoundary);
      expect(nearest.x).toBeCloseTo(0);
      expect(nearest.y).toBeCloseTo(0);
    });
  });

  describe('constrainToTrack()', () => {
    it('should not modify car inside track', () => {
      const state = createCarState(50, 50, 0);
      const constrained = constrainToTrack(state, squareBoundary, []);
      expect(constrained.x).toBe(50);
      expect(constrained.y).toBe(50);
    });

    it('should push car back inside when outside outer boundary', () => {
      const state = createCarState(150, 50, 0);
      const constrained = constrainToTrack(state, squareBoundary, []);
      expect(constrained.x).toBeLessThanOrEqual(100);
    });

    it('should reduce speed on collision', () => {
      const state: CarState = { ...createCarState(150, 50, 0), speed: 100 };
      const constrained = constrainToTrack(state, squareBoundary, []);
      expect(constrained.speed).toBeLessThan(100);
    });

    it('should push car out when inside inner boundary', () => {
      const innerBoundary: Point[] = [
        { x: 30, y: 30 },
        { x: 70, y: 30 },
        { x: 70, y: 70 },
        { x: 30, y: 70 },
      ];
      const state = createCarState(50, 50, 0); // Inside inner boundary
      const constrained = constrainToTrack(state, squareBoundary, innerBoundary);
      
      // Should be pushed to inner boundary edge
      const isOnInnerEdge = 
        constrained.x <= 30 || constrained.x >= 70 ||
        constrained.y <= 30 || constrained.y >= 70;
      expect(isOnInnerEdge).toBe(true);
    });
  });
});
