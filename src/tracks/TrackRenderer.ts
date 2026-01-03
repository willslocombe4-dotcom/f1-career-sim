/**
 * TrackRenderer: Renders F1-style tracks using PixiJS Graphics.
 * Creates visual representations of tracks with proper layering:
 * 1. Grass background (fills entire area)
 * 2. Runoff areas (gravel/tarmac OUTSIDE track only)
 * 3. Asphalt track surface (proper ring shape)
 * 4. Kerbs (at designated corners)
 * 5. Track markings
 * 6. Racing line
 */

import { Container, Graphics } from 'pixi.js';
import type { ComputedTrack, TrackRenderOptions, Point } from './types';
import { DEFAULT_TRACK_RENDER_OPTIONS, RUNOFF_COLORS, BARRIER_SETTINGS } from './types';

/**
 * Renders a complete F1-style track from computed track data.
 */
export class TrackRenderer {
  private options: TrackRenderOptions;

  constructor(options: Partial<TrackRenderOptions> = {}) {
    this.options = { ...DEFAULT_TRACK_RENDER_OPTIONS, ...options };
  }

  /**
   * Render a complete track and return the container.
   */
  render(track: ComputedTrack): Container {
    const container = new Container();
    container.label = `track-${track.source.id}`;

    // Render layers from back to front
    // Simplified: just asphalt and start/finish for now
    
    // 1. Asphalt track surface
    const asphaltLayer = this.renderAsphaltTrack(track);
    container.addChild(asphaltLayer);

    // 2. Start/finish line only
    const sfLayer = this.renderStartFinishOnly(track);
    container.addChild(sfLayer);

    return container;
  }

  /**
   * Render the grass background that covers the entire track area.
   * The infield should be grass, not asphalt.
   */
  private renderGrassBackground(track: ComputedTrack): Graphics {
    const graphics = new Graphics();
    const grassColor = this.options.grassColor!;
    const padding = track.source.trackWidth * 4;

    // Get bounding box of track
    const bounds = this.getBounds([...track.outerBoundary, ...track.innerBoundary]);

    // Draw large grass rectangle
    graphics.rect(
      bounds.minX - padding,
      bounds.minY - padding,
      bounds.maxX - bounds.minX + padding * 2,
      bounds.maxY - bounds.minY + padding * 2
    );
    graphics.fill(grassColor);

    return graphics;
  }

  /**
   * Render runoff areas OUTSIDE the track only.
   * This creates strips of gravel/tarmac on the outside of corners.
   */
  private renderRunoffAreas(track: ComputedTrack): Container {
    const container = new Container();
    container.label = 'runoff';

    const runoffWidth = track.source.trackWidth * 0.8;
    const path = track.path;
    const n = path.length;

    // Find continuous sections with same runoff type
    let currentType = path[0].runoffType;
    let sectionStart = 0;

    for (let i = 1; i <= n; i++) {
      const idx = i % n;
      const pointType = path[idx]?.runoffType ?? 'grass';

      if (pointType !== currentType || i === n) {
        // End of section - render it
        if (currentType !== 'grass') {
          const sectionEnd = i - 1;
          const runoffGraphics = this.renderRunoffSection(
            track,
            sectionStart,
            sectionEnd,
            currentType,
            runoffWidth
          );
          container.addChild(runoffGraphics);
        }

        if (i < n) {
          currentType = pointType;
          sectionStart = idx;
        }
      }
    }

    return container;
  }

