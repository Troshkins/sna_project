import React, { useCallback } from 'react';
import { BaseEdge, getStraightPath, useStore } from 'reactflow';

// Compute the point where the line between two node centers crosses the
// border of `intersectionNode`. Treats the node as an axis-aligned rectangle
// — for our pill-shaped nodes this is close enough that the rounded corners
// don't make the attachment look off.
function getNodeIntersection(intersectionNode, targetNode) {
  const w = intersectionNode.width / 2;
  const h = intersectionNode.height / 2;

  const x2 = intersectionNode.positionAbsolute.x + w;
  const y2 = intersectionNode.positionAbsolute.y + h;
  const x1 = targetNode.positionAbsolute.x + targetNode.width / 2;
  const y1 = targetNode.positionAbsolute.y + targetNode.height / 2;

  const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h);
  const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h);
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1));
  const xx3 = a * xx1;
  const yy3 = a * yy1;

  return {
    x: w * (xx3 + yy3) + x2,
    y: h * (yy3 - xx3) + y2,
  };
}

function getEdgeParams(source, target) {
  const sp = getNodeIntersection(source, target);
  const tp = getNodeIntersection(target, source);
  return { sx: sp.x, sy: sp.y, tx: tp.x, ty: tp.y };
}

/**
 * Edge that always attaches at the closest point on each node's border
 * facing its counterpart. Looks much cleaner than React Flow's default
 * fixed-handle attachment for free-floating force-directed graphs.
 */
const FloatingEdge = ({ id, source, target, markerEnd, style }) => {
  const sourceNode = useStore(
    useCallback((store) => store.nodeInternals.get(source), [source])
  );
  const targetNode = useStore(
    useCallback((store) => store.nodeInternals.get(target), [target])
  );

  // Nodes don't always have measured dimensions on the very first render.
  if (
    !sourceNode ||
    !targetNode ||
    !sourceNode.width ||
    !sourceNode.height ||
    !targetNode.width ||
    !targetNode.height
  ) {
    return null;
  }

  const { sx, sy, tx, ty } = getEdgeParams(sourceNode, targetNode);
  const [path] = getStraightPath({
    sourceX: sx,
    sourceY: sy,
    targetX: tx,
    targetY: ty,
  });

  return <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />;
};

export default FloatingEdge;
