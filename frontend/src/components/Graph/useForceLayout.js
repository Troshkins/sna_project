import { useEffect, useRef } from 'react';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
} from 'd3-force';

/**
 * Runs a d3-force simulation over graph nodes and edges.
 *
 * Important: this hook does *not* write back into React Flow's node positions
 * directly. Instead it exposes a `restPositionsRef` that always reflects the
 * physics-resolved layout. The GraphCanvas drives a single animation loop
 * that reads rest positions and writes the final (possibly projected)
 * positions to React Flow. That keeps physics and visual transforms in sync,
 * and — critically — makes React Flow edges follow whatever movement we
 * apply, since edges are routed from the same node positions.
 */
const useForceLayout = ({
  nodes,
  edges,
  width = 1000,
  height = 700,
  enabled = true,
}) => {
  const simRef = useRef(null);
  // Resting positions resolved by the physics simulation
  const restPositionsRef = useRef(new Map());
  // Track which nodes are being dragged by the user
  const draggingRef = useRef(new Set());

  useEffect(() => {
    if (!enabled) {
      if (simRef.current) {
        simRef.current.stop();
      }
      return undefined;
    }

    // Rebuild the physics graph from current nodes/edges, carrying over any
    // positions we already computed so the layout stays stable across updates.
    const simNodes = nodes.map((n) => {
      const prev = restPositionsRef.current.get(n.id);
      return {
        id: n.id,
        x: prev?.x ?? n.position?.x ?? (Math.random() - 0.5) * 200 + width / 2,
        y: prev?.y ?? n.position?.y ?? (Math.random() - 0.5) * 200 + height / 2,
        vx: prev?.vx ?? 0,
        vy: prev?.vy ?? 0,
        kind: n.type,
      };
    });

    const nodeIndex = new Map(simNodes.map((n) => [n.id, n]));

    const simLinks = edges
      .map((e) => {
        const s = nodeIndex.get(e.source);
        const t = nodeIndex.get(e.target);
        if (!s || !t) return null;
        return { source: s, target: t };
      })
      .filter(Boolean);

    const simulation = forceSimulation(simNodes)
      .force(
        'link',
        forceLink(simLinks)
          .id((d) => d.id)
          .distance(160)
          .strength(0.35)
      )
      .force('charge', forceManyBody().strength(-520).distanceMax(700))
      .force('center', forceCenter(width / 2, height / 2).strength(0.04))
      .force('collide', forceCollide(70).strength(0.9))
      .alpha(0.9)
      .alphaDecay(0.035)
      .velocityDecay(0.3);

    simulation.on('tick', () => {
      // Pin any node that the user is actively dragging to its current
      // position so the simulation doesn't fight them.
      const dragging = draggingRef.current;
      simNodes.forEach((n) => {
        if (dragging.has(n.id)) {
          const pinned = restPositionsRef.current.get(n.id);
          if (pinned) {
            n.x = pinned.x;
            n.y = pinned.y;
            n.vx = 0;
            n.vy = 0;
          }
        }
        restPositionsRef.current.set(n.id, {
          x: n.x,
          y: n.y,
          vx: n.vx,
          vy: n.vy,
        });
      });
    });

    simRef.current = simulation;

    return () => {
      simulation.stop();
    };
  }, [
    nodes.length,
    edges.length,
    nodes.map((n) => n.id).join('|'),
    edges.map((e) => `${e.source}->${e.target}`).join('|'),
    width,
    height,
    enabled,
  ]);

  const onNodeDragStart = (_event, node) => {
    draggingRef.current.add(node.id);
    restPositionsRef.current.set(node.id, {
      x: node.position.x,
      y: node.position.y,
      vx: 0,
      vy: 0,
    });
    if (simRef.current) {
      simRef.current.alphaTarget(0.3).restart();
    }
  };

  const onNodeDrag = (_event, node) => {
    restPositionsRef.current.set(node.id, {
      x: node.position.x,
      y: node.position.y,
      vx: 0,
      vy: 0,
    });
  };

  const onNodeDragStop = (_event, node) => {
    draggingRef.current.delete(node.id);
    restPositionsRef.current.set(node.id, {
      x: node.position.x,
      y: node.position.y,
      vx: 0,
      vy: 0,
    });
    if (simRef.current) {
      simRef.current.alphaTarget(0);
    }
  };

  const reheat = (alpha = 0.8) => {
    if (simRef.current) {
      simRef.current.alpha(alpha).restart();
    }
  };

  // Rotate every non-dragged rest position around (cx, cy) by `angle` rad.
  // Only updates the rest map; the render layer (GraphCanvas) will pick up
  // the new positions on the next animation frame.
  const rotateAround = (cx, cy, angle) => {
    if (!Number.isFinite(angle) || angle === 0) return;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dragging = draggingRef.current;

    restPositionsRef.current.forEach((value, id) => {
      if (dragging.has(id)) return;
      const dx = value.x - cx;
      const dy = value.y - cy;
      restPositionsRef.current.set(id, {
        x: cx + dx * cos - dy * sin,
        y: cy + dx * sin + dy * cos,
        vx: 0,
        vy: 0,
      });
    });

    if (simRef.current) {
      simRef.current.alpha(Math.max(simRef.current.alpha(), 0.05));
    }
  };

  return {
    restPositionsRef,
    draggingRef,
    onNodeDragStart,
    onNodeDrag,
    onNodeDragStop,
    reheat,
    rotateAround,
  };
};

export default useForceLayout;
