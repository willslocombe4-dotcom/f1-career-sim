import { describe, it, expect } from 'vitest';
import { LAYER_Z_INDEX, DEFAULT_RENDERER_CONFIG } from '@rendering/types';
import type { LayerName } from '@rendering/types';

describe('Rendering Types', () => {
  describe('LAYER_Z_INDEX', () => {
    it('should define z-index for all layers', () => {
      const layers: LayerName[] = ['background', 'track', 'cars', 'effects', 'ui'];
      
      for (const layer of layers) {
        expect(LAYER_Z_INDEX[layer]).toBeDefined();
        expect(typeof LAYER_Z_INDEX[layer]).toBe('number');
      }
    });

    it('should have layers in correct order', () => {
      expect(LAYER_Z_INDEX.background).toBeLessThan(LAYER_Z_INDEX.track);
      expect(LAYER_Z_INDEX.track).toBeLessThan(LAYER_Z_INDEX.cars);
      expect(LAYER_Z_INDEX.cars).toBeLessThan(LAYER_Z_INDEX.effects);
      expect(LAYER_Z_INDEX.effects).toBeLessThan(LAYER_Z_INDEX.ui);
    });

    it('should have ui as the topmost layer', () => {
      const allZIndices = Object.values(LAYER_Z_INDEX);
      expect(LAYER_Z_INDEX.ui).toBe(Math.max(...allZIndices));
    });
  });

  describe('DEFAULT_RENDERER_CONFIG', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_RENDERER_CONFIG.width).toBe(1280);
      expect(DEFAULT_RENDERER_CONFIG.height).toBe(720);
      expect(DEFAULT_RENDERER_CONFIG.backgroundColor).toBe(0x1a1a2e);
      expect(DEFAULT_RENDERER_CONFIG.antialias).toBe(false);
      expect(DEFAULT_RENDERER_CONFIG.resolution).toBe(1);
      expect(DEFAULT_RENDERER_CONFIG.autoDensity).toBe(true);
    });
  });
});
