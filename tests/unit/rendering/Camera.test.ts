import { describe, it, expect, beforeEach } from 'vitest';
import { Camera } from '@rendering/Camera';

describe('Camera', () => {
  let camera: Camera;
  const screenWidth = 1280;
  const screenHeight = 720;

  beforeEach(() => {
    camera = new Camera(screenWidth, screenHeight);
  });

  describe('constructor', () => {
    it('should initialize with default state', () => {
      const state = camera.getState();
      
      expect(state.x).toBe(0);
      expect(state.y).toBe(0);
      expect(state.zoom).toBe(1);
      expect(state.rotation).toBe(0);
    });
  });

  describe('setPosition()', () => {
    it('should set camera position immediately', () => {
      camera.setPosition(100, 200);
      const state = camera.getState();
      
      expect(state.x).toBe(100);
      expect(state.y).toBe(200);
    });

    it('should also set target position', () => {
      camera.setPosition(100, 200);
      camera.setLerpFactor(0.5);
      camera.update(0.016);
      
      const state = camera.getState();
      // Should stay at 100, 200 since target is also there
      expect(state.x).toBe(100);
      expect(state.y).toBe(200);
    });
  });

  describe('moveTo() and follow()', () => {
    it('should move toward target position over time', () => {
      camera.setLerpFactor(0.5);
      camera.moveTo(100, 0);
      camera.update(0.016);
      
      const state = camera.getState();
      expect(state.x).toBe(50); // Moved halfway
      expect(state.y).toBe(0);
    });

    it('should continue moving toward target', () => {
      camera.setLerpFactor(0.5);
      camera.moveTo(100, 0);
      
      camera.update(0.016);
      expect(camera.getState().x).toBe(50);
      
      camera.update(0.016);
      expect(camera.getState().x).toBe(75);
      
      camera.update(0.016);
      expect(camera.getState().x).toBe(87.5);
    });

    it('should follow position each frame', () => {
      camera.setLerpFactor(1); // Instant movement
      camera.follow(50, 100);
      camera.update(0.016);
      
      const state = camera.getState();
      expect(state.x).toBe(50);
      expect(state.y).toBe(100);
    });
  });

  describe('setZoom()', () => {
    it('should set zoom level', () => {
      camera.setZoom(2);
      expect(camera.getZoom()).toBe(2);
    });

    it('should clamp zoom to minimum', () => {
      camera.setZoom(0.01);
      expect(camera.getZoom()).toBe(0.1);
    });

    it('should clamp zoom to maximum', () => {
      camera.setZoom(100);
      expect(camera.getZoom()).toBe(10);
    });
  });

  describe('setRotation()', () => {
    it('should set rotation', () => {
      camera.setRotation(Math.PI / 4);
      expect(camera.getState().rotation).toBe(Math.PI / 4);
    });
  });

  describe('getViewportBounds()', () => {
    it('should return correct viewport bounds at default zoom', () => {
      camera.setPosition(0, 0);
      const bounds = camera.getViewportBounds();
      
      expect(bounds.left).toBe(-screenWidth / 2);
      expect(bounds.right).toBe(screenWidth / 2);
      expect(bounds.top).toBe(-screenHeight / 2);
      expect(bounds.bottom).toBe(screenHeight / 2);
      expect(bounds.width).toBe(screenWidth);
      expect(bounds.height).toBe(screenHeight);
    });

    it('should return smaller bounds when zoomed in', () => {
      camera.setPosition(0, 0);
      camera.setZoom(2);
      const bounds = camera.getViewportBounds();
      
      expect(bounds.width).toBe(screenWidth / 2);
      expect(bounds.height).toBe(screenHeight / 2);
    });

    it('should offset bounds based on camera position', () => {
      camera.setPosition(100, 50);
      const bounds = camera.getViewportBounds();
      
      expect(bounds.left).toBe(100 - screenWidth / 2);
      expect(bounds.right).toBe(100 + screenWidth / 2);
      expect(bounds.top).toBe(50 - screenHeight / 2);
      expect(bounds.bottom).toBe(50 + screenHeight / 2);
    });
  });

  describe('screenToWorld()', () => {
    it('should convert center of screen to camera position', () => {
      camera.setPosition(100, 50);
      const world = camera.screenToWorld(screenWidth / 2, screenHeight / 2);
      
      expect(world.x).toBe(100);
      expect(world.y).toBe(50);
    });

    it('should convert corner of screen correctly', () => {
      camera.setPosition(0, 0);
      const world = camera.screenToWorld(0, 0);
      
      expect(world.x).toBe(-screenWidth / 2);
      expect(world.y).toBe(-screenHeight / 2);
    });

    it('should account for zoom', () => {
      camera.setPosition(0, 0);
      camera.setZoom(2);
      const world = camera.screenToWorld(0, 0);
      
      expect(world.x).toBe(-screenWidth / 4);
      expect(world.y).toBe(-screenHeight / 4);
    });
  });

  describe('worldToScreen()', () => {
    it('should convert camera position to center of screen', () => {
      camera.setPosition(100, 50);
      const screen = camera.worldToScreen(100, 50);
      
      expect(screen.x).toBe(screenWidth / 2);
      expect(screen.y).toBe(screenHeight / 2);
    });

    it('should be inverse of screenToWorld', () => {
      camera.setPosition(100, 50);
      camera.setZoom(1.5);
      
      const screenX = 300;
      const screenY = 400;
      
      const world = camera.screenToWorld(screenX, screenY);
      const backToScreen = camera.worldToScreen(world.x, world.y);
      
      expect(backToScreen.x).toBeCloseTo(screenX, 5);
      expect(backToScreen.y).toBeCloseTo(screenY, 5);
    });
  });

  describe('world bounds', () => {
    it('should clamp camera within world bounds', () => {
      camera.setWorldBounds(-500, 500, -300, 300);
      camera.setLerpFactor(1);
      
      // Try to move beyond bounds
      camera.moveTo(1000, 0);
      camera.update(0.016);
      
      const state = camera.getState();
      // Should be clamped: maxX - halfWidth = 500 - 640 = -140
      // But since halfWidth > maxX, camera can't show past maxX
      expect(state.x).toBeLessThanOrEqual(500);
    });

    it('should allow movement within bounds', () => {
      camera.setWorldBounds(-1000, 1000, -1000, 1000);
      camera.setLerpFactor(1);
      
      camera.moveTo(100, 200);
      camera.update(0.016);
      
      const state = camera.getState();
      expect(state.x).toBe(100);
      expect(state.y).toBe(200);
    });

    it('should clear world bounds', () => {
      camera.setWorldBounds(-100, 100, -100, 100);
      camera.clearWorldBounds();
      camera.setLerpFactor(1);
      
      camera.moveTo(500, 500);
      camera.update(0.016);
      
      const state = camera.getState();
      expect(state.x).toBe(500);
      expect(state.y).toBe(500);
    });
  });

  describe('setLerpFactor()', () => {
    it('should clamp lerp factor between 0 and 1', () => {
      camera.setLerpFactor(-0.5);
      camera.moveTo(100, 0);
      camera.update(0.016);
      expect(camera.getState().x).toBe(0); // No movement at 0
      
      camera.setLerpFactor(2);
      camera.moveTo(100, 0);
      camera.update(0.016);
      expect(camera.getState().x).toBe(100); // Instant at 1
    });
  });

  describe('updateScreenSize()', () => {
    it('should update screen dimensions', () => {
      camera.updateScreenSize(800, 600);
      camera.setPosition(0, 0);
      
      const bounds = camera.getViewportBounds();
      expect(bounds.width).toBe(800);
      expect(bounds.height).toBe(600);
    });
  });
});
