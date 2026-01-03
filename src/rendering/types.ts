/**
 * Type definitions for the rendering system.
 */

/** Named rendering layers with z-order */
export type LayerName = 
  | 'background'
  | 'track'
  | 'cars'
  | 'effects'
  | 'ui';

/** Z-index values for each layer */
export const LAYER_Z_INDEX: Record<LayerName, number> = {
  background: 0,
  track: 10,
  cars: 20,
  effects: 30,
  ui: 100,
};

/** Asset types that can be loaded */
export type AssetType = 'texture' | 'spritesheet' | 'font';

/** Asset manifest entry */
export interface AssetEntry {
  alias: string;
  src: string;
  type?: AssetType;
}

/** Camera state */
export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  rotation: number;
}

/** Viewport bounds */
export interface ViewportBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

/** Renderer configuration */
export interface RendererConfig {
  width: number;
  height: number;
  backgroundColor: number;
  antialias: boolean;
  resolution: number;
  autoDensity: boolean;
}

/** Default renderer config */
export const DEFAULT_RENDERER_CONFIG: RendererConfig = {
  width: 1280,
  height: 720,
  backgroundColor: 0x1a1a2e,
  antialias: false, // Retro pixel look
  resolution: 1,
  autoDensity: true,
};
