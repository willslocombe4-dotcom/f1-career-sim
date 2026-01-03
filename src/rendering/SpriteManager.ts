import { Assets, Sprite, Texture, Graphics, Container, GraphicsContext } from 'pixi.js';
import type { AssetEntry } from './types';

/**
 * Manages loading, caching, and creation of sprites and textures.
 * Uses PixiJS 8.x Assets API for loading.
 */
export class SpriteManager {
  private loadedAssets: Set<string> = new Set();
  private graphicsCache: Map<string, GraphicsContext> = new Map();

  /**
   * Load a single asset.
   * @param alias - Unique identifier for the asset
   * @param src - URL or path to the asset
   */
  async load(alias: string, src: string): Promise<void> {
    if (this.loadedAssets.has(alias)) {
      return; // Already loaded
    }

    Assets.add({ alias, src });
    await Assets.load(alias);
    this.loadedAssets.add(alias);
  }

  /**
   * Load multiple assets at once.
   * @param assets - Array of asset entries to load
   */
  async loadAll(assets: AssetEntry[]): Promise<void> {
    const toLoad: string[] = [];

    for (const asset of assets) {
      if (!this.loadedAssets.has(asset.alias)) {
        Assets.add({ alias: asset.alias, src: asset.src });
        toLoad.push(asset.alias);
      }
    }

    if (toLoad.length > 0) {
      await Assets.load(toLoad);
      for (const alias of toLoad) {
        this.loadedAssets.add(alias);
      }
    }
  }

  /**
   * Get a texture by alias.
   * @param alias - The asset alias
   */
  getTexture(alias: string): Texture {
    if (!this.loadedAssets.has(alias)) {
      throw new Error(`Texture "${alias}" not loaded`);
    }
    return Assets.get(alias);
  }

  /**
   * Create a sprite from a loaded texture.
   * @param alias - The texture alias
   */
  createSprite(alias: string): Sprite {
    const texture = this.getTexture(alias);
    return new Sprite(texture);
  }

  /**
   * Check if an asset is loaded.
   * @param alias - The asset alias
   */
  isLoaded(alias: string): boolean {
    return this.loadedAssets.has(alias);
  }

  /**
   * Create a simple colored rectangle sprite (for placeholder graphics).
   * @param width - Width of the rectangle
   * @param height - Height of the rectangle
   * @param color - Fill color (hex number)
   */
  createRectangle(width: number, height: number, color: number): Graphics {
    const graphics = new Graphics();
    graphics.rect(0, 0, width, height);
    graphics.fill(color);
    return graphics;
  }

  /**
   * Create a simple car placeholder graphic.
   * @param color - Car color (hex number)
   * @param width - Car width (default 40)
   * @param height - Car height (default 20)
   */
  createCarGraphic(color: number, width = 40, height = 20): Container {
    const car = new Container();
    
    // Main body
    const body = new Graphics();
    body.roundRect(-width / 2, -height / 2, width, height, 3);
    body.fill(color);
    
    // Cockpit/windshield area (darker)
    const cockpit = new Graphics();
    const cockpitWidth = width * 0.3;
    const cockpitHeight = height * 0.6;
    cockpit.roundRect(width * 0.1 - width / 2, -cockpitHeight / 2, cockpitWidth, cockpitHeight, 2);
    cockpit.fill(0x222222);
    
    // Front wing
    const frontWing = new Graphics();
    frontWing.rect(width / 2 - 3, -height * 0.7 / 2, 5, height * 0.7);
    frontWing.fill(color);
    
    // Rear wing
    const rearWing = new Graphics();
    rearWing.rect(-width / 2 - 3, -height * 0.8 / 2, 4, height * 0.8);
    rearWing.fill(color);
    
    // Wheels (dark)
    const wheelColor = 0x1a1a1a;
    const wheelWidth = 8;
    const wheelHeight = 6;
    
    // Front wheels
    const frontLeftWheel = new Graphics();
    frontLeftWheel.rect(width / 4, -height / 2 - 2, wheelWidth, wheelHeight);
    frontLeftWheel.fill(wheelColor);
    
    const frontRightWheel = new Graphics();
    frontRightWheel.rect(width / 4, height / 2 - wheelHeight + 2, wheelWidth, wheelHeight);
    frontRightWheel.fill(wheelColor);
    
    // Rear wheels
    const rearLeftWheel = new Graphics();
    rearLeftWheel.rect(-width / 4 - wheelWidth / 2, -height / 2 - 2, wheelWidth, wheelHeight);
    rearLeftWheel.fill(wheelColor);
    
    const rearRightWheel = new Graphics();
    rearRightWheel.rect(-width / 4 - wheelWidth / 2, height / 2 - wheelHeight + 2, wheelWidth, wheelHeight);
    rearRightWheel.fill(wheelColor);
    
    // Add all parts to car container
    car.addChild(rearWing);
    car.addChild(frontWing);
    car.addChild(rearLeftWheel);
    car.addChild(rearRightWheel);
    car.addChild(frontLeftWheel);
    car.addChild(frontRightWheel);
    car.addChild(body);
    car.addChild(cockpit);
    
    return car;
  }

