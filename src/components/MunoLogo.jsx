import React from 'react';

export function MunoLogo({ width = '340px', className = '', style = {} }) {
  return (
    <div
      className={className}
      style={{
        width,
        maxWidth: '100%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        filter: 'drop-shadow(0 12px 30px rgba(0, 0, 0, 0.6))',
        userSelect: 'none',
        ...style,
      }}
    >
      <img
        src="/muno_logo.svg"
        alt="MμN0!"
        draggable={false}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
        }}
      />
    </div>
  );
}
