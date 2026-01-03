import type { Plugin, GameContext } from '@core/types';
import type { InputState, InputAction, KeyMapping } from './types';
import { DEFAULT_INPUT_STATE, DEFAULT_KEY_MAPPING } from './types';

/**
 * Plugin that handles keyboard input for car control.
 * Captures key events and updates input state that other systems can read.
 */
export class InputPlugin implements Plugin {
  readonly id = 'input';
  readonly name = 'Input Plugin';

  private keyMapping: KeyMapping;
  private gameContext: GameContext | null = null;
  private boundKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private boundKeyUp: ((e: KeyboardEvent) => void) | null = null;

  constructor(keyMapping: KeyMapping = DEFAULT_KEY_MAPPING) {
    this.keyMapping = keyMapping;
  }

  onRegister(ctx: GameContext): void {
    this.gameContext = ctx;
    // Initialize input state
    ctx.setState<InputState>('input', { ...DEFAULT_INPUT_STATE });
  }

  onStart(_ctx: GameContext): void {
    // Bind event handlers
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);

    document.addEventListener('keydown', this.boundKeyDown);
    document.addEventListener('keyup', this.boundKeyUp);
  }

  onDestroy(): void {
    // Remove event listeners
    if (this.boundKeyDown) {
      document.removeEventListener('keydown', this.boundKeyDown);
      this.boundKeyDown = null;
    }
    if (this.boundKeyUp) {
      document.removeEventListener('keyup', this.boundKeyUp);
      this.boundKeyUp = null;
    }
    this.gameContext = null;
  }

  /**
   * Get the current input state.
   */
  getInputState(): InputState {
    return this.gameContext?.getState<InputState>('input') ?? { ...DEFAULT_INPUT_STATE };
  }

  /**
   * Handle keydown events.
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.gameContext) return;

    const action = this.getActionForKey(event.code);
    if (action) {
      // Prevent default browser behavior for game keys
      event.preventDefault();
      this.updateInputState(action, true);
    }
  }

  /**
   * Handle keyup events.
   */
  private handleKeyUp(event: KeyboardEvent): void {
    if (!this.gameContext) return;

    const action = this.getActionForKey(event.code);
    if (action) {
      event.preventDefault();
      this.updateInputState(action, false);
    }
  }

  /**
   * Map a key code to an input action.
   */
  private getActionForKey(code: string): InputAction | null {
    for (const [action, keys] of Object.entries(this.keyMapping)) {
      if (keys.includes(code)) {
        return action as InputAction;
      }
    }
    return null;
  }

  /**
   * Update the input state for an action.
   */
  private updateInputState(action: InputAction, pressed: boolean): void {
    if (!this.gameContext) return;

    const currentState = this.gameContext.getState<InputState>('input') ?? { ...DEFAULT_INPUT_STATE };
    const newState: InputState = {
      ...currentState,
      [action]: pressed,
    };
    this.gameContext.setState<InputState>('input', newState);
  }
}
