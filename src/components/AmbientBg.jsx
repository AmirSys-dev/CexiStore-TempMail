import React from 'react';

export default function AmbientBg({ variant = 'default' }) {
  const coreStyle = variant === 'danger' ? {
    background: 'radial-gradient(circle at 30% 30%, rgba(239, 68, 68, 0.8), rgba(239, 68, 68, 0.1) 60%, transparent 80%)',
    boxShadow: '0 0 50px rgba(239, 68, 68, 0.2), 0 0 100px rgba(239, 68, 68, 0.05)'
  } : {};

  const ringStyleFn = (i) => variant === 'danger' ? {
    borderColor: `rgba(239, 68, 68, ${0.2 - i * 0.05})`
  } : {};

  return (
    <div className="ambient-bg">
      <div className="ag-container">
        <div className="ag-ring" style={ringStyleFn(0)}></div>
        <div className="ag-ring" style={ringStyleFn(1)}></div>
        <div className="ag-ring" style={ringStyleFn(2)}></div>
        <div className="ag-ring"></div>
        <div className="ag-core" style={coreStyle}></div>
        <div className="ag-particle" style={{ animationDelay: '0s' }}></div>
        <div className="ag-particle" style={{ animationDelay: '3s', top: '100px', left: '100px' }}></div>
        <div className="ag-particle" style={{ animationDelay: '-5s', top: '-150px', left: '200px' }}></div>
      </div>
    </div>
  );
}
