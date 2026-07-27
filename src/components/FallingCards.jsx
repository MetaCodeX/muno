import React, { useEffect, useRef, useState } from 'react';

const CARD_POOL = [
  'red_7.svg','blue_skip.svg','green_reverse.svg','yellow_draw_2.svg',
  'wild.svg','wild_draw_4.svg','red_0.svg','blue_3.svg','green_8.svg',
  'yellow_5.svg','red_reverse.svg','blue_draw_2.svg','green_skip.svg',
  'yellow_9.svg','red_4.svg','blue_wild.svg','green_2.svg','yellow_reverse.svg',
  'red_skip.svg','blue_6.svg','back.svg','back.svg','back.svg','back.svg',
];

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

function makeCard(id) {
  const flipped = Math.random() < 0.45;
  return {
    id,
    file: CARD_POOL[Math.floor(Math.random() * CARD_POOL.length)],
    x: randomBetween(-4, 104),           // vw %
    startY: randomBetween(-30, -8),      // vh % (above viewport)
    size: randomBetween(52, 110),        // px width
    rotation: randomBetween(-42, 42),    // deg
    rotationSpeed: randomBetween(-0.6, 0.6), // deg per 16ms
    fallSpeed: randomBetween(0.18, 0.48), // vh per 16ms
    opacity: randomBetween(0.08, 0.28),
    flipped,
    y: randomBetween(-30, -8),
    wobble: randomBetween(0, Math.PI * 2),
    wobbleSpeed: randomBetween(0.015, 0.045),
    wobbleAmp: randomBetween(0.3, 1.8),  // vw amplitude
    currentX: randomBetween(-4, 104),
  };
}

export function FallingCards({ count = 18 }) {
  const [cards, setCards] = useState(() =>
    Array.from({ length: count }, (_, i) => {
      const c = makeCard(i);
      // Distribute initial positions across screen (not all at top)
      c.y = randomBetween(-30, 110);
      c.currentX = c.x;
      return c;
    })
  );
  const rafRef = useRef(null);
  const nextId = useRef(count);

  useEffect(() => {
    let running = true;

    function tick() {
      if (!running) return;
      setCards(prev => prev.map(card => {
        let newY = card.y + card.fallSpeed;
        let newRot = card.rotation + card.rotationSpeed;
        let newWobble = card.wobble + card.wobbleSpeed;
        let newX = card.x + Math.sin(newWobble) * card.wobbleAmp;

        // Reset card when it falls off bottom
        if (newY > 115) {
          const fresh = makeCard(nextId.current++);
          fresh.y = fresh.startY;
          fresh.currentX = fresh.x;
          return fresh;
        }

        return { ...card, y: newY, rotation: newRot, wobble: newWobble, currentX: newX };
      }));
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      pointerEvents: 'none',
      zIndex: 0,
      overflow: 'hidden',
    }}>
      {cards.map(card => (
        <div
          key={card.id}
          style={{
            position: 'absolute',
            left: `${card.currentX}vw`,
            top: `${card.y}vh`,
            width: `${card.size}px`,
            opacity: card.opacity,
            transform: `rotate(${card.rotation}deg) ${card.flipped ? 'scaleX(-1)' : ''}`,
            willChange: 'transform, top, left',
            filter: 'blur(0.4px)',
          }}
        >
          <img
            src={`/cards/${card.file}`}
            alt=""
            draggable={false}
            style={{
              width: '100%',
              display: 'block',
              borderRadius: '6px',
            }}
          />
        </div>
      ))}
    </div>
  );
}
