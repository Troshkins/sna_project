import React, { useCallback, useEffect, useState, useMemo } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import UserNode from './UserNode';
import RoomNode from './RoomNode';

const nodeTypes = { userNode: UserNode, roomNode: RoomNode };

const GraphView = ({ onSelectRoom, refreshTrigger }) => {
  const { user } = useAuth();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const buildGraph = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/rooms'); // получаем все комнаты текущего пользователя
      const rooms = res.data.data;
      const currentUserNode = {
        id: user.id,
        type: 'userNode',
        position: { x: 400, y: 300 },
        data: { label: user.username, userId: user.id }
      };

      const roomNodes = [];
      const edgesData = [];
      const userSet = new Set([user.id]);

      rooms.forEach((room, index) => {
        const angle = (index * (2 * Math.PI)) / rooms.length;
        const x = 400 + 250 * Math.cos(angle);
        const y = 300 + 250 * Math.sin(angle);
        roomNodes.push({
          id: room._id,
          type: 'roomNode',
          position: { x, y },
          data: { 
            label: room.roomType === 'direct' 
              ? (room.members.find(m => m._id !== user.id)?.username || 'Чат') 
              : room.name,
            roomId: room._id,
            roomType: room.roomType
          }
        });
        edgesData.push({
          id: `e-${user.id}-${room._id}`,
          source: user.id,
          target: room._id,
          style: { stroke: '#2C7873', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#2C7873' }
        });
        room.members.forEach(m => {
          if (!userSet.has(m._id)) {
            userSet.add(m._id);
            // добавляем узлы пользователей (кроме себя)
            // Но они могут дублироваться; ради простоты разместим рядом 
            // Здесь можно оптимизировать; пока пропустим, т.к. фокус на комнатах
          }
        });
      });

      setNodes([currentUserNode, ...roomNodes]);
      setEdges(edgesData);
    } catch (error) {
      console.error('Ошибка загрузки комнат', error);
    }
  }, [user, setNodes, setEdges]);

  useEffect(() => {
    buildGraph();
  }, [buildGraph, refreshTrigger]);

  const onNodeClick = useCallback((event, node) => {
    if (node.type === 'roomNode') {
      onSelectRoom(node.data.roomId);
    }
  }, [onSelectRoom]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      nodeTypes={nodeTypes}
      fitView
      style={{ background: '#021C1E' }}
    >
      <Background color="#004445" gap={16} />
      <Controls />
    </ReactFlow>
  );
};

export default GraphView;
