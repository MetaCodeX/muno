import React, { useState, useMemo } from 'react';
import { Search, ExternalLink, Code, Download, RefreshCw, Layers, Sparkles, Eye, RotateCw } from 'lucide-react';

const CARD_DATA = [
  // Red
  ...Array.from({ length: 10 }, (_, i) => ({ id: `red_${i}`, name: `Rojo ${i}`, color: 'red', value: `${i}`, type: 'number', file: `red_${i}.svg` })),
  { id: 'red_skip', name: 'Rojo Bloqueo', color: 'red', value: 'skip', type: 'action', file: 'red_skip.svg' },
  { id: 'red_reverse', name: 'Rojo Reversa', color: 'red', value: 'reverse', type: 'action', file: 'red_reverse.svg' },
  { id: 'red_draw_2', name: 'Rojo +2', color: 'red', value: '+2', type: 'action', file: 'red_draw_2.svg' },
  { id: 'red_wild', name: 'Rojo Comodín', color: 'red', value: 'wild', type: 'wild', file: 'red_wild.svg' },
  { id: 'red_wild_draw_4', name: 'Rojo Comodín +4', color: 'red', value: '+4', type: 'wild', file: 'red_wild_draw_4.svg' },

  // Blue
  ...Array.from({ length: 10 }, (_, i) => ({ id: `blue_${i}`, name: `Azul ${i}`, color: 'blue', value: `${i}`, type: 'number', file: `blue_${i}.svg` })),
  { id: 'blue_skip', name: 'Azul Bloqueo', color: 'blue', value: 'skip', type: 'action', file: 'blue_skip.svg' },
  { id: 'blue_reverse', name: 'Azul Reversa', color: 'blue', value: 'reverse', type: 'action', file: 'blue_reverse.svg' },
  { id: 'blue_draw_2', name: 'Azul +2', color: 'blue', value: '+2', type: 'action', file: 'blue_draw_2.svg' },
  { id: 'blue_wild', name: 'Azul Comodín', color: 'blue', value: 'wild', type: 'wild', file: 'blue_wild.svg' },
  { id: 'blue_wild_draw_4', name: 'Azul Comodín +4', color: 'blue', value: '+4', type: 'wild', file: 'blue_wild_draw_4.svg' },

  // Green
  ...Array.from({ length: 10 }, (_, i) => ({ id: `green_${i}`, name: `Verde ${i}`, color: 'green', value: `${i}`, type: 'number', file: `green_${i}.svg` })),
  { id: 'green_skip', name: 'Verde Bloqueo', color: 'green', value: 'skip', type: 'action', file: 'green_skip.svg' },
  { id: 'green_reverse', name: 'Verde Reversa', color: 'green', value: 'reverse', type: 'action', file: 'green_reverse.svg' },
  { id: 'green_draw_2', name: 'Verde +2', color: 'green', value: '+2', type: 'action', file: 'green_draw_2.svg' },
  { id: 'green_wild', name: 'Verde Comodín', color: 'green', value: 'wild', type: 'wild', file: 'green_wild.svg' },
  { id: 'green_wild_draw_4', name: 'Verde Comodín +4', color: 'green', value: '+4', type: 'wild', file: 'green_wild_draw_4.svg' },

  // Yellow
  ...Array.from({ length: 10 }, (_, i) => ({ id: `yellow_${i}`, name: `Amarillo ${i}`, color: 'yellow', value: `${i}`, type: 'number', file: `yellow_${i}.svg` })),
  { id: 'yellow_skip', name: 'Amarillo Bloqueo', color: 'yellow', value: 'skip', type: 'action', file: 'yellow_skip.svg' },
  { id: 'yellow_reverse', name: 'Amarillo Reversa', color: 'yellow', value: 'reverse', type: 'action', file: 'yellow_reverse.svg' },
  { id: 'yellow_draw_2', name: 'Amarillo +2', color: 'yellow', value: '+2', type: 'action', file: 'yellow_draw_2.svg' },
  { id: 'yellow_wild', name: 'Amarillo Comodín', color: 'yellow', value: 'wild', type: 'wild', file: 'yellow_wild.svg' },
  { id: 'yellow_wild_draw_4', name: 'Amarillo Comodín +4', color: 'yellow', value: '+4', type: 'wild', file: 'yellow_wild_draw_4.svg' },

  // Wild & Special
  { id: 'wild', name: 'Comodín Cambio Color', color: 'wild', value: 'wild', type: 'wild', file: 'wild.svg' },
  { id: 'wild_draw_4', name: 'Comodín +4 Global', color: 'wild', value: '+4', type: 'wild', file: 'wild_draw_4.svg' },
  { id: 'back', name: 'Reverso MμN0!', color: 'special', value: 'back', type: 'special', file: 'back.svg' }
];

