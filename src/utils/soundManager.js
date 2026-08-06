// DUAL HYBRID SOUND ENGINE FOR MUNO WITH DISTINCT VICTORY FANFARE & MUNO SHOUT
// Combines HTML5 Audio + Web SpeechSynthesis + Web Audio API synthesis

class MunoSoundEngine {
  constructor() {
    this.ctx = null;
    this.audioCache = {};
    this.preloadSounds();
  }

  preloadSounds() {
    if (typeof window === 'undefined') return;
    const soundFiles = ['muno', 'play', 'draw', 'turn', 'stack', 'win'];
    soundFiles.forEach(name => {
      const audio = new Audio(`/sounds/${name}.wav?v=${Date.now()}`);
      audio.preload = 'auto';
      this.audioCache[name] = audio;
    });
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playAudioFile(name) {
    try {
      const cached = this.audioCache[name];
      if (cached) {
        const soundClone = cached.cloneNode();
        soundClone.volume = 0.95;
        const playPromise = soundClone.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.warn(`HTML5 Audio play catch (${name}):`, err);
          });
        }
      } else {
        const directAudio = new Audio(`/sounds/${name}.wav`);
        directAudio.volume = 0.95;
        directAudio.play().catch(e => console.warn('Direct play error:', e));
      }
    } catch (e) {
      console.warn(`HTML5 Audio play err (${name}):`, e);
    }
  }

  // 1. Play Card (Smooth Gentle Card Snap)
  playCard() {
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(380, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.07);

      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, this.ctx.currentTime + 0.07);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.07);
    } catch (e) {
      console.warn('playCard err:', e);
    }
  }

  // 2. Draw Card (Soft Paper Swoosh)
  drawCard() {
    try {
      this.initContext();
      if (!this.ctx) return;

      const bufferSize = this.ctx.sampleRate * 0.08;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(250, this.ctx.currentTime + 0.08);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.14, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, this.ctx.currentTime + 0.08);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      whiteNoise.start();
      whiteNoise.stop(this.ctx.currentTime + 0.08);
    } catch (e) {
      console.warn('drawCard err:', e);
    }
  }

  // 3. Your Turn (Soft Elegant Chime)
  yourTurn() {
    try {
      this.initContext();
      if (!this.ctx) return;

      const notes = [523.25, 783.99];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.09);

        gain.gain.setValueAtTime(0.18, this.ctx.currentTime + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.005, this.ctx.currentTime + idx * 0.09 + 0.16);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(this.ctx.currentTime + idx * 0.09);
        osc.stop(this.ctx.currentTime + idx * 0.09 + 0.16);
      });
    } catch (e) {
      console.warn('yourTurn err:', e);
    }
  }

  // 4. Skip / Bloqueo
  skip() {
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(240, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(70, this.ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, this.ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    } catch (e) {
      console.warn('skip err:', e);
    }
  }

  // 5. Reverse / Reversa
  reverse() {
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(550, this.ctx.currentTime + 0.08);
      osc.frequency.linearRampToValueAtTime(300, this.ctx.currentTime + 0.16);

      gain.gain.setValueAtTime(0.14, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, this.ctx.currentTime + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.16);
    } catch (e) {
      console.warn('reverse err:', e);
    }
  }

  // 6. Cumulative Draw Stack (+2, +4, +8, +12, +16...)
  drawStack(stackCount = 2) {
    try {
      this.initContext();
      if (!this.ctx) return;

      const baseFreq = 350 + Math.min(stackCount * 85, 1200);
      const mults = [1, 1.25, 1.5, 1.75];

      mults.forEach((m, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(baseFreq * m, this.ctx.currentTime + idx * 0.04);

        gain.gain.setValueAtTime(0.22, this.ctx.currentTime + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.005, this.ctx.currentTime + idx * 0.04 + 0.16);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(this.ctx.currentTime + idx * 0.04);
        osc.stop(this.ctx.currentTime + idx * 0.04 + 0.16);
      });
    } catch (e) {
      console.warn('drawStack err:', e);
    }
  }

  // 7. "MIYUU-NÓ!" SHOUT
  munoShout() {
    this.playAudioFile('muno');
    this.speakSpeechMuno();
    try {
      this.initContext();
      if (this.ctx) {
        const now = this.ctx.currentTime;
        // "Mi-"
        const osc1 = this.ctx.createOscillator();
        const g1 = this.ctx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(320, now);
        osc1.frequency.linearRampToValueAtTime(520, now + 0.18);
        g1.gain.setValueAtTime(0.35, now);
        g1.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        osc1.connect(g1); g1.connect(this.ctx.destination);
        osc1.start(now); osc1.stop(now + 0.18);

        // "-yuuu-NÓ!"
        const osc2 = this.ctx.createOscillator();
        const g2 = this.ctx.createGain();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(640, now + 0.2);
        osc2.frequency.exponentialRampToValueAtTime(320, now + 0.5);
        g2.gain.setValueAtTime(0.45, now + 0.2);
        g2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc2.connect(g2); g2.connect(this.ctx.destination);
        osc2.start(now + 0.2); osc2.stop(now + 0.5);
      }
    } catch (e) {
      console.warn('munoShout synth error:', e);
    }
  }

  speakSpeechMuno() {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance("¡Miyuu-nó!");
        utterance.pitch = 1.6;
        utterance.rate = 0.9;
        utterance.volume = 0.9;
        utterance.lang = 'es-MX';

        const voices = window.speechSynthesis.getVoices();
        const esVoice = voices.find(v => v.lang.startsWith('es-MX') || v.lang.startsWith('es')) || voices[0];
        if (esVoice) {
          utterance.voice = esVoice;
        }

        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.warn('SpeechSynthesis err:', e);
    }
  }

  // 8. TRIUMPHANT VICTORY FANFARE
  winGame() {
    this.playAudioFile('win');
    this.speakVictory();
    try {
      this.initContext();
      if (this.ctx) {
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.12);
          gain.gain.setValueAtTime(0.3, this.ctx.currentTime + idx * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + idx * 0.12 + 0.4);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(this.ctx.currentTime + idx * 0.12);
          osc.stop(this.ctx.currentTime + idx * 0.12 + 0.4);
        });
      }
    } catch (e) {
      console.warn('winGame synth error:', e);
    }
  }

  speakVictory() {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance("¡Victoria!");
        utterance.pitch = 1.25;
        utterance.rate = 1.0;
        utterance.volume = 0.95;
        utterance.lang = 'es-MX';

        const voices = window.speechSynthesis.getVoices();
        const esVoice = voices.find(v => v.lang.startsWith('es-MX') || v.lang.startsWith('es')) || voices[0];
        if (esVoice) {
          utterance.voice = esVoice;
        }

        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.warn('SpeechSynthesis win err:', e);
    }
  }

  addPlayer() { this.yourTurn(); }
  removePlayer() { this.yourTurn(); }
  timeout() { this.skip(); }

  // ── Overkill SFX ─────────────────────────────────────────────────────────

  // Activar modo Overkill en lobby — tono ascendente
  overkillActivate() {
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(720, now + 0.38);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.38);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.38);
    } catch(e) { console.warn('overkillActivate err:', e); }
  }

  // +6 — draw stack pesado con capa grave
  overkillPlus6() {
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [[480, 0], [280, 0.04], [520, 0.08], [240, 0.12]].forEach(([freq, t]) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = t % 2 === 0 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq, now + t);
        gain.gain.setValueAtTime(0.2, now + t);
        gain.gain.exponentialRampToValueAtTime(0.005, now + t + 0.18);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now + t); osc.stop(now + t + 0.18);
      });
    } catch(e) { console.warn('overkillPlus6 err:', e); }
  }

  // x2 — pitch-shift descendente distorsionado
  overkillX2() {
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.28);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.28);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.28);

      // segunda capa desfasada
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(260, now + 0.06);
      osc2.frequency.exponentialRampToValueAtTime(90, now + 0.28);
      gain2.gain.setValueAtTime(0.1, now + 0.06);
      gain2.gain.exponentialRampToValueAtTime(0.005, now + 0.28);
      osc2.connect(gain2); gain2.connect(this.ctx.destination);
      osc2.start(now + 0.06); osc2.stop(now + 0.28);
    } catch(e) { console.warn('overkillX2 err:', e); }
  }

  // Flush — swoosh de cartas volando
  overkillFlush() {
    try {
      this.initContext();
      if (!this.ctx) return;
      const sr = this.ctx.sampleRate;
      const dur = 0.48;
      const buf = this.ctx.createBuffer(1, sr * dur, sr);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const noise = this.ctx.createBufferSource();
      noise.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(900, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + dur);
      filter.Q.value = 0.8;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, this.ctx.currentTime + dur);
      noise.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
      noise.start(); noise.stop(this.ctx.currentTime + dur);
    } catch(e) { console.warn('overkillFlush err:', e); }
  }

  // Dado — rattle corto + impacto seco
  overkillDice() {
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      // rattle: noise burst
      const sr = this.ctx.sampleRate;
      const rattleDur = 0.28;
      const buf = this.ctx.createBuffer(1, sr * rattleDur, sr);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1800;
      const gNoise = this.ctx.createGain();
      gNoise.gain.setValueAtTime(0.14, now);
      gNoise.gain.exponentialRampToValueAtTime(0.005, now + rattleDur);
      noise.connect(filter); filter.connect(gNoise); gNoise.connect(this.ctx.destination);
      noise.start(now); noise.stop(now + rattleDur);
      // impacto seco
      const osc = this.ctx.createOscillator();
      const gImpact = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(90, now + rattleDur);
      gImpact.gain.setValueAtTime(0.3, now + rattleDur);
      gImpact.gain.exponentialRampToValueAtTime(0.005, now + rattleDur + 0.09);
      osc.connect(gImpact); gImpact.connect(this.ctx.destination);
      osc.start(now + rattleDur); osc.stop(now + rattleDur + 0.09);
    } catch(e) { console.warn('overkillDice err:', e); }
  }

  // Rotación de manos (carta 0) — whoosh circular
  overkillRotate() {
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.linearRampToValueAtTime(580, now + 0.2);
      osc.frequency.linearRampToValueAtTime(280, now + 0.4);
      gain.gain.setValueAtTime(0.17, now);
      gain.gain.setValueAtTime(0.17, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.4);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.4);
    } catch(e) { console.warn('overkillRotate err:', e); }
  }

  // Swap de manos (carta 7) — dos clicks sucesivos
  overkillSwap() {
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [[440, 0], [550, 0.16]].forEach(([freq, t]) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + t);
        gain.gain.setValueAtTime(0.19, now + t);
        gain.gain.exponentialRampToValueAtTime(0.005, now + t + 0.09);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now + t); osc.stop(now + t + 0.09);
      });
    } catch(e) { console.warn('overkillSwap err:', e); }
  }

  // Jump-In — mismo snap pero pitch más alto
  overkillJumpIn() {
    try {
      this.initContext();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(456, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(132, this.ctx.currentTime + 0.07);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, this.ctx.currentTime + 0.07);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(); osc.stop(this.ctx.currentTime + 0.07);
    } catch(e) { console.warn('overkillJumpIn err:', e); }
  }
}

export const soundManager = new MunoSoundEngine();
