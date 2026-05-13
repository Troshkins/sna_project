import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  useEdgesState,
  useNodesState,
  useReactFlow,
  useViewport,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useRooms } from '../../context/RoomsContext';
import { getRoomLabel, isSelfRoom } from '../../utils/rooms';
import { nodeTypes } from './nodes';
import FloatingEdge from './FloatingEdge';
import useForceLayout from './useForceLayout';

const USER_NODE_PREFIX = 'u:';

// Edge stroke colors come from the project palette (#009669).
const EDGE_DM = 'rgba(0, 150, 105, 0.7)';
const EDGE_GROUP_SELF = 'rgba(0, 150, 105, 0.32)';
const EDGE_GROUP_MEMBER = 'rgba(0, 150, 105, 0.14)';

const edgeTypes = { floating: FloatingEdge };

const buildGraph = (rooms, currentUser) => {
  if (!currentUser) return { nodes: [], edges: [] };

  const friendIds = new Set();
  rooms.forEach((room) => {
    if (room.roomType !== 'direct') return;
    if (isSelfRoom(room, currentUser.id)) return;
    (room.members || []).forEach((m) => {
      if (m && m.id !== currentUser.id) friendIds.add(m.id);
    });
  });

  const userNodes = new Map();
  const upsertUser = (userId, info) => {
    const existing = userNodes.get(userId);
    if (existing) {
      if (info.username && !existing.username) existing.username = info.username;
      if (info.directRoomId) existing.directRoomId = info.directRoomId;
      if (info.isFriend) existing.isFriend = true;
      return existing;
    }
    const fresh = { userId, ...info };
    userNodes.set(userId, fresh);
    return fresh;
  };

  upsertUser(currentUser.id, {
    username: currentUser.username,
    isSelf: true,
    isFriend: true,
  });

  const nodes = [];
  const edges = [];

  rooms.forEach((room) => {
    if (room.roomType === 'direct') {
      if (isSelfRoom(room, currentUser.id)) {
        const self = userNodes.get(currentUser.id);
        if (self) self.directRoomId = room.id;
        return;
      }

      const peer = (room.members || []).find((m) => m.id !== currentUser.id);
      if (!peer) return;
      upsertUser(peer.id, {
        username: peer.username,
        isFriend: true,
        directRoomId: room.id,
      });
      edges.push({
        id: `e:dm:${room.id}`,
        source: USER_NODE_PREFIX + currentUser.id,
        target: USER_NODE_PREFIX + peer.id,
        type: 'floating',
        data: { roomId: room.id, kind: 'direct' },
        className: 'clickable',
        style: { stroke: EDGE_DM, strokeWidth: 2 },
      });
      return;
    }

    const label = getRoomLabel(room, currentUser.id);
    nodes.push({
      id: room.id,
      type: 'roomNode',
      position: { x: 0, y: 0 },
      data: {
        kind: 'room',
        roomId: room.id,
        label,
      },
    });

    const members = Array.isArray(room.members) ? room.members : [];
    members.forEach((m) => {
      if (!m) return;
      const isSelf = m.id === currentUser.id;
      const isFriend = isSelf || friendIds.has(m.id);

      upsertUser(m.id, {
        username: isFriend ? m.username : undefined,
        isFriend,
      });

      edges.push({
        id: `e:room:${room.id}:${m.id}`,
        source: room.id,
        target: USER_NODE_PREFIX + m.id,
        type: 'floating',
        data: isSelf ? { roomId: room.id, kind: 'room' } : { kind: 'member' },
        className: isSelf ? 'clickable' : undefined,
        style: {
          stroke: isSelf ? EDGE_GROUP_SELF : EDGE_GROUP_MEMBER,
          strokeWidth: isSelf ? 1.2 : 0.9,
        },
      });
    });
  });

  userNodes.forEach((info) => {
    nodes.push({
      id: USER_NODE_PREFIX + info.userId,
      type: 'userNode',
      position: { x: 0, y: 0 },
      data: {
        kind: 'user',
        userId: info.userId,
        label: info.username || '',
        self: Boolean(info.isSelf),
        anon: !info.isFriend && !info.isSelf,
        directRoomId: info.directRoomId,
      },
    });
  });

  return { nodes, edges };
};

