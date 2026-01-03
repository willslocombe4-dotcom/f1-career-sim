/**
 * Track data types for F1-style circuit definitions.
 * Tracks are defined using Catmull-Rom spline control points that form a smooth closed loop.
 */

/** Point in 2D space */
export interface Point {
  x: number;
  y: number;
}

/** Types of run-off areas */
export type RunoffType = 'gravel' | 'tarmac' | 'barrier' | 'grass';

/**
 * Control point for spline-based track definition.
 * Each control point defines a position on the track centerline
 * with optional metadata for that section.
 */
export interface ControlPoint {
  /** X coordinate */
  x: number;
  
  /** Y coordinate */
  y: number;
  
  /** Track width override at this point (uses default if not specified) */
  width?: number;
  
  /** Type of run-off at this section */
  runoff?: RunoffType;
  
  /** Whether this corner has kerbs */
  kerbs?: boolean;
  
  /** Sector number (1, 2, or 3) */
  sector?: 1 | 2 | 3;
  
  /** Corner/section name for display */
  name?: string;
  
  /** Is this a DRS zone activation point */
  drs?: boolean;
}

/**
 * Start/Finish line definition
 */
export interface StartFinishLine {
  /** Which control point index is the start/finish (0-based) */
  controlPointIndex: number;
}

/**
 * Complete track definition using spline control points.
 */
export interface TrackData {
  /** Unique track identifier */
  id: string;
  
  /** Display name of the track */
  name: string;
  
  /** Country the track is in */
  country: string;
  
  /** Track length in meters (for display) */
  lengthMeters: number;
  
  /** Number of laps for a race */
  raceLaps: number;
  
  /** Base track width */
  trackWidth: number;
  
  /** Control points defining the track centerline (forms closed loop) */
  controlPoints: ControlPoint[];
  
  /** Start/finish line position */
  startFinish: StartFinishLine;
  
  /** Track characteristics description */
  characteristics?: string;
  
  /** Average lap time in seconds (for reference) */
  averageLapTime?: number;
}

/**
 * Computed track path point with additional metadata.
 * These are generated from TrackData for rendering and car movement.
 */
export interface TrackPathPoint {
  /** Position */
  position: Point;
  
  /** Direction angle in radians (tangent to track) */
  angle: number;
  
  /** Track width at this point */
  width: number;
  
  /** Distance from start (normalized 0-1) */
  progress: number;
  
  /** Runoff type at this point */
  runoffType: RunoffType;
  
  /** Has kerbs at this point */
  hasKerbs: boolean;
  
  /** Is this in a DRS zone */
  inDrsZone: boolean;
  
  /** Sector number */
  sector: 1 | 2 | 3;
  
  /** Section name (if any) */
  name?: string;
}

/**
 * Racing line point - the optimal path around the track.
 */
export interface RacingLinePoint {
  /** Position on track */
  position: Point;
  
  /** Suggested speed (0-1 normalized) */
  speedFactor: number;
  
  /** Distance from start */
  progress: number;
}

/**
 * Kerb (curb) data for rendering
 */
export interface KerbData {
  /** Points forming the kerb polygon */
  points: Point[];
  
  /** Which side of the track */
  side: 'inner' | 'outer';
}

/**
 * Complete computed track for rendering and simulation.
 */
export interface ComputedTrack {
  /** Source track data */
  source: TrackData;
  
  /** Track centerline path points */
  path: TrackPathPoint[];
  
  /** Racing line points */
  racingLine: RacingLinePoint[];
  
  /** Track boundary points (outer edge) */
  outerBoundary: Point[];
  
  /** Track boundary points (inner edge) */
  innerBoundary: Point[];
  
  /** Kerb data for rendering */
  kerbs: KerbData[];
  
  /** Total track length in world units */
  totalLength: number;
}

/**
 * Track render options
 */
export interface TrackRenderOptions {
  /** Show kerbs */
  showKerbs?: boolean;
  
  /** Show racing line */
  showRacingLine?: boolean;
  
  /** Show sector markers */
  showSectors?: boolean;
  
  /** Show DRS zones */
  showDrsZones?: boolean;
  
  /** Asphalt color */
  asphaltColor?: number;
  
  /** Grass/infield color */
  grassColor?: number;
  
  /** Gravel trap color */
  gravelColor?: number;
  
  /** Tarmac runoff color */
  tarmacRunoffColor?: number;
  
  /** Kerb colors */
  kerbColors?: { primary: number; secondary: number };
}

/** Default rendering options */
export const DEFAULT_TRACK_RENDER_OPTIONS: TrackRenderOptions = {
  showKerbs: true,
  showRacingLine: true,
  showSectors: false,
  showDrsZones: true,
  asphaltColor: 0x2a2a2a,
  grassColor: 0x2d5a27,
  gravelColor: 0xc4a35a,
  tarmacRunoffColor: 0x3a3a3a,
  kerbColors: { primary: 0xff0000, secondary: 0xffffff },
};

/** Colors for different runoff types */
export const RUNOFF_COLORS = {
  gravel: 0xc4a35a,     // Beige/tan gravel
  tarmac: 0x3a3a3a,     // Slightly lighter gray tarmac runoff
  barrier: 0x555555,    // Dark gray for barrier walls
  grass: 0x2d5a27,      // Green grass
};

/** Barrier rendering settings */
export const BARRIER_SETTINGS = {
  width: 4,             // Width of barrier line
  color: 0x333333,      // Dark barrier color
  highlightColor: 0x888888, // Lighter edge for 3D effect
};
