import React from 'react';

// Simple animated ECG 3D loader (SVG based, can be enhanced)
export default function ECG3DLoader({ text = 'Processing...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <svg width="80" height="60" viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polyline
          points="0,30 15,30 25,10 35,50 45,20 55,40 65,30 80,30"
          fill="none"
          stroke="#06b6d4"
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          <animate
            attributeName="stroke-dasharray"
            values="0,200;100,100;0,200"
            dur="1.2s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="stroke-dashoffset"
            values="0;100;0"
            dur="1.2s"
            repeatCount="indefinite"
          />
        </polyline>
      </svg>
      <span className="mt-4 text-cyan-600 font-semibold animate-pulse">{text}</span>
    </div>
  );
}
