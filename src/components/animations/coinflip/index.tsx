import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Coin } from './coin';

export const CoinFlipScene = ({ isWin, side }: { isWin: boolean, side: boolean }) => {
  return (
    <div style={{ height: '350px', width: '100%' }}>
      <Canvas
        camera={{ position: [0, 3, 3], fov: 45 }}
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <directionalLight position={[-5, -5, -5]} intensity={0.5} />
          <Coin isWin={isWin} side={side} />
        </Suspense>
      </Canvas>
    </div>
  );
};