import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpriteManager } from '@rendering/SpriteManager';

// Mock PixiJS Assets module
vi.mock('pixi.js', () => ({
  Assets: {
    add: vi.fn(),
    load: vi.fn().mockResolvedValue({}),
    get: vi.fn().mockReturnValue({ width: 100, height: 100 }),
    unload: vi.fn(),
  },
  Sprite: vi.fn().mockImplementation(() => ({
    texture: {},
    x: 0,
    y: 0,
  })),
  Texture: {
    WHITE: {},
  },
  Graphics: vi.fn().mockImplementation(() => ({
    rect: vi.fn().mockReturnThis(),
    roundRect: vi.fn().mockReturnThis(),
    ellipse: vi.fn().mockReturnThis(),
    moveTo: vi.fn().mockReturnThis(),
    lineTo: vi.fn().mockReturnThis(),
    fill: vi.fn().mockReturnThis(),
    stroke: vi.fn().mockReturnThis(),
  })),
  Container: vi.fn().mockImplementation(() => ({
    addChild: vi.fn(),
    removeChild: vi.fn(),
    children: [],
  })),
  GraphicsContext: vi.fn(),
}));

describe('SpriteManager', () => {
  let spriteManager: SpriteManager;

  beforeEach(() => {
    vi.clearAllMocks();
    spriteManager = new SpriteManager();
  });

  describe('load()', () => {
    it('should load an asset', async () => {
      const { Assets } = await import('pixi.js');
      
      await spriteManager.load('test-texture', '/path/to/texture.png');
      
      expect(Assets.add).toHaveBeenCalledWith({
        alias: 'test-texture',
        src: '/path/to/texture.png',
      });
      expect(Assets.load).toHaveBeenCalledWith('test-texture');
    });

    it('should not reload already loaded assets', async () => {
      const { Assets } = await import('pixi.js');
      
      await spriteManager.load('test', '/test.png');
      await spriteManager.load('test', '/test.png');
      
      expect(Assets.add).toHaveBeenCalledTimes(1);
      expect(Assets.load).toHaveBeenCalledTimes(1);
    });
  });

  describe('loadAll()', () => {
    it('should load multiple assets', async () => {
      const { Assets } = await import('pixi.js');
      
      await spriteManager.loadAll([
        { alias: 'a', src: '/a.png' },
        { alias: 'b', src: '/b.png' },
      ]);
      
      expect(Assets.add).toHaveBeenCalledTimes(2);
      expect(Assets.load).toHaveBeenCalledWith(['a', 'b']);
    });

    it('should skip already loaded assets', async () => {
      const { Assets } = await import('pixi.js');
      
      await spriteManager.load('a', '/a.png');
      await spriteManager.loadAll([
        { alias: 'a', src: '/a.png' },
        { alias: 'b', src: '/b.png' },
      ]);
      
      // 'a' was already loaded, so only 'b' should be added in loadAll
      expect(Assets.add).toHaveBeenCalledTimes(2); // Once for load, once for loadAll
    });
  });

  describe('isLoaded()', () => {
    it('should return false for unloaded assets', () => {
      expect(spriteManager.isLoaded('nonexistent')).toBe(false);
    });

    it('should return true for loaded assets', async () => {
      await spriteManager.load('test', '/test.png');
      expect(spriteManager.isLoaded('test')).toBe(true);
    });
  });

  describe('getLoadedAssets()', () => {
    it('should return empty array initially', () => {
      expect(spriteManager.getLoadedAssets()).toEqual([]);
    });

    it('should return all loaded asset aliases', async () => {
      await spriteManager.load('a', '/a.png');
      await spriteManager.load('b', '/b.png');
      
      const loaded = spriteManager.getLoadedAssets();
      expect(loaded).toContain('a');
      expect(loaded).toContain('b');
      expect(loaded.length).toBe(2);
    });
  });

  describe('unload()', () => {
    it('should unload a specific asset', async () => {
      const { Assets } = await import('pixi.js');
      
      await spriteManager.load('test', '/test.png');
      spriteManager.unload('test');
      
      expect(Assets.unload).toHaveBeenCalledWith('test');
      expect(spriteManager.isLoaded('test')).toBe(false);
    });

    it('should not throw for non-existent asset', () => {
      expect(() => spriteManager.unload('nonexistent')).not.toThrow();
    });
  });

  describe('unloadAll()', () => {
    it('should unload all assets', async () => {
      const { Assets } = await import('pixi.js');
      
      await spriteManager.load('a', '/a.png');
      await spriteManager.load('b', '/b.png');
      spriteManager.unloadAll();
      
      expect(Assets.unload).toHaveBeenCalledWith('a');
      expect(Assets.unload).toHaveBeenCalledWith('b');
      expect(spriteManager.getLoadedAssets()).toEqual([]);
    });
  });

  describe('createRectangle()', () => {
    it('should create a graphics rectangle', () => {
      const rect = spriteManager.createRectangle(100, 50, 0xff0000);
      
      expect(rect.rect).toHaveBeenCalledWith(0, 0, 100, 50);
      expect(rect.fill).toHaveBeenCalledWith(0xff0000);
    });
  });

  describe('createCarGraphic()', () => {
    it('should create a car container', () => {
      const car = spriteManager.createCarGraphic(0xff0000);
      
      expect(car.addChild).toHaveBeenCalled();
    });

    it('should accept custom dimensions', () => {
      const car = spriteManager.createCarGraphic(0x00ff00, 60, 30);
      
      expect(car.addChild).toHaveBeenCalled();
    });
  });

  describe('createOvalTrack()', () => {
    it('should create a track container', () => {
      const track = spriteManager.createOvalTrack(0, 0, 400, 200, 60);
      
      expect(track.addChild).toHaveBeenCalled();
    });
  });
});
