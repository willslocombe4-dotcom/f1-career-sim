import { Container } from 'pixi.js';
import { Game } from '@core/Game';
import type { Plugin, GameContext, FrameUpdatePayload } from '@core/types';
import { RenderPlugin } from '@rendering/index';
import { TrackBuilder, TrackRenderer, defaultTrackLoader } from '@tracks/index';
import type { ComputedTrack, RacingLinePoint } from '@tracks/types';
import { InputPlugin } from '@input/index';
import { PhysicsPlugin, AIDriver } from '@physics/index';

console.log('F1 Career Simulation initializing...');

/**
 * Stats plugin for FPS display
 */
const StatsPlugin: Plugin = {
  id: 'stats',
  name: 'Stats Plugin',
  dependencies: ['renderer'],

  onStart(ctx: GameContext): void {
    ctx.setState('stats.fps', 0);

    let lastTime = performance.now();
    let frameCount = 0;

    ctx.on<FrameUpdatePayload>('frame:update', () => {
      frameCount++;
      const now = performance.now();
      const elapsed = now - lastTime;

      if (elapsed >= 1000) {
        const fps = Math.round((frameCount * 1000) / elapsed);
        ctx.setState('stats.fps', fps);
        updateFpsDisplay(fps);
        frameCount = 0;
        lastTime = now;
      }
    });
  },
};

