import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PhysicsPlugin } from '@physics/PhysicsPlugin';
import { InputPlugin } from '@input/InputPlugin';
import { EventBus } from '@core/EventBus';
import { StateManager } from '@core/StateManager';
import { PluginManager } from '@core/PluginManager';
import '@physics/types';

describe('PhysicsPlugin', () => {
  let physicsPlugin: PhysicsPlugin;
  let inputPlugin: InputPlugin;
  let pluginManager: PluginManager;
  let stateManager: StateManager;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    stateManager = new StateManager();
    pluginManager = new PluginManager(eventBus, stateManager);
    inputPlugin = new InputPlugin();
    physicsPlugin = new PhysicsPlugin();
    
    pluginManager.register(inputPlugin);
    pluginManager.register(physicsPlugin);
  });

  afterEach(() => {
    pluginManager.destroyAll();
  });

  describe('plugin metadata', () => {
    it('should have correct id and name', () => {
      expect(physicsPlugin.id).toBe('physics');
      expect(physicsPlugin.name).toBe('Physics Plugin');
    });

    it('should depend on input plugin', () => {
      expect(physicsPlugin.dependencies).toContain('input');
    });
  });

  describe('car state management', () => {
    it('should allow registering a car', () => {
      pluginManager.startAll();
      
      physicsPlugin.registerCar('player', 100, 100, 0);
      const state = physicsPlugin.getCarState('player');
      
      expect(state).toBeDefined();
      expect(state?.x).toBe(100);
      expect(state?.y).toBe(100);
    });

    it('should allow registering multiple cars', () => {
      pluginManager.startAll();
      
      physicsPlugin.registerCar('player', 100, 100, 0, undefined, true);
      physicsPlugin.registerCar('ai1', 200, 100, 0);
      physicsPlugin.registerCar('ai2', 300, 100, 0);
      
      expect(physicsPlugin.getCarState('player')).toBeDefined();
      expect(physicsPlugin.getCarState('ai1')).toBeDefined();
      expect(physicsPlugin.getCarState('ai2')).toBeDefined();
    });

    it('should update car state on frame update', () => {
      pluginManager.startAll();
      physicsPlugin.registerCar('player', 100, 100, 0, undefined, true);
      
      // Simulate accelerating
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
      
      // Simulate frame update using pluginManager.updateAll
      pluginManager.updateAll(1/60);
      
      const state = physicsPlugin.getCarState('player');
      expect(state?.speed).toBeGreaterThan(0);
    });

    it('should only apply player input to player car', () => {
      pluginManager.startAll();
      physicsPlugin.registerCar('player', 100, 100, 0, undefined, true);
      physicsPlugin.registerCar('ai1', 200, 100, 0);
      
      // Simulate accelerating
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
      
      // Simulate frame update
      pluginManager.updateAll(1/60);
      
      const playerState = physicsPlugin.getCarState('player');
      const aiState = physicsPlugin.getCarState('ai1');
      
      expect(playerState?.speed).toBeGreaterThan(0);
      expect(aiState?.speed).toBe(0); // AI doesn't respond to player input
    });

    it('should unregister a car', () => {
      pluginManager.startAll();
      
      physicsPlugin.registerCar('player', 100, 100, 0);
      physicsPlugin.unregisterCar('player');
      
      expect(physicsPlugin.getCarState('player')).toBeUndefined();
    });
  });

  describe('track boundaries', () => {
    it('should set track boundaries using distance-based approach', () => {
      pluginManager.startAll();
      
      // Create a simple track path (a line of points with width)
      const trackPath = [
        { position: { x: 0, y: 100 }, width: 50 },
        { position: { x: 50, y: 100 }, width: 50 },
        { position: { x: 100, y: 100 }, width: 50 },
        { position: { x: 150, y: 100 }, width: 50 },
        { position: { x: 200, y: 100 }, width: 50 },
      ];
      
      physicsPlugin.setTrackBoundaries(trackPath);
      
      // Register car on track (within width/2 = 25 of centerline at y=100)
      physicsPlugin.registerCar('onTrack', 100, 110, 0);
      
      // Register car off track (more than 25 away from centerline)
      physicsPlugin.registerCar('offTrack', 100, 150, 0, undefined, true);
      
      // Simulate frame update
      pluginManager.updateAll(1/60);
      
      const onTrackState = physicsPlugin.getCarState('onTrack');
      const offTrackState = physicsPlugin.getCarState('offTrack');
      
      expect(onTrackState).toBeDefined();
      expect(offTrackState).toBeDefined();
      
      // Car on track should stay where it was
      expect(onTrackState?.y).toBe(110);
      
      // Car off track should be pushed back toward the track
      expect(offTrackState?.y).toBeLessThan(150);
    });

    it('should constrain car to track boundary', () => {
      pluginManager.startAll();
      
      // Simple straight track at y=100 with width 40
      const trackPath = [
        { position: { x: 0, y: 100 }, width: 40 },
        { position: { x: 100, y: 100 }, width: 40 },
        { position: { x: 200, y: 100 }, width: 40 },
      ];
      
      physicsPlugin.setTrackBoundaries(trackPath);
      
      // Register car far off track
      physicsPlugin.registerCar('player', 100, 200, 0, undefined, true);
      
      // Simulate frame update
      pluginManager.updateAll(1/60);
      
      const state = physicsPlugin.getCarState('player');
      
      // Car should be constrained to within track width (y=100 ± 20)
      expect(state?.y).toBeLessThanOrEqual(122); // 100 + 20 + 2 buffer
    });
  });

  describe('setCarState()', () => {
    it('should manually set car state', () => {
      pluginManager.startAll();
      
      physicsPlugin.registerCar('player', 100, 100, 0);
      physicsPlugin.setCarState('player', { x: 500, y: 500 });
      
      const state = physicsPlugin.getCarState('player');
      expect(state?.x).toBe(500);
      expect(state?.y).toBe(500);
    });
  });

  describe('getPlayerCarId()', () => {
    it('should return player car id', () => {
      pluginManager.startAll();
      
      physicsPlugin.registerCar('player', 100, 100, 0, undefined, true);
      
      expect(physicsPlugin.getPlayerCarId()).toBe('player');
    });

    it('should return null if no player car', () => {
      pluginManager.startAll();
      
      expect(physicsPlugin.getPlayerCarId()).toBeNull();
    });
  });

  describe('AI car input', () => {
    it('should allow setting AI car input', () => {
      pluginManager.startAll();
      
      physicsPlugin.registerCar('ai1', 100, 100, 0);
      physicsPlugin.setAIInput('ai1', { accelerate: true, brake: false, steerLeft: false, steerRight: false });
      
      // Simulate frame update
      pluginManager.updateAll(1/60);
      
      const state = physicsPlugin.getCarState('ai1');
      expect(state?.speed).toBeGreaterThan(0);
    });
  });
});
