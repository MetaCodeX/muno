import React, { useState, useRef } from 'react';
import { User, Trophy, Award, RefreshCw } from 'lucide-react';
import { FallingCards } from './FallingCards';
import { MunoLogo } from './MunoLogo';

export function Home({
  savedUsername,
  initialJoinCode,
  initialTab,
  onCreateRoom,
  onJoinRoom,
  leaderboard = [],
  onOpenProfile,
  onRefreshLeaderboard,
  loading,
  error
}) {
  const [username, setUsername] = useState(savedUsername || '');
  const [joinCode, setJoinCode] = useState(initialJoinCode || '');
  const [tab, setTab] = useState(initialJoinCode ? 'join' : (initialTab || 'join'));
  const usernameRef = useRef(null);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!username.trim() || loading) return;
    onCreateRoom(username.trim());
  };

  const handleJoin = (e) => {
    e.preventDefault();
    const code = joinCode.toUpperCase().trim();
    if (!username.trim() || !code || loading) return;
    onJoinRoom(code, username.trim());
  };

  const canJoin = username.trim().length > 0 && joinCode.length >= 4 && !loading;
  const canCreate = username.trim().length > 0 && !loading;

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: '#07090f',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflowX: 'hidden',
      overflowY: 'auto',
      position: 'relative',
    }}>

      {/* Falling cards background */}
      <FallingCards count={20} />

      {/* Ambient glows */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
        <div style={{ position: 'absolute', top: '-10%', left: '10%', width: '45vw', height: '45vw', borderRadius: '50%', background: 'rgba(255,59,92,0.07)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '5%', width: '50vw', height: '50vw', borderRadius: '50%', background: 'rgba(0,136,255,0.07)', filter: 'blur(90px)' }} />
        <div style={{ position: 'absolute', top: '30%', right: '15%', width: '30vw', height: '30vw', borderRadius: '50%', background: 'rgba(176,0,255,0.05)', filter: 'blur(70px)' }} />
      </div>

      {/* Content wrapper */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        padding: '1.5rem 1rem',
        boxSizing: 'border-box',
      }}>

        {/* LOGO */}
        <div style={{ marginBottom: '1.8rem', textAlign: 'center', userSelect: 'none' }}>
          <MunoLogo width="320px" />
          <div style={{
            marginTop: '0.4rem',
            fontSize: '0.75rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.4)',
            fontFamily: 'var(--font-code)',
            fontWeight: 800,
          }}>
            v0.9.9.8888-alpha.3 · By Dr.MetaCodeX
          </div>
        </div>

        {/* ═══ 2-COLUMN MAIN CONTAINER (PC SIDE-BY-SIDE) ════════════════════════════ */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'center',
          gap: '1.8rem',
          width: '100%',
          maxWidth: '860px',
        }}>

          {/* ── LEFT / MAIN ACTION BOX (WITH ATTACHED PROFILE ICON BUTTON) ── */}
          <div style={{ position: 'relative', flex: '1 1 360px', maxWidth: '400px' }}>

            {/* SQUARE PROFILE ICON BUTTON ATTACHED OUTSIDE TOP-LEFT CORNER */}
            <button
              onClick={onOpenProfile}
              title="Mi Perfil & Código Único (UUID)"
              style={{
                position: 'absolute',
                top: 0,
                left: '-54px',
                width: '44px',
                height: '44px',
                background: 'rgba(12, 15, 26, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                borderRadius: '12px',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                backdropFilter: 'blur(16px)',
                transition: 'all 0.2s ease',
                zIndex: 15,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#0088ff';
                e.currentTarget.style.transform = 'scale(1.06)';
                e.currentTarget.style.boxShadow = '0 0 16px rgba(0,136,255,0.4)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.6)';
              }}
            >
              <User size={22} color="#ffffff" />
            </button>

            {/* MAIN ACTION CARD BOX */}
            <div style={{
              width: '100%',
              background: 'rgba(12, 15, 26, 0.88)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '20px',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 40px 80px rgba(0,0,0,0.7), 0 0 60px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(24px)',
              overflow: 'hidden',
            }}>
              {/* Accent top bar */}
              <div style={{ height: '3px', background: 'linear-gradient(90deg, #ff3b5c, #c840e9, #0088ff, #00e676)', opacity: 0.7 }} />

              <div style={{ padding: '1.6rem 1.8rem 1.8rem' }}>

                {/* Username field */}
                <div style={{ marginBottom: '1.3rem' }}>
                  <div style={{ fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Tu apodo
                  </div>
                  <input
                    ref={usernameRef}
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    maxLength={20}
                    placeholder="cómo te llaman..."
                    autoComplete="nickname"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      background: 'rgba(255,255,255,0.045)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#fff',
                      padding: '0.7rem 1rem',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      fontFamily: 'var(--font-body)',
                      outline: 'none',
                      transition: 'border-color 0.2s, background 0.2s',
                      caretColor: '#c840e9',
                    }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(200,64,233,0.5)'; e.target.style.background = 'rgba(255,255,255,0.07)'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.045)'; }}
                  />
                </div>

                {/* Tab switcher */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: '10px',
                  padding: '3px',
                  marginBottom: '1.3rem',
                  gap: '3px',
                }}>
                  {[
                    { id: 'join', label: 'Unirse', emoji: '🎮' },
                    { id: 'create', label: 'Crear sala', emoji: '✦' },
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      style={{
                        padding: '0.55rem 0.5rem',
                        border: 'none',
                        borderRadius: '8px',
                        background: tab === t.id
                          ? 'rgba(255,255,255,0.1)'
                          : 'transparent',
                        color: tab === t.id ? '#fff' : 'rgba(255,255,255,0.4)',
                        fontSize: '0.82rem',
                        fontWeight: tab === t.id ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        boxShadow: tab === t.id ? '0 2px 8px rgba(0,0,0,0.4)' : 'none',
                      }}
                    >
                      <span>{t.emoji}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>

                {/* JOIN FORM */}
                {tab === 'join' && (
                  <form onSubmit={handleJoin}>
                    <div style={{ marginBottom: '1.3rem' }}>
                      <div style={{ fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: '0.5rem', fontWeight: 600 }}>
                        Código de sala
                      </div>
                      <input
                        value={joinCode}
                        onChange={e => setJoinCode(e.target.value.toUpperCase())}
                        maxLength={5}
                        placeholder="EJ: 9QVB9"
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          background: 'rgba(255,255,255,0.045)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                          color: '#fff',
                          padding: '0.75rem 1rem',
                          fontSize: '1.6rem',
                          fontWeight: 900,
                          letterSpacing: '0.3em',
                          fontFamily: 'var(--font-code)',
                          outline: 'none',
                          textTransform: 'uppercase',
                          textAlign: 'center',
                          caretColor: '#0088ff',
                          transition: 'border-color 0.2s, background 0.2s',
                        }}
                        onFocus={e => { e.target.style.borderColor = 'rgba(0,136,255,0.6)'; e.target.style.background = 'rgba(255,255,255,0.07)'; }}
                        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.045)'; }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!canJoin}
                      style={{
                        width: '100%',
                        padding: '0.8rem',
                        border: 'none',
                        borderRadius: '12px',
                        background: canJoin
                          ? 'linear-gradient(135deg, #0088ff 0%, #c840e9 100%)'
                          : 'rgba(255,255,255,0.06)',
                        color: canJoin ? '#fff' : 'rgba(255,255,255,0.2)',
                        fontSize: '0.9rem',
                        fontWeight: 800,
                        fontFamily: 'var(--font-body)',
                        cursor: canJoin ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s ease',
                        letterSpacing: '0.02em',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        boxShadow: canJoin ? '0 4px 24px rgba(0,136,255,0.35)' : 'none',
                      }}
                    >
                      {loading
                        ? <span className="spin" style={{ display: 'inline-block', width: '16px', height: '16px', border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} />
                        : null}
                      {loading ? 'Conectando...' : '→ Entrar a la sala'}
                    </button>
                  </form>
                )}

                {/* CREATE FORM */}
                {tab === 'create' && (
                  <form onSubmit={handleCreate}>
                    <div style={{
                      padding: '1.1rem',
                      background: 'rgba(255,255,255,0.025)',
                      border: '1px dashed rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      marginBottom: '1.3rem',
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '1.8rem', marginBottom: '0.3rem' }}>🃏</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', marginBottom: '0.2rem' }}>
                        Crear nueva sala de juego
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>
                        Genera un código único e invita hasta 15 amigos con un simple enlace.
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!canCreate}
                      style={{
                        width: '100%',
                        padding: '0.8rem',
                        border: 'none',
                        borderRadius: '12px',
                        background: canCreate
                          ? 'linear-gradient(135deg, #ff3b5c 0%, #ff9f43 100%)'
                          : 'rgba(255,255,255,0.06)',
                        color: canCreate ? '#fff' : 'rgba(255,255,255,0.2)',
                        fontSize: '0.9rem',
                        fontWeight: 800,
                        fontFamily: 'var(--font-body)',
                        cursor: canCreate ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s ease',
                        letterSpacing: '0.02em',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        boxShadow: canCreate ? '0 4px 24px rgba(255,59,92,0.3)' : 'none',
                      }}
                    >
                      {loading
                        ? <span className="spin" style={{ display: 'inline-block', width: '16px', height: '16px', border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} />
                        : null}
                      {loading ? 'Creando sala...' : '✦ Crear nueva sala'}
                    </button>
                  </form>
                )}

                {/* Error */}
                {error && (
                  <div style={{
                    marginTop: '0.9rem',
                    padding: '0.6rem 0.85rem',
                    background: 'rgba(255,59,92,0.08)',
                    border: '1px solid rgba(255,59,92,0.2)',
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    color: '#ff6b82',
                    fontWeight: 600,
                    lineHeight: 1.4,
                  }}>
                    {error}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: EMBEDDED LEADERBOARD PANEL (1/3 MONITOR WIDTH ON PC) ── */}
          <div style={{
            flex: '1 1 340px',
            maxWidth: '380px',
            background: 'rgba(12, 15, 26, 0.88)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 40px 80px rgba(0,0,0,0.7)',
            backdropFilter: 'blur(24px)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Header */}
            <div style={{
              padding: '1.1rem 1.3rem 0.85rem 1.3rem',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(15, 22, 40, 0.6)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <Trophy size={18} color="#ffc107" />
                <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#fff', letterSpacing: '0.02em' }}>
                  Tabla de Clasificación
                </span>
              </div>
              {onRefreshLeaderboard && (
                <button
                  onClick={onRefreshLeaderboard}
                  style={{
                    background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.2rem'
                  }}
                  title="Actualizar tabla"
                >
                  <RefreshCw size={13} />
                </button>
              )}
            </div>

            {/* Leaderboard List (Pure, 0 UUID clutter!) */}
            <div style={{
              padding: '0.85rem 1rem',
              maxHeight: '340px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.45rem'
            }}>
              {leaderboard.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem' }}>
                  <Award size={32} style={{ margin: '0 auto 0.5rem auto', opacity: 0.3 }} />
                  Cargando clasificación...
                </div>
              ) : (
                leaderboard.slice(0, 15).map((item, idx) => {
                  const isTop1 = idx === 0;
                  const isTop2 = idx === 1;
                  const isTop3 = idx === 2;

                  const badgeColor = isTop1 ? '#ffc107' : isTop2 ? '#e0e0e0' : isTop3 ? '#cd7f32' : 'rgba(255,255,255,0.3)';
                  const bgGlow = isTop1
                    ? 'linear-gradient(135deg, rgba(255,193,7,0.12), rgba(10,14,26,0.9))'
                    : isTop2
                    ? 'linear-gradient(135deg, rgba(220,220,220,0.08), rgba(10,14,26,0.9))'
                    : isTop3
                    ? 'linear-gradient(135deg, rgba(205,127,50,0.08), rgba(10,14,26,0.9))'
                    : 'rgba(255,255,255,0.03)';

                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.55rem 0.75rem',
                        background: bgGlow,
                        border: `1px solid ${isTop1 ? 'rgba(255,193,7,0.3)' : 'rgba(255,255,255,0.06)'}`,
                        borderRadius: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{
                          width: '24px', height: '24px', borderRadius: '50%',
                          background: badgeColor + '20',
                          border: `1.5px solid ${badgeColor}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.72rem', fontWeight: 900, color: badgeColor,
                          fontFamily: 'var(--font-code)'
                        }}>
                          {idx + 1}
                        </div>

                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            {item.username}
                            {isTop1 && <Trophy size={11} color="#ffc107" />}
                          </div>
                          <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-code)' }}>
                            {item.gamesPlayed} partidas · {item.winRate}% vict.
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#00e676', fontFamily: 'var(--font-code)' }}>
                          {item.wins} <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>vict.</span>
                        </div>
                        {item.achievements && item.achievements.length > 0 && (
                          <div style={{ display: 'flex', gap: '0.15rem', justifyContent: 'flex-end', marginTop: '0.1rem' }}>
                            {item.achievements.slice(0, 3).map((ach, aIdx) => (
                              <span key={aIdx} title={`${ach.name}`} style={{ fontSize: '0.7rem' }}>
                                {ach.icon}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer hint */}
        <div style={{ marginTop: '1.5rem', fontSize: '0.68rem', color: 'rgba(255,255,255,0.14)', textAlign: 'center', letterSpacing: '0.05em' }}>
          hasta 16 jugadores por sala
        </div>
      </div>
    </div>
  );
}