function updateFpsDisplay(fps: number): void {
  let fpsElement = document.getElementById('fps-display');
  if (!fpsElement) {
    fpsElement = document.createElement('div');
    fpsElement.id = 'fps-display';
    fpsElement.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.7);
      color: #00ff00;
      font-family: monospace;
      font-size: 14px;
      border-radius: 4px;
      z-index: 1000;
    `;
    document.body.appendChild(fpsElement);
  }
  fpsElement.textContent = `FPS: ${fps}`;
}

/**
 * Demo racing plugin - shows cars racing with physics-based player control
 */
const DemoRacingPlugin: Plugin = {
  id: 'demo-racing',
  name: 'Demo Racing Plugin',
  dependencies: ['renderer', 'physics'],

  onStart(ctx: GameContext): void {
    const renderPlugin = ctx.getPlugin<RenderPlugin>('renderer');
    const physicsPlugin = ctx.getPlugin<PhysicsPlugin>('physics');
    
    if (!renderPlugin || !physicsPlugin) {
      console.error('Required plugins not found');
      return;
    }

    const spriteManager = renderPlugin.getSpriteManager();
    const camera = renderPlugin.getCamera();

    // Get URL param for track selection, default to bergheim
    const urlParams = new URLSearchParams(window.location.search);
    const trackId = urlParams.get('track') || 'bergheim';

    // Load track data
    let trackData;
    try {
      trackData = defaultTrackLoader.getTrack(trackId);
    } catch (e) {
      console.warn(`Track "${trackId}" not found, using bergheim`);
      trackData = defaultTrackLoader.getTrack('bergheim');
    }

    console.log(`[DemoRacing] Loading track: ${trackData.name}`);

    // Build and render the track
    const trackBuilder = new TrackBuilder(25);
    const computedTrack = trackBuilder.build(trackData);

    const trackRenderer = new TrackRenderer({
      showRacingLine: true,
      showKerbs: true,
    });
    const trackContainer = trackRenderer.render(computedTrack);

    // Center the track in view
    const bounds = getTrackBounds(computedTrack);
    const trackCenterX = (bounds.minX + bounds.maxX) / 2;
    const trackCenterY = (bounds.minY + bounds.maxY) / 2;
    trackContainer.x = -trackCenterX;
    trackContainer.y = -trackCenterY;

    renderPlugin.addToWorld(trackContainer);

    // Set up physics boundaries using track path (offset by track center)
    const offsetTrackPath = computedTrack.path.map(p => ({
      position: { x: p.position.x - trackCenterX, y: p.position.y - trackCenterY },
      width: p.width,
    }));
    
    physicsPlugin.setTrackBoundaries(offsetTrackPath);

    // Get starting position from racing line
    const startPoint = computedTrack.racingLine[0];
    const nextPoint = computedTrack.racingLine[1];
    const startAngle = Math.atan2(
      nextPoint.position.y - startPoint.position.y,
      nextPoint.position.x - startPoint.position.x
    );
    const startX = startPoint.position.x - trackCenterX;
    const startY = startPoint.position.y - trackCenterY;

    // Create player car (red - Ferrari style)
    const playerCar = spriteManager.createCarGraphic(0xe10600, 40, 20);
    playerCar.label = 'player-car';
    renderPlugin.addToWorld(playerCar);

    // Register player car with physics
    physicsPlugin.registerCar('player', startX, startY, startAngle, undefined, true);

    // Create AI cars with different team colors and skill levels
    const aiConfigs = [
      { color: 0x00d2be, skill: 0.88, aggression: 0.75 }, // Mercedes - fast
      { color: 0x0600ef, skill: 0.85, aggression: 0.80 }, // Red Bull - aggressive
      { color: 0xff8700, skill: 0.82, aggression: 0.70 }, // McLaren - balanced
      { color: 0x006f62, skill: 0.78, aggression: 0.65 }, // Aston Martin - cautious
      { color: 0x2b4562, skill: 0.75, aggression: 0.60 }, // Alpine - learning
    ];

    const aiCars: Container[] = [];
    const aiDrivers: AIDriver[] = [];
    const racingLine = computedTrack.racingLine;

    // Offset the racing line for physics (same as track offset)
    const offsetRacingLine = racingLine.map(p => ({
      ...p,
      position: { x: p.position.x - trackCenterX, y: p.position.y - trackCenterY }
    }));

    for (let i = 0; i < aiConfigs.length; i++) {
      const config = aiConfigs[i];
      
      // Create AI car sprite
      const aiCar = spriteManager.createCarGraphic(config.color, 40, 20);
      aiCar.label = `ai-car-${i}`;
      renderPlugin.addToWorld(aiCar);
      aiCars.push(aiCar);
      
      // Create AI driver with skill and aggression (maxSpeed should match physics config)
      const aiDriver = new AIDriver(config.skill, config.aggression, 180);
      aiDriver.setRacingLine(offsetRacingLine);
      aiDrivers.push(aiDriver);
      
      // Start AI cars spread out behind player
      const startProgress = 0.97 - (i * 0.04); // 97%, 93%, 89%, 85%, 81%
      const aiStartPoint = getPointOnRacingLine(racingLine, startProgress);
      const aiNextPoint = getPointOnRacingLine(racingLine, (startProgress + 0.01) % 1);
      const aiStartAngle = Math.atan2(
        aiNextPoint.position.y - aiStartPoint.position.y,
        aiNextPoint.position.x - aiStartPoint.position.x
      );
      const aiStartX = aiStartPoint.position.x - trackCenterX;
      const aiStartY = aiStartPoint.position.y - trackCenterY;
      
      // Register AI car with physics (same physics as player!)
      physicsPlugin.registerCar(`ai-${i}`, aiStartX, aiStartY, aiStartAngle);
    }

    // Camera follows player
    camera.setLerpFactor(0.08);
    camera.setPosition(startX, startY);

    // Update track info display
    updateTrackInfo(trackData.name, trackData.country, trackData.lengthMeters, trackData.characteristics || '');

    // Subscribe to frame updates
    ctx.on<FrameUpdatePayload>('frame:update', (_payload) => {
      // Get player car state from physics
      const playerState = physicsPlugin.getCarState('player');
      if (playerState) {
        // Update player car visual
        playerCar.x = playerState.x;
        playerCar.y = playerState.y;
        playerCar.rotation = playerState.rotation;

        // Camera follows player car
        camera.follow(playerState.x, playerState.y);

        // Update speed display
        updateSpeedDisplay(playerState.speed);
      }

      // Update AI cars using same physics as player
      for (let i = 0; i < aiCars.length; i++) {
        const aiCarId = `ai-${i}`;
        const aiState = physicsPlugin.getCarState(aiCarId);
        
        if (aiState) {
          // Generate AI input based on racing line
          const aiInput = aiDrivers[i].generateInput(aiState);
          physicsPlugin.setAIInput(aiCarId, aiInput);
          
          // Update AI car visual from physics state
          aiCars[i].x = aiState.x;
          aiCars[i].y = aiState.y;
          aiCars[i].rotation = aiState.rotation;
        }
      }
    });

    console.log(`[DemoRacing] Track "${trackData.name}" loaded with physics-based player control`);
  },
};

/**
 * Update speed display HUD element.
 */
function updateSpeedDisplay(speed: number): void {
  let speedElement = document.getElementById('speed-display');
  if (!speedElement) {
    speedElement = document.createElement('div');
    speedElement.id = 'speed-display';
    speedElement.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      padding: 12px 16px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      font-family: monospace;
      font-size: 24px;
      border-radius: 4px;
      z-index: 1000;
      min-width: 120px;
      text-align: center;
    `;
    document.body.appendChild(speedElement);
  }
  // Convert to "km/h" style display (arbitrary scaling for arcade feel)
  const displaySpeed = Math.round(speed * 0.6);
  speedElement.textContent = `${displaySpeed} km/h`;
}

