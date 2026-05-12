import React from 'react';
import { Handle, Position } from 'reactflow';

const UserNode = ({ data }) => (
  <div className="user-node">
    <Handle type="target" position={Position.Top} style={{ background: '#6FB98F' }} />
    <strong>{data.label}</strong>
    <Handle type="source" position={Position.Bottom} style={{ background: '#6FB98F' }} />
  </div>
);

export default UserNode;
