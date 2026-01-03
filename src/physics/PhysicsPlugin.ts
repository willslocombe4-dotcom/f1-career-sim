import type { Plugin, GameContext } from '@core/types';
import type { CarState, CarConfig } from './types';
import type { Point } from '@tracks/types';
import { createCarState, DEFAULT_CAR_CONFIG } from './types';
import { updateCarPhysics, constrainToTrackByDistance } from './CarPhysics';
import type { InputState } from '@input/types';
import { DEFAULT_INPUT_STATE } from '@input/types';

/** Track path point for distance-based collision */
interface TrackPathPoint {
  position: Point;
  width: number;
}

/**
 * Plugin that handles car physics simulation.
 * Updates car positions based on input and physics calculations.
 */
export class PhysicsPlugin implements Plugin {
  readonly id = 'physics';
  readonly name = 'Physics Plugin';
  readonly dependencies = ['input'];

  private cars: Map<string, CarState> = new Map();
  private carConfigs: Map<string, CarConfig> = new Map();
  private aiInputs: Map<string, InputState> = new Map();
  private playerCarId: string | null = null;
  
  // Track boundaries for collision (distance-based approach)
  private trackPath: TrackPathPoint[] = [];
  private boundariesSet = false;

  onRegister(_ctx: GameContext): void {
    // Physics plugin registered
  }

  onStart(_ctx: GameContext): void {
    // Physics plugin ready
  }

  onUpdate(deltaTime: number, ctx: GameContext): void {
    // Get player input state
    const playerInput = ctx.getState<InputState>('input') ?? DEFAULT_INPUT_STATE;

    // Update each car
    for (const [carId, state] of this.cars) {
      const config = this.carConfigs.get(carId) ?? DEFAULT_CAR_CONFIG;
      
      // Determine which input to use
      let carInput: InputState;
      if (carId === this.playerCarId) {
        carInput = playerInput;
      } else {
        // Use AI input if set, otherwise no input
        carInput = this.aiInputs.get(carId) ?? DEFAULT_INPUT_STATE;
      }
      
      // Update physics
      let newState = updateCarPhysics(state, carInput, config, deltaTime);
      
      // Apply track boundary constraint using distance-based approach
      if (this.boundariesSet && this.trackPath.length > 0) {
        newState = constrainToTrackByDistance(newState, this.trackPath);
      }
      
      this.cars.set(carId, newState);
    }

    // Store player car state in game state for other systems
    if (this.playerCarId) {
      const playerState = this.cars.get(this.playerCarId);
      if (playerState) {
        ctx.setState('playerCar', playerState);
      }
    }
  }

  onDestroy(): void {
    this.cars.clear();
    this.carConfigs.clear();
    this.aiInputs.clear();
    this.playerCarId = null;
    this.trackPath = [];
    this.boundariesSet = false;
  }

  /**
   * Register a car for physics simulation.
   */
  registerCar(
    id: string,
    x: number,
    y: number,
    rotation: number,
    config: CarConfig = DEFAULT_CAR_CONFIG,
    isPlayer: boolean = false
  ): void {
    this.cars.set(id, createCarState(x, y, rotation));
    this.carConfigs.set(id, config);
    
    if (isPlayer) {
      this.playerCarId = id;
    }
  }

  /**
   * Unregister a car.
   */
  unregisterCar(id: string): void {
    this.cars.delete(id);
    this.carConfigs.delete(id);
    this.aiInputs.delete(id);
    
    if (this.playerCarId === id) {
      this.playerCarId = null;
    }
  }

  /**
   * Get the current state of a car.
   */
  getCarState(id: string): CarState | undefined {
    return this.cars.get(id);
  }

  /**
   * Set the track boundaries for collision detection.
   * Uses distance-based approach which works better for complex track shapes.
   * 
   * @param trackPath Array of track centerline points with position and width
   */
  setTrackBoundaries(trackPath: TrackPathPoint[]): void {
    this.trackPath = trackPath;
    this.boundariesSet = true;
  }

  /**
   * Manually set car state (for teleporting, respawning, etc.)
   */
  setCarState(id: string, state: Partial<CarState>): void {
    const current = this.cars.get(id);
    if (current) {
      this.cars.set(id, { ...current, ...state });
    }
  }

  /**
   * Set AI input for a car.
   * This allows AI drivers to control their cars.
   */
  setAIInput(id: string, input: InputState): void {
    this.aiInputs.set(id, input);
  }

  /**
   * Clear AI input for a car.
   */
  clearAIInput(id: string): void {
    this.aiInputs.delete(id);
  }

  /**
   * Get the player car ID.
   */
  getPlayerCarId(): string | null {
    return this.playerCarId;
  }

  /**
   * Get all car IDs.
   */
  getAllCarIds(): string[] {
    return Array.from(this.cars.keys());
  }
}