/**
 * Get a point on the racing line at a given progress (0-1).
 */
function getPointOnRacingLine(racingLine: RacingLinePoint[], progress: number): RacingLinePoint {
  const normalizedProgress = progress % 1;
  
  let closestIdx = 0;
  let closestDist = Infinity;
  
  for (let i = 0; i < racingLine.length; i++) {
    const dist = Math.abs(racingLine[i].progress - normalizedProgress);
    const wrapDist = Math.min(dist, 1 - dist);
    if (wrapDist < closestDist) {
      closestDist = wrapDist;
      closestIdx = i;
    }
  }

  const nextIdx = (closestIdx + 1) % racingLine.length;
  const curr = racingLine[closestIdx];
  const next = racingLine[nextIdx];

  let progressDiff = normalizedProgress - curr.progress;
  if (progressDiff < -0.5) progressDiff += 1;
  if (progressDiff > 0.5) progressDiff -= 1;

  let segmentLength = next.progress - curr.progress;
  if (segmentLength < -0.5) segmentLength += 1;
  if (segmentLength > 0.5) segmentLength -= 1;
  if (segmentLength === 0) segmentLength = 0.001;

  const t = Math.max(0, Math.min(1, progressDiff / segmentLength));

  return {
    position: {
      x: curr.position.x + (next.position.x - curr.position.x) * t,
      y: curr.position.y + (next.position.y - curr.position.y) * t,
    },
    speedFactor: curr.speedFactor + (next.speedFactor - curr.speedFactor) * t,
    progress: normalizedProgress,
  };
}

/**
 * Get bounding box of computed track.
 */
function getTrackBounds(track: ComputedTrack): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const p of track.outerBoundary) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }

  return { minX, maxX, minY, maxY };
}

/**
 * Update the track info display.
 */
