import React, { useEffect, useRef, useState } from 'react';
import { Send, ChevronRight, ChevronLeft } from 'lucide-react';

export function GameChat({ messages, onSend, myColor, myUsername, isOpen, onToggle }) {
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  const panelWidth = isMobile ? '85vw' : '280px';

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
    }
  }, [messages, isOpen]);

  const handleSend = (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput('');
    inputRef.current?.focus();
  };

  return (
    <>
      {/* Collapse/expand tab */}
      <button
        onClick={onToggle}
        title={isOpen ? 'Cerrar chat' : 'Abrir chat'}
        style={{
          position: 'fixed',
          right: isOpen ? panelWidth : '0px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 15001,
          width: '26px',
          height: '56px',
          background: 'rgba(14,22,40,0.95)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRight: isOpen ? '1px solid rgba(255,255,255,0.15)' : 'none',
          borderRadius: '8px 0 0 8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          transition: 'right 0.25s cubic-bezier(0.4,0,0.2,1)',
          backdropFilter: 'blur(10px)',
          boxShadow: '-2px 0 10px rgba(0,0,0,0.5)',
        }}
      >
        {isOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Chat panel - side drawer */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: isOpen ? '0' : `-${panelWidth}`,
        width: panelWidth,
        maxWidth: '340px',
        height: '100dvh',
        background: 'rgba(8,11,20,0.98)',
        borderLeft: '1px solid rgba(255,255,255,0.12)',
        zIndex: 15000,
        display: 'flex',
        flexDirection: 'column',
        transition: 'right 0.25s cubic-bezier(0.4,0,0.2,1)',
        backdropFilter: 'blur(20px)',
        boxShadow: '-5px 0 25px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{
          padding: '0.75rem 1rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: isMobile ? '0.5rem' : '2.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: '#00e676', boxShadow: '0 0 8px #00e676',
            }} />
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#fff', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Chat en Vivo
            </span>
          </div>
          {isMobile && (
            <button onClick={onToggle} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', padding: '0.2rem', cursor: 'pointer' }}>
              <ChevronRight size={18} />
            </button>
          )}
        </div>

        {/* Messages */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0.6rem 0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.35rem',
        }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', lineHeight: 1.6 }}>
              Nadie ha escrito aún.<br />¡Di algo en el chat!
            </div>
          )}
          {messages.map((msg, i) => (
            <ChatBubble key={i} msg={msg} myUsername={myUsername} />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input Form (Elevated above mobile safe area) */}
        <form onSubmit={handleSend} style={{
          padding: `0.65rem 0.75rem calc(0.85rem + env(safe-area-inset-bottom, 0px)) 0.75rem`,
          borderTop: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(10,14,26,0.98)',
          display: 'flex',
          gap: '0.45rem',
          alignItems: 'center',
          position: 'relative',
          zIndex: 15002,
        }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            maxLength={200}
            placeholder="Escribe un mensaje..."
            autoComplete="off"
            style={{
              flex: 1,
              height: '42px',
              background: 'rgba(255,255,255,0.08)',
              border: '1.5px solid rgba(255,255,255,0.18)',
              borderRadius: '10px',
              color: '#fff',
              padding: '0.5rem 0.75rem',
              fontSize: '0.88rem',
              outline: 'none',
              fontFamily: 'var(--font-body)',
              caretColor: myColor || '#0088ff',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box',
            }}
            onFocus={e => e.target.style.borderColor = (myColor || '#0088ff')}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.18)'}
          />
          <button type="submit" style={{
            height: '42px',
            width: '42px',
            background: myColor ? myColor + '28' : 'rgba(0,136,255,0.25)',
            border: `1.5px solid ${myColor || '#0088ff'}80`,
            borderRadius: '10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flexShrink: 0,
            transition: 'all 0.15s',
          }}>
            <Send size={16} />
          </button>
        </form>
      </div>
    </>
  );
}

function ChatBubble({ msg, myUsername }) {
  if (msg.system) {
    return (
      <div style={{
        textAlign: 'center',
        fontSize: '0.65rem',
        color: 'rgba(255,255,255,0.2)',
        padding: '0.2rem 0.4rem',
        fontStyle: 'italic',
        lineHeight: 1.4,
      }}>
        {msg.text}
      </div>
    );
  }

  const isMe = msg.senderName === myUsername;
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isMe ? 'flex-end' : 'flex-start',
      gap: '0.1rem',
    }}>
      {!isMe && (
        <span style={{
          fontSize: '0.65rem',
          fontWeight: 800,
          color: msg.senderColor || '#888',
          paddingLeft: '0.3rem',
          letterSpacing: '0.02em',
        }}>
          {msg.senderName}
        </span>
      )}
      <div style={{
        maxWidth: '90%',
        background: isMe ? (msg.senderColor || '#0088ff') + '22' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${isMe ? (msg.senderColor || '#0088ff') + '35' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: isMe ? '12px 12px 4px 12px' : '4px 12px 12px 12px',
        padding: '0.35rem 0.6rem',
        fontSize: '0.78rem',
        color: '#f0f4f8',
        lineHeight: 1.4,
        wordBreak: 'break-word',
      }}>
        {msg.text}
      </div>
    </div>
  );
}
