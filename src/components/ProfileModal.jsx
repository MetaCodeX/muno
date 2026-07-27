import React, { useState } from 'react';
import { User, Copy, Check, ShieldCheck, Key, X } from 'lucide-react';

export function ProfileModal({
  isOpen,
  onClose,
  myProfile = null,
  myUserKey = '',
  onImportUserKey
}) {
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
        maxWidth: '480px',
        width: '90vw',
        borderRadius: '24px',
        background: 'rgba(10, 14, 26, 0.98)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.85), 0 0 30px rgba(0, 136, 255, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.4rem',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button onClick={onClose} style={{
          position: 'absolute', top: '1.2rem', right: '1.2rem',
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.6)', borderRadius: '50%', width: '32px', height: '32px',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <X size={16} />
        </button>

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.2rem' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '12px',
            background: 'rgba(0,136,255,0.15)', border: '1px solid rgba(0,136,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <User size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff' }}>
              Mi Perfil & Código Único
            </div>
            <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-code)' }}>
              Identificador Privado de Usuario
            </div>
          </div>
        </div>

        {/* Private UUID Box */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0,136,255,0.1), rgba(176,0,255,0.08))',
          border: '1px solid rgba(0,136,255,0.25)',
          borderRadius: '16px',
          padding: '1rem',
          marginBottom: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
            <ShieldCheck size={16} color="#0088ff" />
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fff' }}>
              Tu Código Único Privado (UUID)
            </span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4, marginBottom: '0.75rem' }}>
            Cópialo para respaldarlo o pégalo en otro navegador/dispositivo para vincular tu perfil sin contraseñas.
          </div>

          <div style={{
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
              fontSize: '0.75rem',
              color: '#00e676',
              fontWeight: 700,
              wordBreak: 'break-all'
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
                flexShrink: 0
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? '¡Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>

        {/* User Stats */}
        {myProfile && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '0.6rem',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '0.85rem',
            textAlign: 'center',
            marginBottom: '1rem'
          }}>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#00e676', fontFamily: 'var(--font-code)' }}>
                {myProfile.wins || 0}
              </div>
              <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700 }}>
                Victorias
              </div>
            </div>

            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0088ff', fontFamily: 'var(--font-code)' }}>
                {myProfile.gamesPlayed || 0}
              </div>
              <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700 }}>
                Partidas
              </div>
            </div>

            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ffc107', fontFamily: 'var(--font-code)' }}>
                {myProfile.gamesPlayed > 0 ? Math.round((myProfile.wins / myProfile.gamesPlayed) * 100) : 0}%
              </div>
              <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700 }}>
                Efectividad
              </div>
            </div>
          </div>
        )}

        {/* Import Key Form */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '0.9rem',
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>
            🔑 Importar Otro Código Único
          </div>
          <form onSubmit={handleImportSubmit} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input
              type="text"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="Pega tu Código (usr_...)"
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
    </div>
  );
}
