import { Application, Container } from 'pixi.js';
import type { GameConfig } from '@core/types';
import type { LayerName, RendererConfig } from './types';
import { LAYER_Z_INDEX, DEFAULT_RENDERER_CONFIG } from './types';

/**
 * Wrapper around PixiJS Application.
 * Handles canvas creation, layer management, and rendering lifecycle.
 */
export class Renderer {
  private app: Application | null = null;
  private layers: Map<LayerName, Container> = new Map();
  private initialized = false;

  /**
   * Initialize the renderer and create the PixiJS application.
   * @param config - Game configuration
   * @param rendererConfig - Optional renderer-specific overrides
   */
  async init(
    config: GameConfig,
    rendererConfig: Partial<RendererConfig> = {}
  ): Promise<void> {
    if (this.initialized) {
      console.warn('Renderer already initialized');
      return;
    }

    const finalConfig: RendererConfig = {
      ...DEFAULT_RENDERER_CONFIG,
      width: config.width,
      height: config.height,
      resolution: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
      ...rendererConfig,
    };

    this.app = new Application();

    await this.app.init({
      width: finalConfig.width,
      height: finalConfig.height,
      backgroundColor: finalConfig.backgroundColor,
      antialias: finalConfig.antialias,
      resolution: finalConfig.resolution,
      autoDensity: finalConfig.autoDensity,
    });

    // Add canvas to container
    const container = document.getElementById(config.containerId);
    if (!container) {
      throw new Error(`Container "${config.containerId}" not found`);
    }
    container.appendChild(this.app.canvas);

    // Enable z-index sorting on the stage
    this.app.stage.sortableChildren = true;

    // Create default layers
    this.createDefaultLayers();

    this.initialized = true;
  }

  /**
   * Create all default rendering layers.
   */
  private createDefaultLayers(): void {
    const layerNames: LayerName[] = ['background', 'track', 'cars', 'effects', 'ui'];
    
    for (const name of layerNames) {
      this.createLayer(name);
    }
  }

  /**
   * Create a named layer at its predefined z-index.
   * @param name - Layer name
   */
  createLayer(name: LayerName): Container {
    if (this.layers.has(name)) {
      return this.layers.get(name)!;
    }

    const layer = new Container();
    layer.label = name;
    layer.zIndex = LAYER_Z_INDEX[name];
    layer.sortableChildren = true;
    
    this.layers.set(name, layer);
    this.getStage().addChild(layer);
    this.getStage().sortChildren();
    
    return layer;
  }

  /**
   * Get the PixiJS application instance.
   * @throws If renderer is not initialized
   */
  getApp(): Application {
    if (!this.app) {
      throw new Error('Renderer not initialized');
    }
    return this.app;
  }

  /**
   * Get the main stage container.
   */
  getStage(): Container {
    return this.getApp().stage;
  }

  /**
   * Get a layer by name.
   * @param name - Layer name
   */
  getLayer(name: LayerName): Container {
    const layer = this.layers.get(name);
    if (!layer) {
      throw new Error(`Layer "${name}" not found`);
    }
    return layer;
  }

  /**
   * Check if a layer exists.
   * @param name - Layer name
   */
  hasLayer(name: LayerName): boolean {
    return this.layers.has(name);
  }

  /**
   * Get screen dimensions.
   */
  getScreenSize(): { width: number; height: number } {
    const app = this.getApp();
    return {
      width: app.screen.width,
      height: app.screen.height,
    };
  }

  /**
   * Get the canvas element.
   */
  getCanvas(): HTMLCanvasElement {
    return this.getApp().canvas;
  }

  /**
   * Check if renderer is initialized.
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Resize the renderer.
   * @param width - New width
   * @param height - New height
   */
  resize(width: number, height: number): void {
    if (!this.app) return;
    this.app.renderer.resize(width, height);
  }

  /**
   * Clear all objects from a specific layer.
   * @param name - Layer name
   */
  clearLayer(name: LayerName): void {
    const layer = this.getLayer(name);
    layer.removeChildren();
  }

  /**
   * Clear all layers.
   */
  clearAllLayers(): void {
    for (const layer of this.layers.values()) {
      layer.removeChildren();
    }
  }

  /**
   * Destroy the renderer and clean up all resources.
   */
  destroy(): void {
    if (this.app) {
      this.app.destroy(true, { children: true, texture: true });
      this.app = null;
    }
    this.layers.clear();
    this.initialized = false;
  }
}
