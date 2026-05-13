import React from 'react';
import { gradientFor, initialsOf } from '../../utils/avatar';

const Avatar = ({ seed, name, size }) => {
  const styleSize =
    size === 'lg' ? 'avatar lg' : size === 'sm' ? 'avatar' : 'avatar';
  return (
    <div
      className={styleSize}
      style={{ background: gradientFor(seed || name) }}
      aria-hidden
    >
      {initialsOf(name)}
    </div>
  );
};

export default Avatar;
