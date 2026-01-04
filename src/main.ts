import { Container } from 'pixi.js';
import { Game } from '@core/Game';
import type { Plugin, GameContext, FrameUpdatePayload } from '@core/types';
import { RenderPlugin } from '@rendering/index';
import { TrackBuilder, TrackRenderer, defaultTrackLoader } from '@tracks/index';
import type { ComputedTrack, RacingLinePoint, RacingLineType } from '@tracks/types';
import { InputPlugin } from '@input/index';
import { PhysicsPlugin, AIDriver } from '@physics/index';
import type { CarState } from '@physics/types';

console.log('F1 Career Simulation initializing...');

// ============================================
// Game State Types
// ============================================

type GameState = 'menu' | 'racing' | 'finished';

interface CarRaceData {
  lap: number;
  lastProgress: number;
  finished: boolean;
  finishOrder: number; // 0 = not finished, 1 = first, 2 = second, etc.
}

interface RaceState {
  totalLaps: number;
  raceStarted: boolean;
  raceFinished: boolean;
  finishCount: number; // How many cars have finished
  carData: Map<string, CarRaceData>; // Lap tracking for all cars
}

// ============================================
// UI Elements
// ============================================

let trackSelectionScreen: HTMLElement | null = null;
let raceFinishScreen: HTMLElement | null = null;
let lapDisplay: HTMLElement | null = null;
let currentGameState: GameState = 'menu';
let selectedTrackId: string = 'bergheim';
let gameInstance: Game | null = null;
let raceState: RaceState = {
  totalLaps: 5,
  raceStarted: false,
  raceFinished: false,
  finishCount: 0,
  carData: new Map(),
};

/**
 * Create track selection screen
 */
