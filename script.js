// ===== Audio Context =====
let audioCtx = null;
let masterGain = null;
let pannerNode = null;
let activeOscillators = {};

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.7;
  pannerNode = audioCtx.createStereoPanner();
  pannerNode.pan.value = 0;
  masterGain.connect(pannerNode);
  pannerNode.connect(audioCtx.destination);
}

// ===== State =====
let currentWaveform = 'sine';
let volume = 0.7;
let lrBalance = 0;

// ===== Notes =====
const notes = [
  { name: 'C',  freq: 261.63, type: 'white', key: 'a' },
  { name: 'C#', freq: 277.18, type: 'black', key: 'w' },
  { name: 'D',  freq: 293.66, type: 'white', key: 's' },
  { name: 'D#', freq: 311.13, type: 'black', key: 'e' },
  { name: 'E',  freq: 329.63, type: 'white', key: 'd' },
  { name: 'F',  freq: 349.23, type: 'white', key: 'f' },
  { name: 'F#', freq: 369.99, type: 'black', key: 't' },
  { name: 'G',  freq: 392.00, type: 'white', key: 'g' },
  { name: 'G#', freq: 415.30, type: 'black', key: 'y' },
  { name: 'A',  freq: 440.00, type: 'white', key: 'h' },
  { name: 'A#', freq: 466.16, type: 'black', key: 'u' },
  { name: 'B',  freq: 493.88, type: 'white', key: 'j' },
  { name: 'C5', freq: 523.25, type: 'white', key: 'k' },
];

// ===== Build Keyboard =====
const keysContainer = document.getElementById('keysContainer');
const whiteKeys = notes.filter(n => n.type === 'white');
const blackKeys = notes.filter(n => n.type === 'black');

function getBlackKeyPosition(noteName) {
  const positions = {
    'C#': 0, 'D#': 1, 'F#': 3, 'G#': 4, 'A#': 5
  };
  return positions[noteName];
}

whiteKeys.forEach((note) => {
  const key = document.createElement('div');
  key.className = 'white-key';
  key.dataset.freq = note.freq;
  key.dataset.note = note.name;
  key.innerHTML = `<span class="key-label">${note.key.toUpperCase()}</span>`;
  key.addEventListener('mousedown', () => playNote(note.name, note.freq));
  key.addEventListener('mouseup', () => stopNote(note.name));
  key.addEventListener('mouseleave', () => stopNote(note.name));
  key.addEventListener('touchstart', (e) => { e.preventDefault(); playNote(note.name, note.freq); });
  key.addEventListener('touchend', (e) => { e.preventDefault(); stopNote(note.name); });
  keysContainer.appendChild(key);
});

const whiteKeyWidth = 100 / whiteKeys.length;
blackKeys.forEach(note => {
  const pos = getBlackKeyPosition(note.name);
  const key = document.createElement('div');
  key.className = 'black-key';
  key.dataset.freq = note.freq;
  key.dataset.note = note.name;
  key.style.left = `calc(${(pos + 1) * whiteKeyWidth}% - 18px)`;
  key.innerHTML = `<span class="key-label">${note.key.toUpperCase()}</span>`;
  key.addEventListener('mousedown', () => playNote(note.name, note.freq));
  key.addEventListener('mouseup', () => stopNote(note.name));
  key.addEventListener('mouseleave', () => stopNote(note.name));
  key.addEventListener('touchstart', (e) => { e.preventDefault(); playNote(note.name, note.freq); });
  key.addEventListener('touchend', (e) => { e.preventDefault(); stopNote(note.name); });
  keysContainer.appendChild(key);
});

// ===== Play / Stop =====
function playNote(name, freq) {
  initAudio();
  if (activeOscillators[name]) return;

  const osc = audioCtx.createOscillator();
  const noteGain = audioCtx.createGain();

  osc.type = currentWaveform;
  osc.frequency.value = freq;

  noteGain.gain.setValueAtTime(0, audioCtx.currentTime);
  noteGain.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.02);

  osc.connect(noteGain);
  noteGain.connect(masterGain);
  osc.start();

  activeOscillators[name] = { osc, gain: noteGain };

  const keyEl = document.querySelector(`[data-note="${name}"]`);
  if (keyEl) keyEl.classList.add('active');
}

function stopNote(name) {
  if (!activeOscillators[name]) return;
  const { osc, gain } = activeOscillators[name];

  gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);
  osc.stop(audioCtx.currentTime + 0.1);

  delete activeOscillators[name];

  const keyEl = document.querySelector(`[data-note="${name}"]`);
  if (keyEl) keyEl.classList.remove('active');
}

// ===== Keyboard Input =====
const keyMap = {};
notes.forEach(n => { keyMap[n.key] = n; });

document.addEventListener('keydown', (e) => {
  const note = keyMap[e.key.toLowerCase()];
  if (note && !e.repeat) {
    e.preventDefault();
    playNote(note.name, note.freq);
  }
});

document.addEventListener('keyup', (e) => {
  const note = keyMap[e.key.toLowerCase()];
  if (note) {
    e.preventDefault();
    stopNote(note.name);
  }
});

// ===== Waveform Buttons =====
const waveBtns = document.querySelectorAll('.wave-btn');
waveBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    waveBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentWaveform = btn.dataset.wave;

    Object.values(activeOscillators).forEach(({ osc }) => {
      osc.type = currentWaveform;
    });

    drawWaveform();
  });
});

// ===== Waveform Canvas =====
const canvas = document.getElementById('waveformCanvas');
const ctx = canvas.getContext('2d');