export function CardGallery() {
  const [selectedColor, setSelectedColor] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalCard, setActiveModalCard] = useState(null);
  
  // Track 3D Flipped status per card ID
  const [flippedMap, setFlippedMap] = useState({});
  const [modalFlipped, setModalFlipped] = useState(false);

  const toggleFlip = (id, e) => {
    if (e) e.stopPropagation();
    setFlippedMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredCards = useMemo(() => {
    return CARD_DATA.filter((card) => {
      const matchColor = selectedColor === 'all' || card.color === selectedColor;
      const matchType = selectedType === 'all' || card.type === selectedType;
      const matchSearch = card.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          card.file.toLowerCase().includes(searchQuery.toLowerCase());
      return matchColor && matchType && matchSearch;
    });
  }, [selectedColor, selectedType, searchQuery]);

  return (
    <div>
      {/* Hero Header */}
      <section className="hero">
        <h1>Visor de Cartas SVG <span className="brand-badge">MUNO!</span></h1>
        <p className="hero-subtitle">
          Colección de 63 cartas vectoriales SVG con giros 3D interactivos, inspección y animaciones de movimiento unificadas.
        </p>

        <div className="badge-row">
          <span className="badge badge-svg"><RotateCw size={14} /> Giro 3D al Hacer Click</span>
          <span className="badge badge-microsecond"><Sparkles size={14} /> Animación de Movimiento Unificada</span>
          <span className="badge"><Layers size={14} /> Reverso MμN0! Integrado</span>
        </div>
      </section>

      {/* Toolbar */}
      <div className="toolbar">
        {/* Colors */}
        <div className="filter-group">
          <button 
            className={`filter-chip ${selectedColor === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedColor('all')}
          >
            Todas ({CARD_DATA.length})
          </button>
          <button 
            className={`filter-chip color-red ${selectedColor === 'red' ? 'active' : ''}`}
            onClick={() => setSelectedColor('red')}
          >
            Rojas (15)
          </button>
          <button 
            className={`filter-chip color-blue ${selectedColor === 'blue' ? 'active' : ''}`}
            onClick={() => setSelectedColor('blue')}
          >
            Azules (15)
          </button>
          <button 
            className={`filter-chip color-green ${selectedColor === 'green' ? 'active' : ''}`}
            onClick={() => setSelectedColor('green')}
          >
            Verdes (15)
          </button>
          <button 
            className={`filter-chip color-yellow ${selectedColor === 'yellow' ? 'active' : ''}`}
            onClick={() => setSelectedColor('yellow')}
          >
            Amarillas (15)
          </button>
          <button 
            className={`filter-chip color-wild ${selectedColor === 'wild' ? 'active' : ''}`}
            onClick={() => setSelectedColor('wild')}
          >
            Comodines
          </button>
        </div>

        {/* Search */}
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            placeholder="Buscar carta o archivo..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Cards Grid with 3D Flip */}
      <div className="card-grid">
        {filteredCards.map((card) => {
          const isFlipped = flippedMap[card.id];
          return (
            <div 
              key={card.id} 
              className="card-item muno-card-motion"
              onClick={() => toggleFlip(card.id)}
            >
              {/* 3D Flip Card Container */}
              <div className={`card-flip-wrapper ${isFlipped ? 'is-flipped' : ''}`}>
                <div className="card-flip-inner">
                  {/* Front Face */}
                  <div className="card-face card-face-front">
                    <img 
                      src={`/cards/${card.file}`} 
                      alt={card.name} 
                      className="card-img" 
                      loading="lazy"
                    />
                  </div>

                  {/* Back Face (Reverso MμN0!) */}
                  <div className="card-face card-face-back">
                    <img 
                      src="/cards/back.svg" 
                      alt="Reverso MμN0!" 
                      className="card-img" 
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>

              <div className="card-info">
                <div className="card-title">{card.name}</div>
                <div className="card-filename">{card.file}</div>
                
                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', marginTop: '0.4rem' }}>
                  <span className={`card-tag tag-${card.color}`}>
                    {card.color.toUpperCase()}
                  </span>
                  <button 
                    className="filter-chip"
                    style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveModalCard(card);
                      setModalFlipped(false);
                    }}
                  >
                    <Eye size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Inspection Modal with 3D Flip Preview */}
      {activeModalCard && (
        <div className="modal-overlay" onClick={() => setActiveModalCard(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Inspección de Carta SVG (Giro 3D)</div>
              <button className="close-btn" onClick={() => setActiveModalCard(null)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="modal-preview-box" style={{ flexDirection: 'column' }}>
                <div 
                  className={`card-flip-wrapper ${modalFlipped ? 'is-flipped' : ''}`} 
                  style={{ width: '180px', cursor: 'pointer' }}
                  onClick={() => setModalFlipped(!modalFlipped)}
                >
                  <div className="card-flip-inner">
                    <div className="card-face card-face-front">
                      <img 
                        src={`/cards/${activeModalCard.file}`} 
                        alt={activeModalCard.name} 
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>
                    <div className="card-face card-face-back">
                      <img 
                        src="/cards/back.svg" 
                        alt="Reverso MμN0!" 
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>
                  </div>
                </div>

                <button 
                  className="btn-primary" 
                  style={{ marginTop: '1rem', padding: '0.4rem 0.9rem', fontSize: '0.8rem' }}
                  onClick={() => setModalFlipped(!modalFlipped)}
                >
                  <RotateCw size={14} /> {modalFlipped ? 'Ver Anverso' : 'Girar a Reverso MμN0!'}
                </button>
              </div>

              <div className="modal-details">
                <div className="detail-item">
                  <div className="detail-label">Nombre de Carta</div>
                  <div className="detail-value">{activeModalCard.name}</div>
                </div>

                <div className="detail-item">
                  <div className="detail-label">Ruta de Archivo Asset</div>
                  <div className="detail-value">/cards/{activeModalCard.file}</div>
                </div>

                <div className="detail-item">
                  <div className="detail-label">Categoría / Color</div>
                  <div className="detail-value">{activeModalCard.color.toUpperCase()}</div>
                </div>

                <div className="detail-item">
                  <div className="detail-label">Tipo de Carta</div>
                  <div className="detail-value">{activeModalCard.type.toUpperCase()}</div>
                </div>

                <div className="action-buttons">
                  <a 
                    href={`/cards/${activeModalCard.file}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="btn-primary"
                  >
                    <ExternalLink size={16} /> Abrir SVG Original
                  </a>
                  <a 
                    href={`/cards/${activeModalCard.file}`} 
                    download={activeModalCard.file}
                    className="btn-primary"
                    style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                  >
                    <Download size={16} /> Descargar SVG
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
