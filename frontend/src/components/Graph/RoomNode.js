import React from 'react';
import { Handle, Position } from 'reactflow';

const RoomNode = ({ data }) => (
  <div className="room-node">
    <Handle type="target" position={Position.Top} style={{ background: '#2C7873' }} />
    <span>{data.label}</span>
    <Handle type="source" position={Position.Bottom} style={{ background: '#2C7873' }} />
  </div>
);

export default RoomNode;