function drawWaveform() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#2a2a4a';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < canvas.width; i += 20) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, canvas.height);
    ctx.stroke();
  }
  for (let i = 0; i < canvas.height; i += 20) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(canvas.width, i);
    ctx.stroke();
  }

  ctx.strokeStyle = '#3a3a5a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, canvas.height / 2);
  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.stroke();

  ctx.strokeStyle = '#00ff88';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = '#00ff88';
  ctx.shadowBlur = 6;
  ctx.beginPath();

  const midY = canvas.height / 2;
  const amp = canvas.height * 0.35;

  for (let x = 0; x < canvas.width; x++) {
    const t = (x / canvas.width) * Math.PI * 4;
    let y = 0;

    switch (currentWaveform) {
      case 'sine':
        y = Math.sin(t) * amp;
        break;
      case 'square':
        y = (Math.sin(t) >= 0 ? 1 : -1) * amp;
        break;
      case 'sawtooth':
        y = ((t % (Math.PI * 2)) / (Math.PI * 2) * 2 - 1) * amp;
        break;
    }

    if (x === 0) ctx.moveTo(x, midY - y);
    else ctx.lineTo(x, midY - y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#00ff88';
  ctx.font = '10px monospace';
  const labels = { sine: 'SINE', square: 'SQUARE', sawtooth: 'SAW' };
  ctx.fillText(labels[currentWaveform], 8, 14);
}

drawWaveform();

function animateWaveform() {
  if (Object.keys(activeOscillators).length > 0) {
    const time = Date.now() / 1000;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#2a2a4a';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < canvas.width; i += 20) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 20) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }

    ctx.strokeStyle = '#3a3a5a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 8;
    ctx.beginPath();

    const midY = canvas.height / 2;
    const amp = canvas.height * 0.35;
    const speed = 8;

    for (let x = 0; x < canvas.width; x++) {
      const t = (x / canvas.width) * Math.PI * 4 + time * speed;
      let y = 0;

      switch (currentWaveform) {
        case 'sine':
          y = Math.sin(t) * amp;
          break;
        case 'square':
          y = (Math.sin(t) >= 0 ? 1 : -1) * amp;
          break;
        case 'sawtooth':
          y = ((t % (Math.PI * 2)) / (Math.PI * 2) * 2 - 1) * amp;
          break;
      }

      if (x === 0) ctx.moveTo(x, midY - y);
      else ctx.lineTo(x, midY - y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#00ff88';
    ctx.font = '10px monospace';
    const labels = { sine: 'SINE', square: 'SQUARE', sawtooth: 'SAW' };
    ctx.fillText(labels[currentWaveform], 8, 14);
  } else {
    drawWaveform();
  }
  requestAnimationFrame(animateWaveform);
}
animateWaveform();

// ===== Knob: Volume =====
const volKnob = document.getElementById('volKnob');
let volAngle = 60;

function updateVolumeKnob(angle) {
  volAngle = Math.max(-150, Math.min(150, angle));
  volKnob.style.transform = `rotate(${volAngle}deg)`;
  const pct = (volAngle + 150) / 300;
  volume = pct;
  if (masterGain) masterGain.gain.value = volume;
}

let draggingVol = false;
let volStartY = 0;
let volStartAngle = 0;

volKnob.addEventListener('mousedown', (e) => {
  draggingVol = true;
  volStartY = e.clientY;
  volStartAngle = volAngle;
  e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
  if (!draggingVol) return;
  const dy = volStartY - e.clientY;
  updateVolumeKnob(volStartAngle + dy * 2);
});

document.addEventListener('mouseup', () => { draggingVol = false; });

volKnob.addEventListener('touchstart', (e) => {
  draggingVol = true;
  volStartY = e.touches[0].clientY;
  volStartAngle = volAngle;
  e.preventDefault();
});

document.addEventListener('touchmove', (e) => {
  if (!draggingVol) return;
  const dy = volStartY - e.touches[0].clientY;
  updateVolumeKnob(volStartAngle + dy * 2);
});

document.addEventListener('touchend', () => { draggingVol = false; });

// ===== Knob: L/R Balance =====
const lrKnob = document.getElementById('lrKnob');
const lrL = document.getElementById('lrL');
const lrR = document.getElementById('lrR');
let lrAngle = 0;

function updateLRKnob(angle) {
  lrAngle = Math.max(-150, Math.min(150, angle));
  lrKnob.style.transform = `rotate(${lrAngle}deg)`;
  lrBalance = lrAngle / 150;
  if (pannerNode) pannerNode.pan.value = lrBalance;

  lrL.className = lrBalance < -0.1 ? 'active-l' : '';
  lrR.className = lrBalance > 0.1 ? 'active-r' : '';
}

let draggingLR = false;
let lrStartX = 0;
let lrStartAngle = 0;

lrKnob.addEventListener('mousedown', (e) => {
  draggingLR = true;
  lrStartX = e.clientX;
  lrStartAngle = lrAngle;
  e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
  if (!draggingLR) return;
  const dx = e.clientX - lrStartX;
  updateLRKnob(lrStartAngle + dx * 2);
});

document.addEventListener('mouseup', () => { draggingLR = false; });

lrKnob.addEventListener('touchstart', (e) => {
  draggingLR = true;
  lrStartX = e.touches[0].clientX;
  lrStartAngle = lrAngle;
  e.preventDefault();
});

document.addEventListener('touchmove', (e) => {
  if (!draggingLR) return;
  const dx = e.touches[0].clientX - lrStartX;
  updateLRKnob(lrStartAngle + dx * 2);
});

document.addEventListener('touchend', () => { draggingLR = false; });

// Initialize knob positions
updateVolumeKnob(60);
updateLRKnob(0);

// ===== Speaker Grille =====
const grille = document.getElementById('speakerGrille');
for (let i = 0; i < 130; i++) {
  const hole = document.createElement('div');
  hole.className = 'grille-hole';
  grille.appendChild(hole);
}