function updateTrackInfo(name: string, country: string, lengthMeters: number, characteristics: string): void {
  let trackInfoElement = document.getElementById('track-info');
  if (!trackInfoElement) {
    trackInfoElement = document.createElement('div');
    trackInfoElement.id = 'track-info';
    trackInfoElement.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      padding: 12px 16px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      font-family: sans-serif;
      font-size: 14px;
      border-radius: 4px;
      z-index: 1000;
      max-width: 300px;
    `;
    document.body.appendChild(trackInfoElement);
  }
  
  trackInfoElement.innerHTML = `
    <div style="font-weight: bold; font-size: 16px; margin-bottom: 4px;">${name}</div>
    <div style="color: #aaa; margin-bottom: 8px;">${country} - ${(lengthMeters / 1000).toFixed(3)} km</div>
    <div style="font-size: 12px; color: #888; line-height: 1.4;">${characteristics}</div>
  `;
}

async function main(): Promise<void> {
  const container = document.getElementById('game-container');
  if (!container) {
    throw new Error('Game container not found');
  }

  const gameWidth = 1280;
  const gameHeight = 720;

  // Create game instance
  const game = new Game({
    containerId: 'game-container',
    width: gameWidth,
    height: gameHeight,
    debug: true,
  });

  // Create and initialize the render plugin
  const renderPlugin = new RenderPlugin();
  await renderPlugin.initialize('game-container', gameWidth, gameHeight);

  // Create input and physics plugins
  const inputPlugin = new InputPlugin();
  const physicsPlugin = new PhysicsPlugin();

  // Register plugins (order matters for dependencies)
  game.use(renderPlugin);
  game.use(inputPlugin);
  game.use(physicsPlugin);
  game.use(StatsPlugin);
  game.use(DemoRacingPlugin);

  // Subscribe to lifecycle events
  game.eventBus.on('game:init', () => {
    console.log('[Main] Game initializing...');
  });

  game.eventBus.on('game:start', () => {
    console.log('[Main] Game loop started');
  });

  game.eventBus.on('game:stop', () => {
    console.log('[Main] Game stopped');
  });

  // Start the game
  console.log('Starting game...');
  await game.start();
  console.log('Game started!');

  // Expose to window for debugging
  if (game.config.debug) {
    (window as unknown as { game: Game; renderPlugin: RenderPlugin }).game = game;
    (window as unknown as { renderPlugin: RenderPlugin }).renderPlugin = renderPlugin;
    console.log('[Debug] Game exposed as window.game');
    console.log('[Debug] RenderPlugin exposed as window.renderPlugin');
  }

  // Keyboard controls (non-game controls)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'p') {
      if (game.isPaused()) {
        game.resume();
      } else {
        game.pause();
      }
    } else if (e.key === 'Escape') {
      game.stop();
    } else if (e.key === '+' || e.key === '=') {
      const camera = renderPlugin.getCamera();
      camera.setZoom(camera.getZoom() * 1.2);
    } else if (e.key === '-' || e.key === '_') {
      const camera = renderPlugin.getCamera();
      camera.setZoom(camera.getZoom() / 1.2);
    } else if (e.key === '1') {
      window.location.search = '?track=porto-azzurro';
    } else if (e.key === '2') {
      window.location.search = '?track=velocita';
    } else if (e.key === '3') {
      window.location.search = '?track=bergheim';
    }
  });

  // Info overlay
  const infoElement = document.createElement('div');
  infoElement.style.cssText = `
    position: fixed;
    bottom: 10px;
    left: 10px;
    padding: 12px 16px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    font-family: sans-serif;
    font-size: 14px;
    border-radius: 4px;
    z-index: 1000;
  `;
  infoElement.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 8px;">F1 Career Sim - Player Controls</div>
    <div><kbd style="background: #333; padding: 2px 6px; border-radius: 3px;">W/Up</kbd> Accelerate</div>
    <div><kbd style="background: #333; padding: 2px 6px; border-radius: 3px;">S/Down</kbd> Brake</div>
    <div><kbd style="background: #333; padding: 2px 6px; border-radius: 3px;">A/Left</kbd> <kbd style="background: #333; padding: 2px 6px; border-radius: 3px;">D/Right</kbd> Steer</div>
    <div style="margin-top: 8px;">
      <kbd style="background: #333; padding: 2px 6px; border-radius: 3px;">1-3</kbd> Change track | 
      <kbd style="background: #333; padding: 2px 6px; border-radius: 3px;">P</kbd> Pause | 
      <kbd style="background: #333; padding: 2px 6px; border-radius: 3px;">+/-</kbd> Zoom
    </div>
  `;
  document.body.appendChild(infoElement);

  // Show available tracks
  console.log('[Main] Available tracks:', defaultTrackLoader.getAvailableTrackIds().join(', '));
}

main().catch((error) => {
  console.error('Failed to initialize game:', error);
});
