import type { Container } from 'pixi.js';
import type { CameraState, ViewportBounds } from './types';

/**
 * Camera/viewport system for following objects and managing the view.
 * Manipulates a container's position to simulate camera movement.
 */
export class Camera {
  private targetContainer: Container | null = null;
  private screenWidth: number;
  private screenHeight: number;
  
  // Camera state
  private x = 0;
  private y = 0;
  private zoom = 1;
  private rotation = 0;
  
  // Smoothing
  private lerpFactor = 0.1;
  private targetX = 0;
  private targetY = 0;
  
  // World bounds (optional)
  private worldBounds: { minX: number; maxX: number; minY: number; maxY: number } | null = null;

  constructor(screenWidth: number, screenHeight: number) {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
  }

  /**
   * Set the container that the camera controls.
   * @param container - The container to transform (usually the game world)
   */
  setTarget(container: Container): void {
    this.targetContainer = container;
  }

  /**
   * Set world bounds to prevent camera from going outside.
   * @param minX - Minimum X coordinate
   * @param maxX - Maximum X coordinate
   * @param minY - Minimum Y coordinate
   * @param maxY - Maximum Y coordinate
   */
  setWorldBounds(minX: number, maxX: number, minY: number, maxY: number): void {
    this.worldBounds = { minX, maxX, minY, maxY };
  }

  /**
   * Clear world bounds.
   */
  clearWorldBounds(): void {
    this.worldBounds = null;
  }

  /**
   * Set the lerp factor for smooth camera movement.
   * @param factor - Value between 0 (no movement) and 1 (instant)
   */
  setLerpFactor(factor: number): void {
    this.lerpFactor = Math.max(0, Math.min(1, factor));
  }

  /**
   * Set camera position directly (for teleporting).
   * @param x - World X coordinate to center on
   * @param y - World Y coordinate to center on
   */
  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.applyTransform();
  }

  /**
   * Move camera target to a position (with smoothing).
   * @param x - World X coordinate to move toward
   * @param y - World Y coordinate to move toward
   */
  moveTo(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  /**
   * Follow a position (call each frame for smooth following).
   * @param x - World X coordinate to follow
   * @param y - World Y coordinate to follow
   */
  follow(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  /**
   * Set the zoom level.
   * @param zoom - Zoom factor (1 = normal, 2 = 2x zoom in)
   */
  setZoom(zoom: number): void {
    this.zoom = Math.max(0.1, Math.min(10, zoom));
    this.applyTransform();
  }

  /**
   * Get current zoom level.
   */
  getZoom(): number {
    return this.zoom;
  }

  /**
   * Set camera rotation.
   * @param rotation - Rotation in radians
   */
  setRotation(rotation: number): void {
    this.rotation = rotation;
    this.applyTransform();
  }

  /**
   * Get current camera state.
   */
  getState(): CameraState {
    return {
      x: this.x,
      y: this.y,
      zoom: this.zoom,
      rotation: this.rotation,
    };
  }

  /**
   * Get the visible viewport bounds in world coordinates.
   */
  getViewportBounds(): ViewportBounds {
    const halfWidth = (this.screenWidth / 2) / this.zoom;
    const halfHeight = (this.screenHeight / 2) / this.zoom;
    
    return {
      left: this.x - halfWidth,
      right: this.x + halfWidth,
      top: this.y - halfHeight,
      bottom: this.y + halfHeight,
      width: halfWidth * 2,
      height: halfHeight * 2,
    };
  }

  /**
   * Convert screen coordinates to world coordinates.
   * @param screenX - Screen X coordinate
   * @param screenY - Screen Y coordinate
   */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const worldX = (screenX - this.screenWidth / 2) / this.zoom + this.x;
    const worldY = (screenY - this.screenHeight / 2) / this.zoom + this.y;
    return { x: worldX, y: worldY };
  }

  /**
   * Convert world coordinates to screen coordinates.
   * @param worldX - World X coordinate
   * @param worldY - World Y coordinate
   */
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    const screenX = (worldX - this.x) * this.zoom + this.screenWidth / 2;
    const screenY = (worldY - this.y) * this.zoom + this.screenHeight / 2;
    return { x: screenX, y: screenY };
  }

  /**
   * Update camera position (call each frame for smooth movement).
   * @param _deltaTime - Time since last frame in seconds (unused but available for physics-based smoothing)
   */
  update(_deltaTime: number): void {
    // Lerp toward target
    this.x += (this.targetX - this.x) * this.lerpFactor;
    this.y += (this.targetY - this.y) * this.lerpFactor;

    // Clamp to world bounds if set
    if (this.worldBounds) {
      const halfWidth = (this.screenWidth / 2) / this.zoom;
      const halfHeight = (this.screenHeight / 2) / this.zoom;

      this.x = Math.max(
        this.worldBounds.minX + halfWidth,
        Math.min(this.worldBounds.maxX - halfWidth, this.x)
      );
      this.y = Math.max(
        this.worldBounds.minY + halfHeight,
        Math.min(this.worldBounds.maxY - halfHeight, this.y)
      );
    }

    this.applyTransform();
  }

  /**
   * Apply the camera transform to the target container.
   */
  private applyTransform(): void {
    if (!this.targetContainer) return;

    // Center the camera on the screen and offset by camera position
    this.targetContainer.x = this.screenWidth / 2 - this.x * this.zoom;
    this.targetContainer.y = this.screenHeight / 2 - this.y * this.zoom;
    this.targetContainer.scale.set(this.zoom);
    this.targetContainer.rotation = this.rotation;
  }

  /**
   * Update screen dimensions (call when window resizes).
   * @param width - New screen width
   * @param height - New screen height
   */
  updateScreenSize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
  }
}
