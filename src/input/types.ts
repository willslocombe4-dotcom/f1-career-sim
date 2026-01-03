/**
 * Input system type definitions.
 * Defines the shape of input state and available actions.
 */

// ============================================
// Input Action Types
// ============================================

/** Available input actions for car control */
export type InputAction = 'accelerate' | 'brake' | 'steerLeft' | 'steerRight';

/** Current state of all input actions */
export interface InputState {
  accelerate: boolean;
  brake: boolean;
  steerLeft: boolean;
  steerRight: boolean;
}

/** Default input state (all keys released) */
export const DEFAULT_INPUT_STATE: InputState = {
  accelerate: false,
  brake: false,
  steerLeft: false,
  steerRight: false,
};

// ============================================
// Key Mapping Types
// ============================================

/** Maps keyboard keys to input actions */
export interface KeyMapping {
  accelerate: string[];
  brake: string[];
  steerLeft: string[];
  steerRight: string[];
}

/** Default key mappings (Arrow keys + WASD) */
export const DEFAULT_KEY_MAPPING: KeyMapping = {
  accelerate: ['ArrowUp', 'KeyW'],
  brake: ['ArrowDown', 'KeyS'],
  steerLeft: ['ArrowLeft', 'KeyA'],
  steerRight: ['ArrowRight', 'KeyD'],
};

// ============================================
// Event Payload Types
// ============================================

/** Payload for input key events */
export interface InputKeyPayload {
  timestamp: number;
  key: string;
  action: InputAction | null;
}
