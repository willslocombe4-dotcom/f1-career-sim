import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { GameEventType } from '@core/types';
import type { InputState, InputAction } from '@input/types';
import { DEFAULT_INPUT_STATE } from '@input/types';
import { InputPlugin } from '@input/InputPlugin';
import { EventBus } from '@core/EventBus';
import { StateManager } from '@core/StateManager';
import { PluginManager } from '@core/PluginManager';

describe('Input Event Types', () => {
  it('should have input event types defined', () => {
    // This test verifies the types exist at compile time
    const inputEvents: GameEventType[] = [
      'input:keydown',
      'input:keyup',
    ];
    expect(inputEvents).toHaveLength(2);
  });
});

describe('Input Types', () => {
  it('should define InputAction enum values', () => {
    const actions: InputAction[] = ['accelerate', 'brake', 'steerLeft', 'steerRight'];
    expect(actions).toHaveLength(4);
  });

  it('should define InputState with all actions as booleans', () => {
    const state: InputState = {
      accelerate: false,
      brake: false,
      steerLeft: false,
      steerRight: false,
    };
    expect(state.accelerate).toBe(false);
  });

  it('should have default input state with all false', () => {
    expect(DEFAULT_INPUT_STATE.accelerate).toBe(false);
    expect(DEFAULT_INPUT_STATE.brake).toBe(false);
    expect(DEFAULT_INPUT_STATE.steerLeft).toBe(false);
    expect(DEFAULT_INPUT_STATE.steerRight).toBe(false);
  });
});

describe('InputPlugin', () => {
  let inputPlugin: InputPlugin;
  let pluginManager: PluginManager;
  let stateManager: StateManager;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    stateManager = new StateManager();
    pluginManager = new PluginManager(eventBus, stateManager);
    inputPlugin = new InputPlugin();
    pluginManager.register(inputPlugin);
  });

  afterEach(() => {
    pluginManager.destroyAll();
  });

  describe('plugin metadata', () => {
    it('should have correct id and name', () => {
      expect(inputPlugin.id).toBe('input');
      expect(inputPlugin.name).toBe('Input Plugin');
    });
  });

  describe('input state', () => {
    it('should initialize input state on register', () => {
      const state = stateManager.get<InputState>('input');
      expect(state).toEqual({
        accelerate: false,
        brake: false,
        steerLeft: false,
        steerRight: false,
      });
    });

    it('should update state when key is pressed', () => {
      pluginManager.startAll();
      
      // Simulate keydown event
      const event = new KeyboardEvent('keydown', { code: 'ArrowUp' });
      document.dispatchEvent(event);

      const state = stateManager.get<InputState>('input');
      expect(state?.accelerate).toBe(true);
    });

    it('should update state when key is released', () => {
      pluginManager.startAll();
      
      // Press and release
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
      document.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowUp' }));

      const state = stateManager.get<InputState>('input');
      expect(state?.accelerate).toBe(false);
    });

    it('should handle WASD keys', () => {
      pluginManager.startAll();
      
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      expect(stateManager.get<InputState>('input')?.accelerate).toBe(true);

      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
      expect(stateManager.get<InputState>('input')?.steerLeft).toBe(true);

      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS' }));
      expect(stateManager.get<InputState>('input')?.brake).toBe(true);

      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }));
      expect(stateManager.get<InputState>('input')?.steerRight).toBe(true);
    });

    it('should handle arrow keys', () => {
      pluginManager.startAll();
      
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
      expect(stateManager.get<InputState>('input')?.accelerate).toBe(true);

      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
      expect(stateManager.get<InputState>('input')?.steerLeft).toBe(true);

      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown' }));
      expect(stateManager.get<InputState>('input')?.brake).toBe(true);

      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
      expect(stateManager.get<InputState>('input')?.steerRight).toBe(true);
    });

    it('should handle multiple keys pressed simultaneously', () => {
      pluginManager.startAll();
      
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));

      const state = stateManager.get<InputState>('input');
      expect(state?.accelerate).toBe(true);
      expect(state?.steerLeft).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners on destroy', () => {
      pluginManager.startAll();
      pluginManager.destroyAll();

      // After destroy, key events should not update state
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
      
      // State should still exist but not be updated (or be undefined)
      const state = stateManager.get<InputState>('input');
      expect(state?.accelerate ?? false).toBe(false);
    });
  });

  describe('getInputState()', () => {
    it('should return current input state', () => {
      pluginManager.startAll();
      
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
      
      const state = inputPlugin.getInputState();
      expect(state.accelerate).toBe(true);
    });

    it('should return default state when not started', () => {
      const state = inputPlugin.getInputState();
      expect(state).toEqual(DEFAULT_INPUT_STATE);
    });
  });
});
