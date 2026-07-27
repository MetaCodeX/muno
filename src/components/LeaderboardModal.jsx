import React, { useState } from 'react';
import { Trophy, Key, Copy, Check, ShieldCheck, Award, Zap, Flame, RefreshCw, X, User } from 'lucide-react';

export function LeaderboardModal({
  isOpen,
  onClose,
  leaderboard = [],
  myProfile = null,
  myUserKey = '',
  onImportUserKey,
  onRefreshLeaderboard
}) {
  const [activeTab, setActiveTab] = useState('leaderboard'); // 'leaderboard' | 'profile'
  const [inputKey, setInputKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [importError, setImportError] = useState('');

  if (!isOpen) return null;

  const handleCopyKey = () => {
    if (!myUserKey) return;
    navigator.clipboard.writeText(myUserKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }).catch(() => {
      // Fallback copy
      const el = document.createElement('textarea');
      el.value = myUserKey;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  const handleImportSubmit = (e) => {
    e.preventDefault();
    setImportError('');
    setImportStatus('');

    const keyToImport = inputKey.trim();
    if (!keyToImport) {
      setImportError('Ingresa un Código Único válido.');
      return;
    }

    if (keyToImport.length < 8) {
      setImportError('El código ingresado es demasiado corto.');
      return;
    }

    if (onImportUserKey) {
      onImportUserKey(keyToImport);
      setImportStatus('¡Código importado y vinculado correctamente!');
      setInputKey('');
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 12000, backdropFilter: 'blur(16px)' }}>
      <div className="modal-content" style={{
        maxWidth: '560px',
        width: '92vw',
        maxHeight: '88vh',
        borderRadius: '24px',
        background: 'rgba(10, 14, 26, 0.98)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.85), 0 0 30px rgba(0, 136, 255, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '1.1rem 1.4rem 0.9rem 1.4rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 22, 40, 0.6)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(255,193,7,0.2), rgba(255,59,92,0.2))',
              border: '1px solid rgba(255,193,7,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Trophy size={20} color="#ffc107" />
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#fff', letterSpacing: '0.02em' }}>
                Clasificación & Logros
              </div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-code)' }}>
                MUNO! Leaderboard System
              </div>
            </div>
          </div>

          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.6)', borderRadius: '50%', width: '32px', height: '32px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(7, 9, 15, 0.8)',
          padding: '0 1rem'
        }}>
          <button
            onClick={() => setActiveTab('leaderboard')}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'leaderboard' ? '2.5px solid #ffc107' : '2.5px solid transparent',
              color: activeTab === 'leaderboard' ? '#ffc107' : 'rgba(255,255,255,0.5)',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s',
            }}
          >
            <Trophy size={15} /> Tabla Global
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'profile' ? '2.5px solid #0088ff' : '2.5px solid transparent',
              color: activeTab === 'profile' ? '#0088ff' : 'rgba(255,255,255,0.5)',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s',
            }}
          >
            <Key size={15} /> Mi Código Único (UUID)
          </button>
        </div>

        {/* Body Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.2rem 1.4rem' }}>
          {activeTab === 'leaderboard' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                <span style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                  Ranking de Ganadores
                </span>
                <button
                  onClick={onRefreshLeaderboard}
                  style={{
                    background: 'rgba(0,136,255,0.1)', border: '1px solid rgba(0,136,255,0.25)',
                    color: '#0088ff', borderRadius: '8px', padding: '0.2rem 0.55rem',
                    fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.3rem'
                  }}
                >
                  <RefreshCw size={11} /> Actualizar
                </button>
              </div>

              {leaderboard.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.82rem' }}>
                  <Award size={36} style={{ margin: '0 auto 0.6rem auto', opacity: 0.3 }} />
                  Aún no hay victoriosos registrados.<br />¡Juega una partida y reclama el puesto #1!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {leaderboard.map((item, idx) => {
                    const isTop1 = idx === 0;
                    const isTop2 = idx === 1;
                    const isTop3 = idx === 2;

                    const rankBadgeColor = isTop1 ? '#ffc107' : isTop2 ? '#e0e0e0' : isTop3 ? '#cd7f32' : 'rgba(255,255,255,0.3)';
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
                          padding: '0.65rem 0.9rem',
                          background: bgGlow,
                          border: `1px solid ${isTop1 ? 'rgba(255,193,7,0.35)' : 'rgba(255,255,255,0.07)'}`,
                          borderRadius: '14px',
                          transition: 'transform 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '28px', height: '28px', borderRadius: '50%',
                            background: rankBadgeColor + '20',
                            border: `1.5px solid ${rankBadgeColor}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.78rem', fontWeight: 900, color: rankBadgeColor,
                            fontFamily: 'var(--font-code)'
                          }}>
                            {isTop1 ? '1' : isTop2 ? '2' : isTop3 ? '3' : idx + 1}
                          </div>

                          <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              {item.username}
                              {isTop1 && <Trophy size={13} color="#ffc107" />}
                            </div>
                            <div style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.38)', fontFamily: 'var(--font-code)' }}>
                              {item.gamesPlayed} jugadas · {item.winRate}% efectividad
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1rem', fontWeight: 900, color: '#00e676', fontFamily: 'var(--font-code)' }}>
                            {item.wins} <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>victorias</span>
                          </div>

                          {/* Achievements icons */}
                          {item.achievements && item.achievements.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.2rem', justifyContent: 'flex-end', marginTop: '0.15rem' }}>
                              {item.achievements.map((ach, aIdx) => (
                                <span key={aIdx} title={`${ach.name}: ${ach.desc}`} style={{ fontSize: '0.75rem' }}>
                                  {ach.icon}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {/* Private Key Banner */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(0,136,255,0.1), rgba(176,0,255,0.08))',
                border: '1px solid rgba(0,136,255,0.25)',
                borderRadius: '16px',
                padding: '1rem 1.1rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <ShieldCheck size={18} color="#0088ff" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff' }}>
                    Tu Código Único Privado (UUID)
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
                  Este código es tu clave privada única. No requiere inicios de sesión ni contraseñas.
                  Cópialo para guardarlo o pégalo en cualquier otro navegador para sincronizar tus estadísticas y logros.
                </div>

                {/* Display Current User Key */}
                <div style={{
                  marginTop: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'rgba(7, 9, 15, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  padding: '0.55rem 0.8rem',
                }}>
                  <span style={{
                    flex: 1,
                    fontFamily: 'var(--font-code)',
                    fontSize: '0.78rem',
                    color: '#00e676',
                    fontWeight: 700,
                    wordBreak: 'break-all',
                    letterSpacing: '0.04em'
                  }}>
                    {myUserKey || 'Generando código...'}
                  </span>
                  <button
                    onClick={handleCopyKey}
                    style={{
                      background: copied ? '#00e676' : 'rgba(0,136,255,0.2)',
                      border: `1px solid ${copied ? '#00e676' : 'rgba(0,136,255,0.5)'}`,
                      color: '#fff',
                      borderRadius: '8px',
                      padding: '0.35rem 0.7rem',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      transition: 'all 0.2s ease',
                      flexShrink: 0,
                    }}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? '¡Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              {/* My Profile Stats */}
              {myProfile && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '0.65rem',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px',
                  padding: '0.85rem',
                  textAlign: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#00e676', fontFamily: 'var(--font-code)' }}>
                      {myProfile.wins || 0}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                      Victorias
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0088ff', fontFamily: 'var(--font-code)' }}>
                      {myProfile.gamesPlayed || 0}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                      Partidas
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ffc107', fontFamily: 'var(--font-code)' }}>
                      {myProfile.gamesPlayed > 0 ? Math.round((myProfile.wins / myProfile.gamesPlayed) * 100) : 0}%
                    </div>
                    <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                      Efectividad
                    </div>
                  </div>
                </div>
              )}

              {/* Import / Change Key Section */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px',
                padding: '1rem',
              }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#fff', marginBottom: '0.3rem' }}>
                  🔑 Importar / Cambiar Código Único
                </div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.75rem' }}>
                  ¿Tienes un código generado en otro dispositivo? Pégalo aquí para cargar tus estadísticas:
                </div>

                <form onSubmit={handleImportSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="Pega tu Código Único (usr_...)"
                    style={{
                      flex: 1,
                      height: '38px',
                      background: 'rgba(7, 9, 15, 0.95)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '10px',
                      color: '#fff',
                      padding: '0 0.75rem',
                      fontSize: '0.78rem',
                      fontFamily: 'var(--font-code)',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      height: '38px',
                      padding: '0 0.9rem',
                      background: 'linear-gradient(135deg, #0088ff, #00e676)',
                      border: 'none',
                      borderRadius: '10px',
                      color: '#07090f',
                      fontWeight: 900,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Vincular
                  </button>
                </form>

                {importStatus && (
                  <div style={{ fontSize: '0.72rem', color: '#00e676', fontWeight: 700, marginTop: '0.5rem' }}>
                    {importStatus}
                  </div>
                )}
                {importError && (
                  <div style={{ fontSize: '0.72rem', color: '#ff3b5c', fontWeight: 700, marginTop: '0.5rem' }}>
                    {importError}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