const GraphCanvas = ({ selectedRoomId, onSelectRoom }) => {
  const { user } = useAuth();
  const { rooms, loading, createDirect, openSelfChat } = useRooms();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 1000, height: 700 });
  const { fitView } = useReactFlow();
  const viewport = useViewport();

  // ---- Idle / interaction tracking -------------------------------------
  // Declared early so any later useCallback can depend on the helpers.
  const lastInteractionRef = useRef(Date.now());
  const interactingRef = useRef(0);

  const beginInteraction = useCallback(() => {
    interactingRef.current += 1;
    lastInteractionRef.current = Date.now();
  }, []);
  const endInteraction = useCallback(() => {
    interactingRef.current = Math.max(0, interactingRef.current - 1);
    lastInteractionRef.current = Date.now();
  }, []);
  const tickInteraction = useCallback(() => {
    lastInteractionRef.current = Date.now();
  }, []);

  // ---- Container size for force centering -------------------------------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setSize({
        width: Math.max(400, rect.width),
        height: Math.max(400, rect.height),
      });
    };
    update();
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, []);

  // ---- Build graph topology --------------------------------------------
  const topology = useMemo(() => buildGraph(rooms, user), [rooms, user]);

  useEffect(() => {
    setNodes((prev) => {
      const prevPositions = new Map(prev.map((n) => [n.id, n.position]));
      return topology.nodes.map((n) => ({
        ...n,
        position: prevPositions.get(n.id) || n.position,
      }));
    });
    setEdges(topology.edges);
  }, [topology, setNodes, setEdges]);

  // ---- Selection / neighbor highlighting --------------------------------
  const { neighborNodeIds, neighborEdgeIds, selectedNodeId } = useMemo(() => {
    if (!selectedRoomId) {
      return { neighborNodeIds: null, neighborEdgeIds: null, selectedNodeId: null };
    }
    const room = rooms.find((r) => r.id === selectedRoomId);
    if (!room) {
      return { neighborNodeIds: null, neighborEdgeIds: null, selectedNodeId: null };
    }
    if (room.roomType === 'direct') {
      if (isSelfRoom(room, user?.id)) {
        const selfNodeId = user ? USER_NODE_PREFIX + user.id : null;
        return {
          neighborNodeIds: selfNodeId ? new Set([selfNodeId]) : null,
          neighborEdgeIds: new Set(),
          selectedNodeId: selfNodeId,
        };
      }
      const peer = (room.members || []).find((m) => m.id !== user?.id);
      const peerNodeId = peer ? USER_NODE_PREFIX + peer.id : null;
      const selfNodeId = user ? USER_NODE_PREFIX + user.id : null;
      const nIds = new Set([peerNodeId, selfNodeId].filter(Boolean));
      const eIds = new Set();
      edges.forEach((e) => {
        if (e.data?.roomId === room.id) eIds.add(e.id);
      });
      return {
        neighborNodeIds: nIds,
        neighborEdgeIds: eIds,
        selectedNodeId: peerNodeId,
      };
    }
    const nIds = new Set([selectedRoomId]);
    const eIds = new Set();
    edges.forEach((e) => {
      if (e.source === selectedRoomId || e.target === selectedRoomId) {
        eIds.add(e.id);
        nIds.add(e.source);
        nIds.add(e.target);
      }
    });
    return {
      neighborNodeIds: nIds,
      neighborEdgeIds: eIds,
      selectedNodeId: selectedRoomId,
    };
  }, [edges, selectedRoomId, rooms, user]);

  const decoratedNodes = useMemo(
    () =>
      nodes.map((n) => {
        const isSelected = selectedNodeId && n.id === selectedNodeId;
        const isDimmed = neighborNodeIds ? !neighborNodeIds.has(n.id) : false;
        return {
          ...n,
          data: {
            ...n.data,
            selected: Boolean(isSelected),
            dimmed: isDimmed,
          },
        };
      }),
    [nodes, selectedNodeId, neighborNodeIds]
  );

  const decoratedEdges = useMemo(
    () =>
      edges.map((e) => {
        const isActive = neighborEdgeIds ? neighborEdgeIds.has(e.id) : true;
        const dimmed = neighborEdgeIds && !isActive;
        const baseStroke = e.style?.stroke;
        const baseWidth = e.style?.strokeWidth || 1.5;
        return {
          ...e,
          animated: Boolean(neighborEdgeIds && isActive),
          style: {
            ...e.style,
            stroke: dimmed ? 'rgba(255, 255, 255, 0.06)' : baseStroke,
            strokeWidth:
              isActive && neighborEdgeIds ? baseWidth + 1 : baseWidth,
          },
        };
      }),
    [edges, neighborEdgeIds]
  );

  // ---- Continuous 3D-style tumble + position writeback -----------------
  // The graph slowly tumbles around two wandering axes. We project every
  // node's "rest" position from the physics layer through that rotation and
  // write the result back into React Flow's node positions every frame.
  // Edges follow automatically since they read from the same positions.
  useEffect(() => {
    let frame = 0;
    const start = performance.now();

    // Stable per-id PRNG for resting Z (depth in the structure)
    const restZRef = new Map();
    const hashId = (id) => {
      let h = 0;
      for (let i = 0; i < id.length; i += 1) {
        h = (h << 5) - h + id.charCodeAt(i);
        h |= 0;
      }
      return Math.abs(h);
    };
    const ensureRestZ = (id) => {
      const existing = restZRef.get(id);
      if (existing !== undefined) return existing;
      const r = (hashId(id) % 10000) / 10000;
      const z = (r - 0.5) * 380;
      restZRef.set(id, z);
      return z;
    };

    // Perspective focal length (world units). Larger = milder parallax.
    const FOCAL = 700;

    const tick = (now) => {
      const t = (now - start) / 1000;
      const wrap = containerRef.current;
      const rest = restPositionsRef.current;
      const dragging = draggingRef.current;

      if (rest && rest.size > 0) {
        // Geometric center of the current rest layout
        let cx = 0;
        let cy = 0;
        let count = 0;
        rest.forEach((p) => {
          cx += p.x;
          cy += p.y;
          count += 1;
        });
        if (count > 0) {
          cx /= count;
          cy /= count;
        }

        // Two wandering rotation angles built from sums of sines with
        // mismatched periods. Asymmetric and never repeats.
        const ax =
          Math.sin(t * 0.045 + 0.6) * 0.55 +
          Math.sin(t * 0.11 + 2.1) * 0.28 +
          Math.sin(t * 0.21 + 4.3) * 0.12;
        const ay =
          Math.sin(t * 0.06) * 0.6 +
          Math.sin(t * 0.13 + 1.3) * 0.3 +
          Math.sin(t * 0.027 + 3.7) * 0.18;

        const cosX = Math.cos(ax);
        const sinX = Math.sin(ax);
        const cosY = Math.cos(ay);
        const sinY = Math.sin(ay);

        // Compute projected position per node
        const projected = new Map();
        const depths = new Map();
        rest.forEach((p, id) => {
          if (dragging.has(id)) {
            projected.set(id, { x: p.x, y: p.y });
            depths.set(id, 0.7);
            return;
          }
          const dx = p.x - cx;
          const dy = p.y - cy;
          const dz = ensureRestZ(id);

          // Y-axis rotation mixes X and Z
          const x1 = dx * cosY + dz * sinY;
          const z1 = -dx * sinY + dz * cosY;
          // X-axis rotation mixes Y and Z
          const y2 = dy * cosX - z1 * sinX;
          const z2 = dy * sinX + z1 * cosX;

          // Perspective projection
          const denom = FOCAL - z2;
          const scale = denom > 1 ? FOCAL / denom : 0.001;
          projected.set(id, {
            x: cx + x1 * scale,
            y: cy + y2 * scale,
          });
          depths.set(id, Math.max(0, Math.min(1, (z2 + 220) / 440)));
        });

        // Write projected positions back into React Flow.
        setNodes((prev) =>
          prev.map((node) => {
            const p = projected.get(node.id);
            if (!p) return node;
            // Only update if the value actually changed (avoid unnecessary
            // rerenders).
            if (
              node.position &&
              Math.abs(node.position.x - p.x) < 0.05 &&
              Math.abs(node.position.y - p.y) < 0.05
            ) {
              return node;
            }
            return { ...node, position: p };
          })
        );

        // Apply visual depth (brightness/blur) via a CSS variable on the
        // inner .g-node element.
        if (wrap) {
          const els = wrap.querySelectorAll('.react-flow__node');
          els.forEach((el) => {
            const id = el.getAttribute('data-id');
            const d = id ? depths.get(id) : null;
            if (d === undefined || d === null) return;
            const target = el.querySelector('.g-node') || el;
            target.style.setProperty('--depth', d.toFixed(3));
            el.style.zIndex = String(Math.round(d * 100));
          });
        }
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line
  }, []);

  // ---- Force layout & helpers ------------------------------------------
  const {
    restPositionsRef,
    draggingRef,
    onNodeDragStart,
    onNodeDrag,
    onNodeDragStop,
    reheat,
    rotateAround,
  } = useForceLayout({
    nodes,
    edges,
    width: size.width,
    height: size.height,
    enabled: nodes.length > 0,
  });

  // ---- Pan / drag -> idle tracking integration --------------------------
  const onMoveStart = useCallback(() => beginInteraction(), [beginInteraction]);
  const onMove = useCallback(() => tickInteraction(), [tickInteraction]);
  const onMoveEnd = useCallback(() => endInteraction(), [endInteraction]);

  const onNodeDragStartPlus = useCallback(
    (e, n) => {
      beginInteraction();
      onNodeDragStart(e, n);
    },
    [beginInteraction, onNodeDragStart]
  );
  const onNodeDragPlus = useCallback(
    (e, n) => {
      tickInteraction();
      onNodeDrag(e, n);
    },
    [tickInteraction, onNodeDrag]
  );
  const onNodeDragStopPlus = useCallback(
    (e, n) => {
      endInteraction();
      onNodeDragStop(e, n);
    },
    [endInteraction, onNodeDragStop]
  );

  // ---- Right-mouse rotation around the graph's geometric center ---------
  const rotateStateRef = useRef(null);
  const [rotating, setRotating] = useState(false);

  const getGraphCenter = useCallback(() => {
    if (nodes.length === 0) return null;
    let sx = 0;
    let sy = 0;
    let count = 0;
    for (const n of nodes) {
      const nw = n.width || 60;
      const nh = n.height || 32;
      const cx = (n.position?.x ?? 0) + nw / 2;
      const cy = (n.position?.y ?? 0) + nh / 2;
      sx += cx;
      sy += cy;
      count += 1;
    }
    if (count === 0) return null;
    return { wx: sx / count, wy: sy / count };
  }, [nodes]);

  const getCenterScreenPos = useCallback(() => {
    const center = getGraphCenter();
    if (!center) return null;
    const ox = center.wx * viewport.zoom + viewport.x;
    const oy = center.wy * viewport.zoom + viewport.y;
    return { ox, oy, wx: center.wx, wy: center.wy };
  }, [getGraphCenter, viewport]);

  const handleContextMenu = useCallback((event) => {
    event.preventDefault();
  }, []);

  const handleMouseDown = useCallback(
    (event) => {
      if (event.button !== 2) return;
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const pivot = getCenterScreenPos();
      if (!pivot) return;
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      rotateStateRef.current = {
        ox: pivot.ox,
        oy: pivot.oy,
        wx: pivot.wx,
        wy: pivot.wy,
        lastX: px,
        lastY: py,
      };
      setRotating(true);
      beginInteraction();
      event.preventDefault();
    },
    [getCenterScreenPos, beginInteraction]
  );

  useEffect(() => {
    const handleMouseMove = (event) => {
      const state = rotateStateRef.current;
      if (!state) return;
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;

      const a1 = Math.atan2(state.lastY - state.oy, state.lastX - state.ox);
      const a2 = Math.atan2(py - state.oy, px - state.ox);
      let delta = a2 - a1;
      if (delta > Math.PI) delta -= 2 * Math.PI;
      if (delta < -Math.PI) delta += 2 * Math.PI;

      if (delta !== 0) {
        rotateAround(state.wx, state.wy, delta);
        tickInteraction();
      }

      state.lastX = px;
      state.lastY = py;
    };

    const handleMouseUp = () => {
      if (rotateStateRef.current) {
        rotateStateRef.current = null;
        setRotating(false);
        endInteraction();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [rotateAround, endInteraction, tickInteraction]);

  // ---- Off-screen detection + auto-recenter watchdog --------------------
  const offscreen = useMemo(() => {
    if (nodes.length === 0) return false;
    const { x: vx, y: vy, zoom } = viewport;
    const margin = 40;
    const w = size.width;
    const h = size.height;
    let anyVisible = false;
    for (const n of nodes) {
      const nw = n.width || 60;
      const nh = n.height || 32;
      const cx = (n.position?.x ?? 0) + nw / 2;
      const cy = (n.position?.y ?? 0) + nh / 2;
      const sx = cx * zoom + vx;
      const sy = cy * zoom + vy;
      if (sx > -margin && sx < w + margin && sy > -margin && sy < h + margin) {
        anyVisible = true;
        break;
      }
    }
    return !anyVisible;
  }, [nodes, viewport, size.width, size.height]);

  useEffect(() => {
    if (!offscreen) return undefined;
    const handle = setInterval(() => {
      if (interactingRef.current > 0) return;
      const idleMs = Date.now() - lastInteractionRef.current;
      if (idleMs >= 3000) {
        fitView({ padding: 0.25, duration: 600 });
      }
    }, 500);
    return () => clearInterval(handle);
  }, [offscreen, fitView]);

  // ---- Initial fit ------------------------------------------------------
  const fittedRef = useRef(false);
  useEffect(() => {
    if (fittedRef.current) return;
    if (nodes.length === 0) return;
    const handle = setTimeout(() => {
      fitView({ padding: 0.25, duration: 500 });
      fittedRef.current = true;
    }, 600);
    return () => clearTimeout(handle);
  }, [nodes.length, fitView]);

  // ---- Click handlers ---------------------------------------------------
  const onNodeClick = useCallback(
    async (_event, node) => {
      if (node.type === 'roomNode') {
        onSelectRoom(node.data.roomId);
        return;
      }
      if (node.type === 'userNode') {
        if (node.data.self) {
          if (node.data.directRoomId) {
            onSelectRoom(node.data.directRoomId);
          } else {
            try {
              const room = await openSelfChat();
              if (room) onSelectRoom(room.id);
            } catch (err) {
              console.warn('Could not open Saved Messages:', err);
            }
          }
          return;
        }
        if (node.data.anon) return;

        if (node.data.directRoomId) {
          onSelectRoom(node.data.directRoomId);
          return;
        }
        try {
          const room = await createDirect(node.data.userId);
          onSelectRoom(room.id);
        } catch (err) {
          console.warn('Could not open chat:', err);
        }
      }
    },
    [onSelectRoom, createDirect, openSelfChat]
  );

  const onEdgeClick = useCallback(
    (_event, edge) => {
      const roomId = edge.data?.roomId;
      if (roomId) onSelectRoom(roomId);
    },
    [onSelectRoom]
  );

  return (
    <div
      className={`graph-wrap${rotating ? ' rotating' : ''}`}
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
    >
      <div className="graph-toolbar">
        <button
          className="btn ghost small"
          onClick={() => reheat(0.9)}
          title="Shuffle"
        >
          ✨ Shuffle
        </button>
        <button
          className="btn ghost small"
          onClick={() => fitView({ padding: 0.25, duration: 400 })}
          title="Fit"
        >
          ⤢ Fit
        </button>
      </div>

      <AnimatePresence>
        {offscreen && (
          <motion.button
            type="button"
            className="graph-offscreen-hint"
            onClick={() => fitView({ padding: 0.25, duration: 400 })}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
            title="Bring the graph back into view"
          >
            <span>graph is off-screen — click Fit</span>
            <span className="graph-offscreen-arrow" aria-hidden>↑</span>
          </motion.button>
        )}
      </AnimatePresence>

      {!loading && rooms.length === 0 && null}

      <ReactFlow
        nodes={decoratedNodes}
        edges={decoratedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onNodeDragStart={onNodeDragStartPlus}
        onNodeDrag={onNodeDragPlus}
        onNodeDragStop={onNodeDragStopPlus}
        onMoveStart={onMoveStart}
        onMove={onMove}
        onMoveEnd={onMoveEnd}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView={false}
        minZoom={0.3}
        maxZoom={2}
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick={false}
        panOnScroll={false}
        panOnDrag
        proOptions={{ hideAttribution: false }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
      >
        <Background
          color="rgba(255, 255, 255, 0.05)"
          gap={28}
          size={1.2}
          variant={BackgroundVariant.Dots}
        />
      </ReactFlow>

      <div className="graph-hint">
        drag nodes · scroll to zoom · right-drag to rotate · click a node to open chat
      </div>
    </div>
  );
};

const GraphView = (props) => (
  <ReactFlowProvider>
    <GraphCanvas {...props} />
  </ReactFlowProvider>
);

export default GraphView;