function createTrackSelectionScreen(): HTMLElement {
  const screen = document.createElement('div');
  screen.id = 'track-selection-screen';
  screen.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  `;

  // Title
  const title = document.createElement('h1');
  title.textContent = 'F1 CAREER SIMULATION';
  title.style.cssText = `
    color: #e94560;
    font-size: 48px;
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 4px;
    text-shadow: 0 0 20px rgba(233, 69, 96, 0.5);
  `;
  screen.appendChild(title);

  // Subtitle
  const subtitle = document.createElement('p');
  subtitle.textContent = 'Select Your Track';
  subtitle.style.cssText = `
    color: #aaa;
    font-size: 18px;
    margin-bottom: 40px;
  `;
  screen.appendChild(subtitle);

  // Track container
  const trackContainer = document.createElement('div');
  trackContainer.style.cssText = `
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
    justify-content: center;
    max-width: 900px;
  `;

  // Get available tracks
  const trackIds = defaultTrackLoader.getAvailableTrackIds();
  
  trackIds.forEach((trackId) => {
    const trackData = defaultTrackLoader.getTrack(trackId);
    
    const trackCard = document.createElement('div');
    trackCard.style.cssText = `
      background: rgba(255, 255, 255, 0.05);
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 24px;
      width: 250px;
      cursor: pointer;
      transition: all 0.3s ease;
      text-align: center;
    `;
    
    trackCard.onmouseenter = () => {
      trackCard.style.background = 'rgba(233, 69, 96, 0.2)';
      trackCard.style.borderColor = '#e94560';
      trackCard.style.transform = 'translateY(-5px)';
    };
    
    trackCard.onmouseleave = () => {
      trackCard.style.background = 'rgba(255, 255, 255, 0.05)';
      trackCard.style.borderColor = 'rgba(255, 255, 255, 0.1)';
      trackCard.style.transform = 'translateY(0)';
    };
    
    trackCard.onclick = () => {
      selectedTrackId = trackId;
      startRace();
    };

    const trackName = document.createElement('h3');
    trackName.textContent = trackData.name;
    trackName.style.cssText = `
      color: white;
      font-size: 20px;
      margin: 0 0 8px 0;
    `;
    trackCard.appendChild(trackName);

    const trackCountry = document.createElement('p');
    trackCountry.textContent = trackData.country;
    trackCountry.style.cssText = `
      color: #888;
      font-size: 14px;
      margin: 0 0 12px 0;
    `;
    trackCard.appendChild(trackCountry);

    const trackLength = document.createElement('p');
    trackLength.textContent = `${(trackData.lengthMeters / 1000).toFixed(3)} km`;
    trackLength.style.cssText = `
      color: #e94560;
      font-size: 16px;
      font-weight: bold;
      margin: 0 0 8px 0;
    `;
    trackCard.appendChild(trackLength);

    if (trackData.characteristics) {
      const trackChars = document.createElement('p');
      trackChars.textContent = trackData.characteristics;
      trackChars.style.cssText = `
        color: #666;
        font-size: 12px;
        margin: 0;
        line-height: 1.4;
      `;
      trackCard.appendChild(trackChars);
    }

    trackContainer.appendChild(trackCard);
  });

  screen.appendChild(trackContainer);

  // Race info
  const raceInfo = document.createElement('p');
  raceInfo.textContent = '5 Lap Race';
  raceInfo.style.cssText = `
    color: #666;
    font-size: 14px;
    margin-top: 40px;
  `;
  screen.appendChild(raceInfo);

  document.body.appendChild(screen);
  return screen;
}

/**
 * Create race finish screen
 */
function createRaceFinishScreen(positions: { id: string; name: string }[]): HTMLElement {
  const screen = document.createElement('div');
  screen.id = 'race-finish-screen';
  screen.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  `;

  // Check if player won
  const playerPosition = positions.findIndex(p => p.id === 'player') + 1;
  
  // Title
  const title = document.createElement('h1');
  title.textContent = playerPosition === 1 ? 'VICTORY!' : 'RACE COMPLETE';
  title.style.cssText = `
    color: ${playerPosition === 1 ? '#ffd700' : '#e94560'};
    font-size: 56px;
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 4px;
    text-shadow: 0 0 30px ${playerPosition === 1 ? 'rgba(255, 215, 0, 0.5)' : 'rgba(233, 69, 96, 0.5)'};
  `;
  screen.appendChild(title);

  // Player position
  const positionText = document.createElement('p');
  positionText.textContent = `You finished P${playerPosition}`;
  positionText.style.cssText = `
    color: white;
    font-size: 24px;
    margin-bottom: 40px;
  `;
  screen.appendChild(positionText);

  // Results table
  const resultsContainer = document.createElement('div');
  resultsContainer.style.cssText = `
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 24px;
    min-width: 300px;
  `;

  const resultsTitle = document.createElement('h3');
  resultsTitle.textContent = 'Final Standings';
  resultsTitle.style.cssText = `
    color: #aaa;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 2px;
    margin: 0 0 16px 0;
    text-align: center;
  `;
  resultsContainer.appendChild(resultsTitle);

  positions.forEach((pos, index) => {
    const row = document.createElement('div');
    row.style.cssText = `
      display: flex;
      align-items: center;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 8px;
      background: ${pos.id === 'player' ? 'rgba(233, 69, 96, 0.2)' : 'transparent'};
    `;

    const posNum = document.createElement('span');
    posNum.textContent = `P${index + 1}`;
    posNum.style.cssText = `
      color: ${index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#666'};
      font-weight: bold;
      font-size: 18px;
      width: 50px;
    `;
    row.appendChild(posNum);

    const name = document.createElement('span');
    name.textContent = pos.name;
    name.style.cssText = `
      color: ${pos.id === 'player' ? '#e94560' : 'white'};
      font-size: 16px;
      font-weight: ${pos.id === 'player' ? 'bold' : 'normal'};
    `;
    row.appendChild(name);

    resultsContainer.appendChild(row);
  });

  screen.appendChild(resultsContainer);

  // Buttons
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    display: flex;
    gap: 20px;
    margin-top: 40px;
  `;

  const restartBtn = document.createElement('button');
  restartBtn.textContent = 'Race Again';
  restartBtn.style.cssText = `
    background: #e94560;
    border: none;
    color: white;
    padding: 16px 32px;
    font-size: 18px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
  `;
  restartBtn.onmouseenter = () => { restartBtn.style.background = '#ff6b6b'; };
  restartBtn.onmouseleave = () => { restartBtn.style.background = '#e94560'; };
  restartBtn.onclick = () => {
    hideRaceFinishScreen();
    startRace();
  };
  buttonContainer.appendChild(restartBtn);

  const menuBtn = document.createElement('button');
  menuBtn.textContent = 'Change Track';
  menuBtn.style.cssText = `
    background: transparent;
    border: 2px solid #666;
    color: white;
    padding: 16px 32px;
    font-size: 18px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
  `;
  menuBtn.onmouseenter = () => { menuBtn.style.borderColor = '#e94560'; };
  menuBtn.onmouseleave = () => { menuBtn.style.borderColor = '#666'; };
  menuBtn.onclick = () => {
    hideRaceFinishScreen();
    showTrackSelection();
  };
  buttonContainer.appendChild(menuBtn);

  screen.appendChild(buttonContainer);

  document.body.appendChild(screen);
  return screen;
}

/**
 * Create/update lap display
 */
function updateLapDisplay(currentLap: number, totalLaps: number): void {
  if (!lapDisplay) {
    lapDisplay = document.createElement('div');
    lapDisplay.id = 'lap-display';
    lapDisplay.style.cssText = `
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      font-family: monospace;
      font-size: 24px;
      border-radius: 8px;
      z-index: 1000;
    `;
    document.body.appendChild(lapDisplay);
  }
  
  const displayLap = Math.min(currentLap, totalLaps);
  lapDisplay.innerHTML = `LAP <span style="color: #e94560; font-weight: bold;">${displayLap}</span> / ${totalLaps}`;
}

/**
 * Hide lap display
 */
function hideLapDisplay(): void {
  if (lapDisplay) {
    lapDisplay.remove();
    lapDisplay = null;
  }
}

/**
 * Show track selection screen
 */
function showTrackSelection(): void {
  currentGameState = 'menu';
  if (gameInstance) {
    gameInstance.pause();
  }
  
  // Clear any existing game UI
  const speedDisplay = document.getElementById('speed-display');
  const trackInfo = document.getElementById('track-info');
  const infoOverlay = document.getElementById('info-overlay');
  speedDisplay?.remove();
  trackInfo?.remove();
  infoOverlay?.remove();
  hideLapDisplay();
  
  if (!trackSelectionScreen) {
    trackSelectionScreen = createTrackSelectionScreen();
  }
  trackSelectionScreen.style.display = 'flex';
}

/**
 * Hide track selection screen
 */
function hideTrackSelection(): void {
  if (trackSelectionScreen) {
    trackSelectionScreen.style.display = 'none';
  }
}

/**
 * Show race finish screen
 */
function showRaceFinishScreen(positions: { id: string; name: string }[]): void {
  currentGameState = 'finished';
  if (gameInstance) {
    gameInstance.pause();
  }
  hideLapDisplay();
  
  if (raceFinishScreen) {
    raceFinishScreen.remove();
  }
  raceFinishScreen = createRaceFinishScreen(positions);
}

/**
 * Hide race finish screen
 */
function hideRaceFinishScreen(): void {
  if (raceFinishScreen) {
    raceFinishScreen.remove();
    raceFinishScreen = null;
  }
}

/**
 * Start a race with the selected track
 */
function startRace(): void {
  hideTrackSelection();
  hideRaceFinishScreen();
  
  // Reset race state
  raceState = {
    totalLaps: 5,
    raceStarted: false,
    raceFinished: false,
    finishCount: 0,
    carData: new Map(),
  };
  
  currentGameState = 'racing';
  updateLapDisplay(0, raceState.totalLaps);
  
  // Reload with selected track
  window.location.search = `?track=${selectedTrackId}`;
}

// ============================================
// Stats Plugin
// ============================================

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

// ============================================
// Demo Racing Plugin
// ============================================

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

    // Get URL param for track selection
    const urlParams = new URLSearchParams(window.location.search);
    const trackId = urlParams.get('track') || 'bergheim';
    selectedTrackId = trackId;

    // Check if coming from menu or direct load
    if (!urlParams.has('track')) {
      // Show track selection if no track specified
      setTimeout(() => showTrackSelection(), 100);
      return;
    }

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

    // Set up physics boundaries
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

    // Create player car
    const playerCar = spriteManager.createCarGraphic(0xe10600, 40, 20);
    playerCar.label = 'player-car';
    renderPlugin.addToWorld(playerCar);
    physicsPlugin.registerCar('player', startX, startY, startAngle, undefined, true);

    // AI car configs with team names
    const aiConfigs: Array<{ color: number; skill: number; aggression: number; lineType: RacingLineType; name: string }> = [
      { color: 0x00d2be, skill: 0.98, aggression: 0.85, lineType: 'optimal', name: 'Mercedes' },
      { color: 0x0600ef, skill: 0.97, aggression: 0.90, lineType: 'overtaking', name: 'Red Bull' },
      { color: 0xff8700, skill: 0.96, aggression: 0.80, lineType: 'optimal', name: 'McLaren' },
      { color: 0x006f62, skill: 0.95, aggression: 0.75, lineType: 'defensive', name: 'Aston Martin' },
      { color: 0x2b4562, skill: 0.94, aggression: 0.85, lineType: 'overtaking', name: 'Alpine' },
    ];

    const aiCars: Container[] = [];
    const aiDrivers: AIDriver[] = [];
    const carNames: Map<string, string> = new Map([['player', 'You (Ferrari)']]);

    // Offset racing lines
    const offsetRacingLines: Record<RacingLineType, RacingLinePoint[]> = {
      optimal: computedTrack.racingLines.optimal.map(p => ({
        ...p,
        position: { x: p.position.x - trackCenterX, y: p.position.y - trackCenterY }
      })),
      overtaking: computedTrack.racingLines.overtaking.map(p => ({
        ...p,
        position: { x: p.position.x - trackCenterX, y: p.position.y - trackCenterY }
      })),
      defensive: computedTrack.racingLines.defensive.map(p => ({
        ...p,
        position: { x: p.position.x - trackCenterX, y: p.position.y - trackCenterY }
      })),
    };

    // Offset racing line for lap detection
    const offsetRacingLine = computedTrack.racingLine.map(p => ({
      ...p,
      position: { x: p.position.x - trackCenterX, y: p.position.y - trackCenterY }
    }));

    for (let i = 0; i < aiConfigs.length; i++) {
      const config = aiConfigs[i];
      
      const aiCar = spriteManager.createCarGraphic(config.color, 40, 20);
      aiCar.label = `ai-car-${i}`;
      renderPlugin.addToWorld(aiCar);
      aiCars.push(aiCar);
      
      const aiDriver = new AIDriver(config.skill, config.aggression, 360);
      aiDriver.setRacingLines(offsetRacingLines);
      aiDriver.setLineType(config.lineType);
      aiDrivers.push(aiDriver);
      
      carNames.set(`ai-${i}`, config.name);
      
      const startProgress = 0.98 - (i * 0.015);
      const aiStartPoint = getPointOnRacingLine(computedTrack.racingLine, startProgress);
      const aiNextPoint = getPointOnRacingLine(computedTrack.racingLine, (startProgress + 0.01) % 1);
      const aiStartAngle = Math.atan2(
        aiNextPoint.position.y - aiStartPoint.position.y,
        aiNextPoint.position.x - aiStartPoint.position.x
      );
      const aiStartX = aiStartPoint.position.x - trackCenterX;
      const aiStartY = aiStartPoint.position.y - trackCenterY;
      
      physicsPlugin.registerCar(`ai-${i}`, aiStartX, aiStartY, aiStartAngle);
    }

    camera.setLerpFactor(0.08);
    camera.setPosition(startX, startY);

    updateTrackInfo(trackData.name, trackData.country, trackData.lengthMeters, trackData.characteristics || '');
    updateLapDisplay(0, raceState.totalLaps);
    
    currentGameState = 'racing';

    // Initialize race data for all cars
    const allCarIds = ['player', ...aiConfigs.map((_, i) => `ai-${i}`)];
    for (const carId of allCarIds) {
      raceState.carData.set(carId, {
        lap: 0,
        lastProgress: 0,
        finished: false,
        finishOrder: 0,
      });
    }

    // Frame update handler
    ctx.on<FrameUpdatePayload>('frame:update', () => {
      if (currentGameState !== 'racing' || raceState.raceFinished) return;

      const playerState = physicsPlugin.getCarState('player');
      if (playerState) {
        playerCar.x = playerState.x;
        playerCar.y = playerState.y;
        playerCar.rotation = playerState.rotation;
        camera.follow(playerState.x, playerState.y);
        updateSpeedDisplay(playerState.speed);
      }

      // Collect all car states
      const allCarStates: { id: string; state: CarState }[] = [];
      if (playerState) {
        allCarStates.push({ id: 'player', state: playerState });
      }
      for (let i = 0; i < aiCars.length; i++) {
        const state = physicsPlugin.getCarState(`ai-${i}`);
        if (state) {
          allCarStates.push({ id: `ai-${i}`, state });
        }
      }

      // Track laps for ALL cars
      for (const { id, state } of allCarStates) {
        const carData = raceState.carData.get(id);
        if (!carData || carData.finished) continue;

        const currentProgress = getCarProgress(state, offsetRacingLine);
        
        // Start race when any car moves past start
        if (!raceState.raceStarted && currentProgress > 0.02) {
          raceState.raceStarted = true;
          // Set all cars to lap 1
          for (const [, data] of raceState.carData) {
            data.lap = 1;
          }
          updateLapDisplay(1, raceState.totalLaps);
        }
        
        // Detect lap completion (cross from ~0.95+ to ~0.05-)
        if (raceState.raceStarted && carData.lastProgress > 0.90 && currentProgress < 0.10) {
          carData.lap++;
          
          // Update display for player
          if (id === 'player') {
            updateLapDisplay(carData.lap, raceState.totalLaps);
          }
          
          // Check if this car finished the race
          if (carData.lap > raceState.totalLaps && !carData.finished) {
            carData.finished = true;
            raceState.finishCount++;
            carData.finishOrder = raceState.finishCount;
            
            // If player finished, end the race
            if (id === 'player') {
              finishRace(carNames);
            }
          }
        }
        
        carData.lastProgress = currentProgress;
      }

      // Update AI cars
      for (let i = 0; i < aiCars.length; i++) {
        const aiCarId = `ai-${i}`;
        const aiState = physicsPlugin.getCarState(aiCarId);
        
        if (aiState) {
          const otherCars = allCarStates
            .filter(c => c.id !== aiCarId)
            .map(c => c.state);
          aiDrivers[i].updateOvertaking(aiState, otherCars);
          
          const aiInput = aiDrivers[i].generateInput(aiState);
          physicsPlugin.setAIInput(aiCarId, aiInput);
          
          aiCars[i].x = aiState.x;
          aiCars[i].y = aiState.y;
          aiCars[i].rotation = aiState.rotation;
        }
      }
    });

    console.log(`[DemoRacing] Track "${trackData.name}" loaded - 5 lap race`);
  },
};

/**
 * Finish the race and show results
 */
function finishRace(carNames: Map<string, string>): void {
  raceState.raceFinished = true;
  
  // Build positions from finish order
  // Cars that finished get their finish order, cars that didn't finish get sorted by lap + progress
  const carPositions: { id: string; finishOrder: number; lap: number }[] = [];
  
  for (const [id, data] of raceState.carData) {
    carPositions.push({
      id,
      finishOrder: data.finishOrder,
      lap: data.lap,
    });
  }
  
  // Sort: finished cars first (by finish order), then unfinished by lap
  carPositions.sort((a, b) => {
    // Both finished - sort by finish order
    if (a.finishOrder > 0 && b.finishOrder > 0) {
      return a.finishOrder - b.finishOrder;
    }
    // Only a finished
    if (a.finishOrder > 0) return -1;
    // Only b finished
    if (b.finishOrder > 0) return 1;
    // Neither finished - sort by lap (higher = better)
    return b.lap - a.lap;
  });
  
  const positions = carPositions.map(p => ({
    id: p.id,
    name: carNames.get(p.id) || p.id,
  }));
  
  setTimeout(() => showRaceFinishScreen(positions), 500);
}

/**
 * Get car's progress on the racing line (0-1)
 */
function getCarProgress(car: CarState, racingLine: RacingLinePoint[]): number {
  let closestIdx = 0;
  let minDist = Infinity;
  
  for (let i = 0; i < racingLine.length; i++) {
    const dx = racingLine[i].position.x - car.x;
    const dy = racingLine[i].position.y - car.y;
    const dist = dx * dx + dy * dy;
    if (dist < minDist) {
      minDist = dist;
      closestIdx = i;
    }
  }
  
  return racingLine[closestIdx].progress;
}

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
  const displaySpeed = Math.round(speed * 0.6);
  speedElement.textContent = `${displaySpeed} km/h`;
}

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

function updateTrackInfo(name: string, country: string, lengthMeters: number, characteristics: string): void {
  let trackInfoElement = document.getElementById('track-info');
  if (!trackInfoElement) {
    trackInfoElement = document.createElement('div');
    trackInfoElement.id = 'track-info';
    trackInfoElement.style.cssText = `
      position: fixed;
      top: 50px;
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

  const game = new Game({
    containerId: 'game-container',
    width: gameWidth,
    height: gameHeight,
    debug: true,
  });

  gameInstance = game;

  const renderPlugin = new RenderPlugin();
  await renderPlugin.initialize('game-container', gameWidth, gameHeight);

  const inputPlugin = new InputPlugin();
  const physicsPlugin = new PhysicsPlugin();

  game.use(renderPlugin);
  game.use(inputPlugin);
  game.use(physicsPlugin);
  game.use(StatsPlugin);
  game.use(DemoRacingPlugin);

  game.eventBus.on('game:init', () => {
    console.log('[Main] Game initializing...');
  });

  game.eventBus.on('game:start', () => {
    console.log('[Main] Game loop started');
  });

  game.eventBus.on('game:stop', () => {
    console.log('[Main] Game stopped');
  });

  console.log('Starting game...');
  await game.start();
  console.log('Game started!');

  if (game.config.debug) {
    (window as unknown as { game: Game; renderPlugin: RenderPlugin }).game = game;
    (window as unknown as { renderPlugin: RenderPlugin }).renderPlugin = renderPlugin;
  }

  // Keyboard controls
  document.addEventListener('keydown', (e) => {
    if (e.key === 'p') {
      if (game.isPaused()) {
        game.resume();
      } else {
        game.pause();
      }
    } else if (e.key === 'Escape') {
      if (currentGameState === 'racing') {
        showTrackSelection();
      }
    } else if (e.key === '+' || e.key === '=') {
      const camera = renderPlugin.getCamera();
      camera.setZoom(camera.getZoom() * 1.2);
    } else if (e.key === '-' || e.key === '_') {
      const camera = renderPlugin.getCamera();
      camera.setZoom(camera.getZoom() / 1.2);
    }
  });

  // Create controls info overlay
  const infoElement = document.createElement('div');
  infoElement.id = 'info-overlay';
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
    <div style="font-weight: bold; margin-bottom: 8px;">Controls</div>
    <div><kbd style="background: #333; padding: 2px 6px; border-radius: 3px;">W/Up</kbd> Accelerate</div>
    <div><kbd style="background: #333; padding: 2px 6px; border-radius: 3px;">S/Down</kbd> Brake</div>
    <div><kbd style="background: #333; padding: 2px 6px; border-radius: 3px;">A/Left</kbd> <kbd style="background: #333; padding: 2px 6px; border-radius: 3px;">D/Right</kbd> Steer</div>
    <div style="margin-top: 8px;">
      <kbd style="background: #333; padding: 2px 6px; border-radius: 3px;">Esc</kbd> Menu | 
      <kbd style="background: #333; padding: 2px 6px; border-radius: 3px;">P</kbd> Pause | 
      <kbd style="background: #333; padding: 2px 6px; border-radius: 3px;">+/-</kbd> Zoom
    </div>
  `;
  document.body.appendChild(infoElement);

  console.log('[Main] Available tracks:', defaultTrackLoader.getAvailableTrackIds().join(', '));
}

main().catch((error) => {
  console.error('Failed to initialize game:', error);
});
