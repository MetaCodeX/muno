import React, { useState, useEffect } from 'react';
import { Crown, Users, Play, LogOut, Edit2, Check, Wifi, WifiOff } from 'lucide-react';
import { FallingCards } from './FallingCards';
import { MunoLogo } from './MunoLogo';

export function Lobby({
  roomCode,
  players,
  mySessionId,
  isAdmin,
  linkOpen,
  connected,
  onToggleLink,
  onKick,
  onStart,
  onLeave,
  onRename,
}) {
  const [copied, setCopied] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState('');

  const me = players.find(p => p.sessionId === mySessionId);
  const inviteLink = `${window.location.origin}?join=${roomCode}`;

  // Robust clipboard copy (works on http too)
  const copyLink = () => {
    const doCopy = (text) => {
      // Modern API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text)
          .then(() => true)
          .catch(() => false);
      }
      return Promise.resolve(false);
    };

    const fallbackCopy = (text) => {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.cssText = 'position:fixed;opacity:0;top:0;left:0;';
      document.body.appendChild(el);
      el.focus();
      el.select();
      try {
        document.execCommand('copy');
        document.body.removeChild(el);
        return true;
      } catch {
        document.body.removeChild(el);
        return false;
      }
    };

    doCopy(inviteLink).then(ok => {
      if (!ok) fallbackCopy(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const submitRename = (e) => {
    e.preventDefault();
    const val = renameVal.trim();
    if (val) onRename(val);
    setRenaming(false);
  };

  const canStart = players.length >= 2;

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: '#07090f',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <FallingCards count={16} />

      {/* Ambient glows */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
        <div style={{ position: 'absolute', top: '-15%', right: '10%', width: '40vw', height: '40vw', borderRadius: '50%', background: 'rgba(0,136,255,0.06)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '5%', width: '45vw', height: '45vw', borderRadius: '50%', background: 'rgba(255,59,92,0.06)', filter: 'blur(90px)' }} />
      </div>

      {/* Status pill top-left */}
      <div style={{
        position: 'fixed', top: '1rem', left: '1rem', zIndex: 100,
        display: 'flex', alignItems: 'center', gap: '0.35rem',
        padding: '0.3rem 0.7rem',
        background: 'rgba(10,12,22,0.9)',
        border: `1px solid ${connected ? 'rgba(0,230,118,0.2)' : 'rgba(255,59,92,0.2)'}`,
        borderRadius: '20px',
        backdropFilter: 'blur(10px)',
        fontSize: '0.68rem',
        fontWeight: 700,
        color: connected ? '#00e676' : '#ff6b82',
        letterSpacing: '0.05em',
      }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: connected ? '#00e676' : '#ff3b5c', boxShadow: connected ? '0 0 6px #00e676' : 'none' }} />
        {connected ? 'en línea' : 'reconectando...'}
      </div>

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '520px', padding: '1rem', boxSizing: 'border-box' }}>

        {/* Logo small */}
        <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
          <MunoLogo width="220px" />
          <div style={{ fontSize: '0.65rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginTop: '0.3rem', fontWeight: 700 }}>sala de espera</div>
        </div>

        {/* Panel */}
        <div style={{
          background: 'rgba(10, 13, 24, 0.9)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '20px',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 40px 80px rgba(0,0,0,0.7)',
          backdropFilter: 'blur(24px)',
          overflow: 'hidden',
        }}>

          {/* Accent line */}
          <div style={{ height: '2px', background: 'linear-gradient(90deg, #ff3b5c, #c840e9, #0088ff, #00e676)', opacity: 0.5 }} />

          <div style={{ padding: '1.4rem 1.6rem' }}>

            {/* Room code section */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.2rem',
              paddingBottom: '1.2rem',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div>
                <div style={{ fontSize: '0.63rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: '0.3rem', fontWeight: 600 }}>
                  código
                </div>
                <div style={{
                  fontSize: '2.4rem',
                  fontWeight: 900,
                  letterSpacing: '0.22em',
                  color: '#fff',
                  fontFamily: 'var(--font-code)',
                  textShadow: '0 0 30px rgba(200,64,233,0.4)',
                  lineHeight: 1,
                }}>
                  {roomCode}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                {/* Copy button */}
                <button
                  onClick={copyLink}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.45rem 0.9rem',
                    borderRadius: '9px',
                    border: copied
                      ? '1px solid rgba(0,230,118,0.35)'
                      : '1px solid rgba(255,255,255,0.12)',
                    background: copied
                      ? 'rgba(0,230,118,0.08)'
                      : 'rgba(255,255,255,0.06)',
                    color: copied ? '#00e676' : 'rgba(255,255,255,0.6)',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    transition: 'all 0.2s ease',
                    letterSpacing: '0.02em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {copied ? (
                    <>
                      <span style={{ fontSize: '0.85rem' }}>✓</span>
                      ¡Copiado!
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: '0.8rem' }}>⎘</span>
                      Copiar enlace
                    </>
                  )}
                </button>

                {/* Toggle link (admin only) */}
                {isAdmin && (
                  <button
                    onClick={onToggleLink}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.35rem',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '9px',
                      border: linkOpen
                        ? '1px solid rgba(0,230,118,0.2)'
                        : '1px solid rgba(255,59,92,0.2)',
                      background: linkOpen
                        ? 'rgba(0,230,118,0.06)'
                        : 'rgba(255,59,92,0.06)',
                      color: linkOpen ? 'rgba(0,230,118,0.7)' : 'rgba(255,100,100,0.7)',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span>{linkOpen ? '🔓' : '🔒'}</span>
                    {linkOpen ? 'Enlace abierto' : 'Enlace cerrado'}
                  </button>
                )}
              </div>
            </div>

            {/* My identity row */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.63rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', marginBottom: '0.45rem', fontWeight: 600 }}>
                Tú
              </div>

              {renaming ? (
                <form onSubmit={submitRename} style={{
                  display: 'flex', gap: '0.5rem',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(200,64,233,0.3)',
                  borderRadius: '10px',
                  padding: '0.5rem 0.7rem',
                  alignItems: 'center',
                }}>
                  <input
                    autoFocus
                    value={renameVal}
                    onChange={e => setRenameVal(e.target.value)}
                    maxLength={20}
                    placeholder="Nuevo apodo..."
                    style={{
                      flex: 1,
                      background: 'none',
                      border: 'none',
                      color: '#fff',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      fontFamily: 'var(--font-body)',
                      outline: 'none',
                      caretColor: '#c840e9',
                    }}
                  />
                  <button type="submit" style={{ background: 'none', border: 'none', color: '#00e676', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem', padding: '0.1rem 0.3rem' }}>✓</button>
                  <button type="button" onClick={() => setRenaming(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,100,100,0.6)', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem', padding: '0.1rem 0.3rem' }}>✕</button>
                </form>
              ) : (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '10px',
                  padding: '0.55rem 0.8rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <PlayerDot color={me?.color} size={11} glow />
                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff' }}>{me?.username || '...'}</span>
                    {isAdmin && <span style={{ fontSize: '0.65rem', background: 'rgba(255,193,7,0.15)', border: '1px solid rgba(255,193,7,0.3)', color: '#ffc107', padding: '0.1rem 0.45rem', borderRadius: '6px', fontWeight: 800, letterSpacing: '0.04em' }}>ADMIN</span>}
                  </div>
                  <button
                    onClick={() => { setRenameVal(me?.username || ''); setRenaming(true); }}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
                    title="Cambiar nombre"
                    onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
                  >
                    <Edit2 size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* Players list */}
            <div style={{ marginBottom: '1.2rem' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontSize: '0.63rem', letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.22)', marginBottom: '0.5rem', fontWeight: 600,
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Users size={10} /> jugadores
                </span>
                <span>{players.length}/16</span>
              </div>

              <div style={{
                display: 'flex', flexDirection: 'column', gap: '0.3rem',
                maxHeight: '200px', overflowY: 'auto',
                paddingRight: '2px',
              }}>
                {players.map((p, i) => {
                  const isMe = p.sessionId === mySessionId;
                  return (
                    <div
                      key={p.sessionId}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0.45rem 0.75rem',
                        borderRadius: '8px',
                        background: isMe ? 'rgba(200,64,233,0.06)' : 'rgba(255,255,255,0.025)',
                        border: isMe ? '1px solid rgba(200,64,233,0.15)' : '1px solid rgba(255,255,255,0.04)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                        <PlayerDot color={p.color} size={9} glow={p.connected} opacity={p.connected ? 1 : 0.3} />
                        <span style={{
                          fontSize: '0.82rem', fontWeight: isMe ? 800 : 600,
                          color: p.connected ? (isMe ? '#fff' : 'rgba(255,255,255,0.75)') : 'rgba(255,255,255,0.3)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {p.username}
                        </span>
                        {p.isAdmin && <Crown size={11} color="#ffc107" />}
                        {!p.connected && <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.2)', marginLeft: '-0.15rem' }}>• off</span>}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-code)' }}>#{i + 1}</span>
                        {isAdmin && !isMe && !p.isAdmin && (
                          <button
                            onClick={() => onKick(p.sessionId)}
                            style={{
                              background: 'none', border: 'none',
                              color: 'rgba(255,100,100,0.3)',
                              cursor: 'pointer', fontSize: '0.72rem',
                              padding: '0.1rem 0.25rem', borderRadius: '4px',
                              lineHeight: 1,
                              transition: 'color 0.15s',
                            }}
                            title={`Expulsar a ${p.username}`}
                            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,100,100,0.8)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,100,100,0.3)'}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Empty slots hint */}
                {players.length < 2 && (
                  <div style={{ textAlign: 'center', padding: '0.6rem', fontSize: '0.72rem', color: 'rgba(255,255,255,0.18)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.06)' }}>
                    Comparte el código para invitar
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              {isAdmin && (
                <button
                  onClick={onStart}
                  disabled={!canStart}
                  style={{
                    flex: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem',
                    padding: '0.75rem',
                    border: 'none',
                    borderRadius: '12px',
                    background: canStart
                      ? 'linear-gradient(135deg, #00e676 0%, #0088ff 100%)'
                      : 'rgba(255,255,255,0.05)',
                    color: canStart ? '#07090f' : 'rgba(255,255,255,0.2)',
                    fontSize: '0.88rem',
                    fontWeight: 900,
                    fontFamily: 'var(--font-body)',
                    cursor: canStart ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s ease',
                    letterSpacing: '0.02em',
                    boxShadow: canStart ? '0 4px 20px rgba(0,136,255,0.3)' : 'none',
                  }}
                >
                  <Play size={15} />
                  Iniciar partida
                </button>
              )}

              <button
                onClick={onLeave}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  padding: '0.75rem 1rem',
                  border: '1px solid rgba(255,100,100,0.18)',
                  borderRadius: '12px',
                  background: 'rgba(255,59,92,0.06)',
                  color: 'rgba(255,100,100,0.6)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-body)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  ...(isAdmin ? {} : { flex: 1 }),
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,59,92,0.12)'; e.currentTarget.style.color = '#ff6b82'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,59,92,0.06)'; e.currentTarget.style.color = 'rgba(255,100,100,0.6)'; }}
              >
                <LogOut size={13} />
                Salir
              </button>
            </div>

            {/* Waiting hint for non-admins */}
            {!isAdmin && (
              <div style={{ textAlign: 'center', marginTop: '0.8rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.18)', letterSpacing: '0.04em' }}>
                Esperando que el admin inicie la partida...
              </div>
            )}
            {isAdmin && !canStart && (
              <div style={{ textAlign: 'center', marginTop: '0.8rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.18)', letterSpacing: '0.04em' }}>
                Necesitas al menos 2 jugadores para empezar
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerDot({ color, size = 10, glow = false, opacity = 1 }) {
  return (
    <span style={{
      display: 'inline-block',
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      background: color || '#888',
      boxShadow: glow ? `0 0 ${size}px ${color || '#888'}` : 'none',
      flexShrink: 0,
      opacity,
    }} />
  );
}
