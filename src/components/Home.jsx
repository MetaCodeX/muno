import React, { useState, useRef } from 'react';
import { FallingCards } from './FallingCards';
import { MunoLogo } from './MunoLogo';

export function Home({ savedUsername, initialJoinCode, initialTab, onCreateRoom, onJoinRoom, loading, error }) {
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
      overflow: 'hidden',
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

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '1rem', boxSizing: 'border-box' }}>

        {/* LOGO */}
        <div style={{ marginBottom: '1.8rem', textAlign: 'center', userSelect: 'none' }}>
          <MunoLogo width="340px" />
          <div style={{
            marginTop: '0.4rem',
            fontSize: '0.78rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.4)',
            fontFamily: 'var(--font-code)',
            fontWeight: 800,
          }}>
            v0.9.9.888 · By Dr.MetaCodeX
          </div>
        </div>

        {/* PANEL */}
        <div style={{
          width: '100%',
          maxWidth: '400px',
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
                    color: tab === t.id ? '#fff' : 'rgba(255,255,255,0.3)',
                    fontWeight: tab === t.id ? 800 : 500,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    fontFamily: 'var(--font-body)',
                    letterSpacing: tab === t.id ? '0.01em' : 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    boxShadow: tab === t.id ? '0 1px 6px rgba(0,0,0,0.3)' : 'none',
                  }}
                >
                  <span style={{ fontSize: '0.8rem' }}>{t.emoji}</span>
                  {t.label}
                </button>
              ))}
            </div>

            {/* JOIN FORM */}
            {tab === 'join' && (
              <form onSubmit={handleJoin}>
                <div style={{ marginBottom: '1.1rem' }}>
                  <div style={{ fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Código de sala
                  </div>
                  <input
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    maxLength={5}
                    placeholder="AB3KP"
                    autoComplete="off"
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
                  marginBottom: '1.1rem',
                  padding: '0.85rem',
                  background: 'rgba(255,193,7,0.05)',
                  border: '1px solid rgba(255,193,7,0.12)',
                  borderRadius: '10px',
                }}>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255,193,7,0.7)', fontWeight: 600, marginBottom: '0.15rem' }}>
                    👑 Serás el admin
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>
                    Decides cuándo empieza, puedes cerrar las invitaciones y expulsar jugadores.
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
                      ? 'linear-gradient(135deg, #ff3b5c 0%, #c840e9 100%)'
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

        {/* Footer hint */}
        <div style={{ marginTop: '1.5rem', fontSize: '0.68rem', color: 'rgba(255,255,255,0.14)', textAlign: 'center', letterSpacing: '0.05em' }}>
          hasta 16 jugadores por sala
        </div>
      </div>
    </div>
  );
}
