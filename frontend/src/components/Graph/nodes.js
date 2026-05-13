import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

const withHandles = (content) => (
  <>
    <Handle type="target" position={Position.Top} className="g-handle" />
    {content}
    <Handle type="source" position={Position.Bottom} className="g-handle" />
  </>
);

export const UserNode = memo(({ data }) => {
  const { label, self, selected, dimmed, directRoomId, anon } = data;

  // Anonymous (non-friend) users render as a tiny dot only — no label, no
  // hover affordance. The shape is fully driven by the .anon CSS class.
  if (anon) {
    const className = 'g-node user anon' + (dimmed ? ' dimmed' : '');
    return <div className={className}>{withHandles(null)}</div>;
  }

  const className =
    'g-node user' +
    (self ? ' self' : '') +
    (selected ? ' selected' : '') +
    (dimmed ? ' dimmed' : '') +
    (directRoomId ? ' clickable' : '');
  return (
    <div className={className}>
      {withHandles(
        <>
          <span className="g-dot" />
          <span className="g-label">{label}</span>
        </>
      )}
    </div>
  );
});

export const RoomNode = memo(({ data }) => {
  const { label, selected, dimmed } = data;
  const className =
    'g-node room' +
    (selected ? ' selected' : '') +
    (dimmed ? ' dimmed' : '') +
    // Group label is hidden by default and only revealed when the group is
    // actively selected. This keeps the canvas calm when many groups exist.
    (selected ? ' show-label' : '');
  return (
    <div className={className}>
      {withHandles(
        <>
          <span className="g-dot" />
          <span className="g-label">{label}</span>
        </>
      )}
    </div>
  );
});

export const nodeTypes = {
  userNode: UserNode,
  roomNode: RoomNode,
};
