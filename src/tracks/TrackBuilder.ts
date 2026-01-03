/**
 * TrackBuilder: Converts TrackData into renderable geometry using Catmull-Rom splines.
 * Takes control point-based track definitions and computes smooth paths,
 * boundaries, kerbs, and racing lines.
 */

import type {
  TrackData,
  ComputedTrack,
  TrackPathPoint,
  RacingLinePoint,
  Point,
  KerbData,
} from './types';

/**
 * Catmull-Rom spline interpolation.
 * Creates smooth curves through control points.
 */
function catmullRom(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const t2 = t * t;
  const t3 = t2 * t;

  // Catmull-Rom coefficients
  const x = 0.5 * (
    (2 * p1.x) +
    (-p0.x + p2.x) * t +
    (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
    (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
  );

  const y = 0.5 * (
    (2 * p1.y) +
    (-p0.y + p2.y) * t +
    (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
    (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
  );

  return { x, y };
}

/**
 * Calculate tangent (derivative) of Catmull-Rom spline at point t.
 */
function catmullRomTangent(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const t2 = t * t;

  // Derivative of Catmull-Rom
  const x = 0.5 * (
    (-p0.x + p2.x) +
    (4 * p0.x - 10 * p1.x + 8 * p2.x - 2 * p3.x) * t +
    (-3 * p0.x + 9 * p1.x - 9 * p2.x + 3 * p3.x) * t2
  );

  const y = 0.5 * (
    (-p0.y + p2.y) +
    (4 * p0.y - 10 * p1.y + 8 * p2.y - 2 * p3.y) * t +
    (-3 * p0.y + 9 * p1.y - 9 * p2.y + 3 * p3.y) * t2
  );

  return { x, y };
}

/**
 * Linear interpolation between two values.
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Builds a complete renderable track from track data.
 */
export class TrackBuilder {
  private pointsPerSegment: number;

  constructor(pointsPerSegment = 20) {
    // How many points to generate between each pair of control points
    this.pointsPerSegment = pointsPerSegment;
  }

  /**
   * Build a complete computed track from track data.
   */
  build(trackData: TrackData): ComputedTrack {
    const path = this.computePath(trackData);
    const outerBoundary = this.computeBoundary(path, 'outer');
    const innerBoundary = this.computeBoundary(path, 'inner');
    // Use boundaries for accurate kerb placement
    const kerbs = this.computeKerbsWithBoundaries(path, outerBoundary, innerBoundary, trackData.trackWidth);
    const racingLine = this.computeRacingLine(path);
    const totalLength = this.computeTotalLength(path);

    return {
      source: trackData,
      path,
      racingLine,
      outerBoundary,
      innerBoundary,
      kerbs,
      totalLength,
    };
  }

  /**
   * Compute the centerline path using Catmull-Rom spline interpolation.
   */
  private computePath(trackData: TrackData): TrackPathPoint[] {
    const controlPoints = trackData.controlPoints;
    const n = controlPoints.length;
    
    if (n < 3) {
      throw new Error('Track must have at least 3 control points');
    }

    const pathPoints: TrackPathPoint[] = [];
    const totalSegments = n; // Each control point to next forms a segment

    for (let i = 0; i < n; i++) {
      // Get 4 points for Catmull-Rom (wrap around for closed loop)
      const p0 = controlPoints[(i - 1 + n) % n];
      const p1 = controlPoints[i];
      const p2 = controlPoints[(i + 1) % n];
      const p3 = controlPoints[(i + 2) % n];

      // Generate points along this segment
      const numPoints = i === n - 1 ? this.pointsPerSegment : this.pointsPerSegment;
      
      for (let j = 0; j < numPoints; j++) {
        const t = j / numPoints;
        const pos = catmullRom(p0, p1, p2, p3, t);
        const tangent = catmullRomTangent(p0, p1, p2, p3, t);
        const angle = Math.atan2(tangent.y, tangent.x);

        // Interpolate properties between p1 and p2
        const width = lerp(
          p1.width ?? trackData.trackWidth,
          p2.width ?? trackData.trackWidth,
          t
        );

        // Use p1's properties for the first half, p2's for second half
        const useP2 = t > 0.5;
        const srcPoint = useP2 ? p2 : p1;

        const progress = (i + t) / totalSegments;

        pathPoints.push({
          position: pos,
          angle,
          width,
          progress,
          runoffType: srcPoint.runoff ?? 'grass',
          hasKerbs: srcPoint.kerbs ?? false,
          inDrsZone: srcPoint.drs ?? false,
          sector: srcPoint.sector ?? 1,
          name: srcPoint.name,
        });
      }
    }

    return pathPoints;
  }

  /**
   * Compute boundary points (inner or outer edge of track).
   * 
   * Determines the correct offset direction based on the path's winding.
   * The outer boundary should have a larger absolute area than the inner.
   */
  private computeBoundary(path: TrackPathPoint[], side: 'inner' | 'outer'): Point[] {
    // First, determine the winding direction of the path
    const pathWinding = this.computeWindingArea(path.map(p => p.position));
    
    // For CCW path (positive area), left perpendicular (angle + π/2) points outward
    // For CW path (negative area), right perpendicular (angle - π/2) points outward
    // Outer boundary should be on the outward side, inner on the inward side
    const isPathCCW = pathWinding > 0;
    
    let offsetMultiplier: number;
    if (side === 'outer') {
      // Outer boundary: offset toward outside (away from center)
      offsetMultiplier = isPathCCW ? 1 : -1;
    } else {
      // Inner boundary: offset toward inside (toward center)
      offsetMultiplier = isPathCCW ? -1 : 1;
    }

    const boundary: Point[] = [];
    for (const point of path) {
      const perpAngle = point.angle + Math.PI / 2;
      const offset = (point.width / 2) * offsetMultiplier;

      boundary.push({
        x: point.position.x + Math.cos(perpAngle) * offset,
        y: point.position.y + Math.sin(perpAngle) * offset,
      });
    }

    return boundary;
  }

  /**
   * Compute signed area of a polygon using shoelace formula.
   * Positive = counter-clockwise, Negative = clockwise.
   */
  private computeWindingArea(points: Point[]): number {
    let area = 0;
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    return area / 2;
  }

  /**
   * Compute kerbs at corners where they are enabled.
   * Places kerbs on BOTH inner and outer edges at corner sections.
   */
  private computeKerbsWithBoundaries(
    path: TrackPathPoint[], 
    outerBoundary: Point[], 
    innerBoundary: Point[],
    defaultWidth: number
  ): KerbData[] {
    const kerbs: KerbData[] = [];
    const kerbWidth = defaultWidth * 0.08; // 8% of track width
    
    // Find continuous sections with kerbs
    let inKerbSection = false;
    let kerbStartIdx = 0;

    for (let i = 0; i <= path.length; i++) {
      const idx = i % path.length;
      const hasKerbs = path[idx]?.hasKerbs ?? false;

      if (hasKerbs && !inKerbSection) {
        // Start of kerb section
        inKerbSection = true;
        kerbStartIdx = idx;
      } else if (!hasKerbs && inKerbSection) {
        // End of kerb section - create kerbs on BOTH sides
        inKerbSection = false;
        const kerbEndIdx = (idx - 1 + path.length) % path.length;
        
        // Create outer kerb
        const outerKerbPoints = this.createKerbFromBoundary(
          path,
          outerBoundary,
          kerbStartIdx,
          kerbEndIdx,
          kerbWidth
        );
        
        if (outerKerbPoints.length >= 4) {
          kerbs.push({
            points: outerKerbPoints,
            side: 'outer',
          });
        }
        
        // Create inner kerb
        const innerKerbPoints = this.createKerbFromBoundary(
          path,
          innerBoundary,
          kerbStartIdx,
          kerbEndIdx,
          kerbWidth
        );
        
        if (innerKerbPoints.length >= 4) {
          kerbs.push({
            points: innerKerbPoints,
            side: 'inner',
          });
        }
      }
    }

    return kerbs;
  }

  /**
   * Create kerb segment data using pre-computed boundary points.
   * Returns an array of quadrilateral segments that form the kerb strip.
   * This approach works better at tight corners than a single polygon.
   */
  private createKerbFromBoundary(
    path: TrackPathPoint[],
    boundary: Point[],
    startIdx: number,
    endIdx: number,
    kerbWidth: number
  ): Point[] {
    const n = path.length;
    
    // Collect all the kerb segment points
    const innerEdge: Point[] = []; // At track boundary
    const outerEdge: Point[] = []; // Offset into runoff
    
    let idx = startIdx;
    while (true) {
      const boundaryPoint = boundary[idx];
      const centerPoint = path[idx].position;
      
      // Direction from center to boundary (outward direction)
      const dx = boundaryPoint.x - centerPoint.x;
      const dy = boundaryPoint.y - centerPoint.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      
      if (len > 0) {
        const dirX = dx / len;
        const dirY = dy / len;
        
        // Inner edge at the track boundary
        innerEdge.push({ x: boundaryPoint.x, y: boundaryPoint.y });
        
        // Outer edge extends outward into runoff
        outerEdge.push({
          x: boundaryPoint.x + dirX * kerbWidth,
          y: boundaryPoint.y + dirY * kerbWidth,
        });
      }

      if (idx === endIdx) break;
      idx = (idx + 1) % n;
      
      // Safety check
      if (innerEdge.length > n) break;
    }

    // If not enough points, return empty
    if (innerEdge.length < 2) return [];
    
    // Build the polygon as inner edge forward, then outer edge backward
    // This creates a proper strip shape even at tight corners
    return [...innerEdge, ...outerEdge.reverse()];
  }



  /**
   * Compute the optimal racing line.
   */
  private computeRacingLine(path: TrackPathPoint[]): RacingLinePoint[] {
    const racingLine: RacingLinePoint[] = [];
    const n = path.length;

    for (let i = 0; i < n; i++) {
      const point = path[i];
      const prevPoint = path[(i - 1 + n) % n];
      const nextPoint = path[(i + 1) % n];

      // Calculate curvature to determine corner severity
      const dx1 = point.position.x - prevPoint.position.x;
      const dy1 = point.position.y - prevPoint.position.y;
      const dx2 = nextPoint.position.x - point.position.x;
      const dy2 = nextPoint.position.y - point.position.y;

      const angleDiff = Math.atan2(dy2, dx2) - Math.atan2(dy1, dx1);
      const normalizedAngle = this.normalizeAngle(angleDiff);
      const curvature = Math.abs(normalizedAngle);

      // Speed factor: slower in tight corners
      const speedFactor = Math.max(0.25, 1 - curvature * 1.5);

      // Offset from center: cut inside on corners
      const offsetAmount = point.width * 0.35 * Math.min(curvature * 2, 1);
      const offsetDirection = normalizedAngle > 0 ? -1 : 1;
      const perpAngle = point.angle + Math.PI / 2;

      racingLine.push({
        position: {
          x: point.position.x + Math.cos(perpAngle) * offsetAmount * offsetDirection,
          y: point.position.y + Math.sin(perpAngle) * offsetAmount * offsetDirection,
        },
        speedFactor,
        progress: point.progress,
      });
    }

    // Smooth the racing line
    return this.smoothRacingLine(racingLine);
  }

  /**
   * Smooth the racing line to avoid jerky movements.
   */
  private smoothRacingLine(racingLine: RacingLinePoint[]): RacingLinePoint[] {
    const smoothed: RacingLinePoint[] = [];
    const n = racingLine.length;

    for (let i = 0; i < n; i++) {
      const prev = racingLine[(i - 1 + n) % n];
      const curr = racingLine[i];
      const next = racingLine[(i + 1) % n];

      // Simple moving average for position
      smoothed.push({
        position: {
          x: (prev.position.x + curr.position.x * 2 + next.position.x) / 4,
          y: (prev.position.y + curr.position.y * 2 + next.position.y) / 4,
        },
        speedFactor: (prev.speedFactor + curr.speedFactor * 2 + next.speedFactor) / 4,
        progress: curr.progress,
      });
    }

    return smoothed;
  }

  /**
   * Compute total path length in world units.
   */
  private computeTotalLength(path: TrackPathPoint[]): number {
    let length = 0;
    const n = path.length;
    
    for (let i = 0; i < n; i++) {
      const curr = path[i];
      const next = path[(i + 1) % n];
      const dx = next.position.x - curr.position.x;
      const dy = next.position.y - curr.position.y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    
    return length;
  }

  /**
   * Normalize angle to -PI to PI range.
   */
  private normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  }
}