  /**
   * Render a single runoff section.
   * Uses segment-by-segment rendering with path angle data for correct offset direction.
   */
  private renderRunoffSection(
    track: ComputedTrack,
    startIdx: number,
    endIdx: number,
    runoffType: string,
    runoffWidth: number
  ): Graphics {
    const graphics = new Graphics();
    const path = track.path;
    const n = path.length;

    if (runoffType === 'barrier') {
      // Draw barriers as thick lines along the outer edge
      return this.renderBarrierSection(track.outerBoundary, startIdx, endIdx, n);
    }

    // Get color for this runoff type
    const color = runoffType === 'gravel' ? RUNOFF_COLORS.gravel : RUNOFF_COLORS.tarmac;

    // Collect indices for this section
    const indices: number[] = [];
    let idx = startIdx;
    while (true) {
      indices.push(idx);
      if (idx === endIdx) break;
      idx = (idx + 1) % n;
      if (indices.length > n) break; // Safety
    }

    if (indices.length < 2) return graphics;

    // Draw segment-by-segment quadrilaterals
    // Use the direction from centerline to outer boundary to determine "outward"
    for (let i = 0; i < indices.length - 1; i++) {
      const idx1 = indices[i];
      const idx2 = indices[i + 1];
      
      // Get outer boundary points and corresponding centerline points
      const p1 = track.outerBoundary[idx1];
      const p2 = track.outerBoundary[idx2];
      const c1 = path[idx1].position;
      const c2 = path[idx2].position;
      
      // Calculate outward direction: from centerline to outer boundary
      // This is guaranteed to point "outside" regardless of track winding
      const dx1 = p1.x - c1.x;
      const dy1 = p1.y - c1.y;
      const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
      
      const dx2 = p2.x - c2.x;
      const dy2 = p2.y - c2.y;
      const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      
      if (len1 === 0 || len2 === 0) continue;
      
      // Normalized outward direction
      const outX1 = dx1 / len1;
      const outY1 = dy1 / len1;
      const outX2 = dx2 / len2;
      const outY2 = dy2 / len2;
      
      // Create offset points by going further in the outward direction
      const o1: Point = {
        x: p1.x + outX1 * runoffWidth,
        y: p1.y + outY1 * runoffWidth,
      };
      const o2: Point = {
        x: p2.x + outX2 * runoffWidth,
        y: p2.y + outY2 * runoffWidth,
      };
      
      // Draw quadrilateral for this segment
      graphics.moveTo(p1.x, p1.y);
      graphics.lineTo(p2.x, p2.y);
      graphics.lineTo(o2.x, o2.y);
      graphics.lineTo(o1.x, o1.y);
      graphics.closePath();
      graphics.fill(color);
    }

    return graphics;
  }

  /**
   * Render barriers along the track edge.
   */
  private renderBarrierSection(
    boundary: Point[],
    startIdx: number,
    endIdx: number,
    totalPoints: number
  ): Graphics {
    const graphics = new Graphics();

    const points: Point[] = [];
    let idx = startIdx;
    while (true) {
      points.push(boundary[idx]);
      if (idx === endIdx) break;
      idx = (idx + 1) % totalPoints;
      if (points.length > totalPoints) break;
    }

    if (points.length < 2) return graphics;

    // Draw barrier - dark base
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      graphics.lineTo(points[i].x, points[i].y);
    }
    graphics.stroke({ width: BARRIER_SETTINGS.width + 2, color: BARRIER_SETTINGS.color });

