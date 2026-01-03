import { Container } from 'pixi.js';
import type { Plugin, GameContext, FrameUpdatePayload } from '@core/types';
import { Renderer } from './Renderer';
import { Camera } from './Camera';
import { SpriteManager } from './SpriteManager';
import type { LayerName } from './types';

/**
 * Plugin that integrates the rendering system with the Game class.
 * Manages the renderer, camera, and sprite manager lifecycle.
 */
export class RenderPlugin implements Plugin {
  readonly id = 'renderer';
  readonly name = 'Render Plugin';

  private renderer: Renderer;
  private camera: Camera;
  private spriteManager: SpriteManager;
  private worldContainer: Container | null = null;

  constructor() {
    this.renderer = new Renderer();
    this.camera = new Camera(1280, 720); // Default, will be updated on init
    this.spriteManager = new SpriteManager();
  }

  /**
   * Initialize the rendering system.
   * Must be called before game.start() with await.
   */
  async initialize(containerId: string, width: number, height: number): Promise<void> {
    await this.renderer.init({
      containerId,
      width,
      height,
      targetFPS: 60,
      debug: false,
    });

    // Create world container that camera will control
    this.worldContainer = new Container();
    this.worldContainer.label = 'world';
    
    // Add world container to track layer (it will contain all world objects)
    const trackLayer = this.renderer.getLayer('track');
    trackLayer.addChild(this.worldContainer);

    // Update camera dimensions
    this.camera = new Camera(width, height);
    this.camera.setTarget(this.worldContainer);
  }

  onRegister(ctx: GameContext): void {
    // Store references in game state for other plugins to access
    ctx.setState('renderer', this.renderer);
    ctx.setState('camera', this.camera);
    ctx.setState('spriteManager', this.spriteManager);
  }

  onStart(ctx: GameContext): void {
    // Subscribe to frame updates for camera
    ctx.on<FrameUpdatePayload>('frame:update', (payload) => {
      this.camera.update(payload.deltaTime);
    });
  }

  onUpdate(_deltaTime: number, _ctx: GameContext): void {
    // Camera update is handled via event subscription
    // Additional per-frame rendering logic can go here
  }

  onDestroy(): void {
    this.spriteManager.unloadAll();
    this.renderer.destroy();
    this.worldContainer = null;
  }

  /**
   * Get the renderer instance.
   */
  getRenderer(): Renderer {
    return this.renderer;
  }

  /**
   * Get the camera instance.
   */
  getCamera(): Camera {
    return this.camera;
  }

  /**
   * Get the sprite manager instance.
   */
  getSpriteManager(): SpriteManager {
    return this.spriteManager;
  }

  /**
   * Get the world container (controlled by camera).
   */
  getWorldContainer(): Container {
    if (!this.worldContainer) {
      throw new Error('RenderPlugin not initialized');
    }
    return this.worldContainer;
  }

  /**
   * Add a display object to a specific layer.
   * @param layerName - The layer to add to
   * @param child - The display object to add
   */
  addToLayer(layerName: LayerName, child: Container): void {
    const layer = this.renderer.getLayer(layerName);
    layer.addChild(child);
  }

  /**
   * Add a display object to the world (affected by camera).
   * @param child - The display object to add
   */
  addToWorld(child: Container): void {
    if (!this.worldContainer) {
      throw new Error('RenderPlugin not initialized');
    }
    this.worldContainer.addChild(child);
  }

  /**
   * Remove a display object from the world.
   * @param child - The display object to remove
   */
  removeFromWorld(child: Container): void {
    if (this.worldContainer && child.parent === this.worldContainer) {
      this.worldContainer.removeChild(child);
    }
  }

  /**
   * Get screen dimensions.
   */
  getScreenSize(): { width: number; height: number } {
    return this.renderer.getScreenSize();
  }
}