  /**
   * Create an oval track graphic.
   * @param centerX - Center X coordinate
   * @param centerY - Center Y coordinate  
   * @param radiusX - Horizontal radius
   * @param radiusY - Vertical radius
   * @param trackWidth - Width of the track surface
   */
  createOvalTrack(
    centerX: number,
    centerY: number,
    radiusX: number,
    radiusY: number,
    trackWidth: number
  ): Container {
    const track = new Container();
    
    // Outer boundary (grass area beyond track)
    const outer = new Graphics();
    outer.ellipse(centerX, centerY, radiusX + trackWidth / 2 + 30, radiusY + trackWidth / 2 + 30);
    outer.fill(0x2d5a27); // Green grass
    
    // Track surface
    const surface = new Graphics();
    surface.ellipse(centerX, centerY, radiusX + trackWidth / 2, radiusY + trackWidth / 2);
    surface.fill(0x3a3a3a); // Dark gray asphalt
    
    // Inner grass (infield)
    const inner = new Graphics();
    inner.ellipse(centerX, centerY, radiusX - trackWidth / 2, radiusY - trackWidth / 2);
    inner.fill(0x3d7a35); // Slightly different green
    
    // Racing line hint (dashed line in middle of track)
    const racingLine = new Graphics();
    const steps = 60;
    for (let i = 0; i < steps; i++) {
      if (i % 2 === 0) {
        const startAngle = (i / steps) * Math.PI * 2;
        const endAngle = ((i + 1) / steps) * Math.PI * 2;
        
        racingLine.moveTo(
          centerX + Math.cos(startAngle) * radiusX,
          centerY + Math.sin(startAngle) * radiusY
        );
        racingLine.lineTo(
          centerX + Math.cos(endAngle) * radiusX,
          centerY + Math.sin(endAngle) * radiusY
        );
      }
    }
    racingLine.stroke({ width: 2, color: 0xffffff, alpha: 0.3 });
    
    // Start/finish line
    const startLine = new Graphics();
    const startX = centerX + radiusX;
    startLine.rect(startX - 5, centerY - trackWidth / 2, 10, trackWidth);
    startLine.fill(0xffffff);
    
    // Checkered pattern on start line
    const checkerSize = trackWidth / 8;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 2; col++) {
        if ((row + col) % 2 === 0) {
          const checker = new Graphics();
          checker.rect(
            startX - 5 + col * 5,
            centerY - trackWidth / 2 + row * checkerSize,
            5,
            checkerSize
          );
          checker.fill(0x000000);
          track.addChild(checker);
        }
      }
    }
    
    track.addChild(outer);
    track.addChild(surface);
    track.addChild(inner);
    track.addChild(racingLine);
    track.addChild(startLine);
    
    return track;
  }

  /**
   * Unload an asset and free memory.
   * @param alias - The asset alias
   */
  unload(alias: string): void {
    if (this.loadedAssets.has(alias)) {
      Assets.unload(alias);
      this.loadedAssets.delete(alias);
    }
  }

  /**
   * Unload all assets.
   */
  unloadAll(): void {
    for (const alias of this.loadedAssets) {
      Assets.unload(alias);
    }
    this.loadedAssets.clear();
    this.graphicsCache.clear();
  }

  /**
   * Get list of all loaded asset aliases.
   */
  getLoadedAssets(): string[] {
    return [...this.loadedAssets];
  }
}