    // Draw highlight on top
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      graphics.lineTo(points[i].x, points[i].y);
    }
    graphics.stroke({ width: BARRIER_SETTINGS.width - 1, color: BARRIER_SETTINGS.highlightColor });

    return graphics;
  }

  /**
   * Render the main asphalt track surface.
   * Uses segment-by-segment rendering to handle complex track shapes (like figure-8s).
   */
  private renderAsphaltTrack(track: ComputedTrack): Graphics {
    const graphics = new Graphics();
    const asphaltColor = this.options.asphaltColor!;

    const outer = track.outerBoundary;
    const inner = track.innerBoundary;
    const n = outer.length;

    if (n < 3 || inner.length < 3) return graphics;

    // Draw track as individual quadrilaterals to handle self-intersecting tracks
    for (let i = 0; i < n; i++) {
      const nextI = (i + 1) % n;
      
      const o1 = outer[i];
      const o2 = outer[nextI];
      const i1 = inner[i];
      const i2 = inner[nextI];
      
      // Draw quad from outer to inner
      graphics.moveTo(o1.x, o1.y);
      graphics.lineTo(o2.x, o2.y);
      graphics.lineTo(i2.x, i2.y);
      graphics.lineTo(i1.x, i1.y);
      graphics.closePath();
      graphics.fill(asphaltColor);
    }

    // Draw white track edge lines
    graphics.moveTo(outer[0].x, outer[0].y);
    for (let i = 1; i < outer.length; i++) {
      graphics.lineTo(outer[i].x, outer[i].y);
    }
    graphics.closePath();
    graphics.stroke({ width: 2, color: 0xffffff, alpha: 0.8 });

    graphics.moveTo(inner[0].x, inner[0].y);
    for (let i = 1; i < inner.length; i++) {
      graphics.lineTo(inner[i].x, inner[i].y);
    }
    graphics.closePath();
    graphics.stroke({ width: 2, color: 0xffffff, alpha: 0.8 });

    return graphics;
  }

  /**
   * Render kerbs (red and white striped curbs on corners).
   */
  private renderKerbs(track: ComputedTrack): Container {
    const container = new Container();
    container.label = 'kerbs';

    const { primary: primaryColor, secondary: secondaryColor } = this.options.kerbColors!;

    for (const kerb of track.kerbs) {
      if (kerb.points.length < 4) continue;

      const halfLen = Math.floor(kerb.points.length / 2);
      if (halfLen < 2) continue;
      
      // Draw kerb as individual quadrilateral segments
      // This prevents wedge shapes at tight corners
      const kerbGraphics = new Graphics();
      
      for (let i = 0; i < halfLen - 1; i++) {
        // Get the four corners of this quad segment
        const inner1 = kerb.points[i];
        const inner2 = kerb.points[i + 1];
        const outer2 = kerb.points[kerb.points.length - 1 - (i + 1)];
        const outer1 = kerb.points[kerb.points.length - 1 - i];
        
        // Determine stripe color: alternate red and white
        const stripeWidth = Math.max(1, Math.floor(halfLen / 8)); // ~8 stripes
        const stripeIndex = Math.floor(i / stripeWidth);
        const isWhiteStripe = stripeIndex % 2 === 1;
        const color = isWhiteStripe ? secondaryColor : primaryColor;
        
        // Draw quad
        kerbGraphics.moveTo(inner1.x, inner1.y);
        kerbGraphics.lineTo(inner2.x, inner2.y);
        kerbGraphics.lineTo(outer2.x, outer2.y);
        kerbGraphics.lineTo(outer1.x, outer1.y);
        kerbGraphics.closePath();
        kerbGraphics.fill(color);
      }
      
      container.addChild(kerbGraphics);
    }

    return container;
  }

  /**
   * Render just the start/finish line (no center line).
   */
  private renderStartFinishOnly(track: ComputedTrack): Container {
    const container = new Container();
    container.label = 'start-finish';

    const sfIndex = track.source.startFinish.controlPointIndex;
    const pathIndex = Math.floor((sfIndex / track.source.controlPoints.length) * track.path.length);
    const sfPoint = track.path[pathIndex % track.path.length];

    if (sfPoint) {
      const sfLine = this.renderStartFinishLine(
        sfPoint.position,
        sfPoint.angle,
        sfPoint.width
      );
      container.addChild(sfLine);
    }

    return container;
  }

  /**
   * Render track markings (start/finish line, center line).
   */
  private renderMarkings(track: ComputedTrack): Container {
    const container = new Container();
    container.label = 'markings';

    // Find start/finish position
    const sfIndex = track.source.startFinish.controlPointIndex;
    const pathIndex = Math.floor((sfIndex / track.source.controlPoints.length) * track.path.length);
    const sfPoint = track.path[pathIndex % track.path.length];

    if (sfPoint) {
      const sfLine = this.renderStartFinishLine(
        sfPoint.position,
        sfPoint.angle,
        sfPoint.width
      );
      container.addChild(sfLine);
    }

    // Draw dashed center line
    const centerLine = new Graphics();
    const dashLength = 20;
    const gapLength = 30;
    let drawing = true;
    let distanceSinceLast = 0;

    for (let i = 1; i < track.path.length; i++) {
      const prev = track.path[i - 1];
      const curr = track.path[i];
      const dx = curr.position.x - prev.position.x;
      const dy = curr.position.y - prev.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (drawing) {
        centerLine.moveTo(prev.position.x, prev.position.y);
        centerLine.lineTo(curr.position.x, curr.position.y);
      }

      distanceSinceLast += dist;
      const threshold = drawing ? dashLength : gapLength;
      if (distanceSinceLast >= threshold) {
        drawing = !drawing;
        distanceSinceLast = 0;
      }
    }
    centerLine.stroke({ width: 1.5, color: 0xffffff, alpha: 0.25 });
    container.addChild(centerLine);

    return container;
  }

  /**
   * Render the start/finish line with checkered pattern.
   */
  private renderStartFinishLine(position: Point, angle: number, width: number): Container {
    const container = new Container();
    const lineWidth = 20;
    const checkerSize = width / 12;

    const perpAngle = angle + Math.PI / 2;

    const start: Point = {
      x: position.x + Math.cos(perpAngle) * (width / 2),
      y: position.y + Math.sin(perpAngle) * (width / 2),
    };
    const end: Point = {
      x: position.x - Math.cos(perpAngle) * (width / 2),
      y: position.y - Math.sin(perpAngle) * (width / 2),
    };

    // White base
    const baseLine = new Graphics();
    baseLine.moveTo(start.x, start.y);
    baseLine.lineTo(end.x, end.y);
    baseLine.stroke({ width: lineWidth, color: 0xffffff });
    container.addChild(baseLine);

    // Black checkers
    const numCheckers = Math.floor(width / checkerSize);
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < numCheckers; col++) {
        if ((row + col) % 2 === 0) {
          const checker = new Graphics();
          const t = (col + 0.5) / numCheckers;
          const cx = start.x + (end.x - start.x) * t;
          const cy = start.y + (end.y - start.y) * t;

          const rowOffset = (row - 0.5) * (lineWidth / 2);
          const rx = cx + Math.cos(angle) * rowOffset;
          const ry = cy + Math.sin(angle) * rowOffset;

          checker.rect(
            rx - checkerSize / 2,
            ry - checkerSize / 2,
            checkerSize,
            checkerSize
          );
          checker.fill(0x000000);
          container.addChild(checker);
        }
      }
    }

    return container;
  }

  /**
   * Render the racing line with speed-based coloring.
   */
  private renderRacingLine(track: ComputedTrack): Graphics {
    const graphics = new Graphics();

    if (track.racingLine.length < 2) return graphics;

    // Draw racing line segments with color based on speed
    for (let i = 1; i < track.racingLine.length; i++) {
      const prev = track.racingLine[i - 1];
      const curr = track.racingLine[i];

      const color = this.speedToColor(curr.speedFactor);

      graphics.moveTo(prev.position.x, prev.position.y);
      graphics.lineTo(curr.position.x, curr.position.y);
      graphics.stroke({ width: 3, color, alpha: 0.6 });
    }

    // Close the loop
    const last = track.racingLine[track.racingLine.length - 1];
    const first = track.racingLine[0];
    graphics.moveTo(last.position.x, last.position.y);
    graphics.lineTo(first.position.x, first.position.y);
    graphics.stroke({ width: 3, color: this.speedToColor(first.speedFactor), alpha: 0.6 });

    return graphics;
  }

  /**
   * Convert speed factor (0-1) to color (red=slow, green=fast).
   */
  private speedToColor(speed: number): number {
    const r = Math.floor(255 * (1 - speed));
    const g = Math.floor(255 * speed);
    const b = 0;
    return (r << 16) | (g << 8) | b;
  }

  /**
   * Get bounding box of points.
   */
  private getBounds(points: Point[]): { minX: number; maxX: number; minY: number; maxY: number } {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const p of points) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }

    return { minX, maxX, minY, maxY };
  }

  /**
   * Update render options.
   */
  setOptions(options: Partial<TrackRenderOptions>): void {
    this.options = { ...this.options, ...options };
  }
}
