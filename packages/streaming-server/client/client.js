/**
 * bots-n-cats Browser Client
 * Connects to SSE stream and plays audio using Tone.js
 * BOC-13: Real-time streaming system
 */

// State
let eventSource = null;
let audioContext = null;
let audioCount = 0;
let heartbeatCount = 0;
let clientId = generateClientId();
let logoPaths = [];
let logoLoop = null;
let logoAccentLoop = null;
let beatCounter = 0;
let accentTimeouts = [];
const activeLogoSessions = new Set();
const logoSessionTimers = new Map();
const activeTransportSessions = new Set();

// DOM Elements
const statusEl = document.getElementById('status');
const repoIdInput = document.getElementById('repoId');
const serverUrlInput = document.getElementById('serverUrl');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const testAudioBtn = document.getElementById('testAudioBtn');
const logEl = document.getElementById('log');
const audioCountEl = document.getElementById('audioCount');
const heartbeatCountEl = document.getElementById('heartbeatCount');
const logoContainer = document.getElementById('logoContainer');

// Event Handlers
connectBtn.addEventListener('click', connect);
disconnectBtn.addEventListener('click', disconnect);
testAudioBtn.addEventListener('click', triggerTestAudio);

/**
 * Generate a unique client ID
 */
function generateClientId() {
  return 'client_' + Math.random().toString(36).substring(2, 15);
}

/**
 * Update status display
 */
function setStatus(status, message) {
  statusEl.className = `status ${status}`;
  statusEl.textContent = message;
}

/**
 * Add log entry
 */
function addLog(message, type = 'info') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;

  const timestamp = document.createElement('div');
  timestamp.className = 'timestamp';
  timestamp.textContent = new Date().toLocaleTimeString();

  entry.appendChild(timestamp);
  entry.appendChild(document.createTextNode(message));

  logEl.insertBefore(entry, logEl.firstChild);

  // Keep only last 20 entries
  while (logEl.children.length > 20) {
    logEl.removeChild(logEl.lastChild);
  }
}

/**
 * Load the logo SVG and prepare animation paths
 */
async function loadLogo() {
  if (!logoContainer) {
    return;
  }

  try {
    const response = await fetch('/assets/logo.svg');

    if (!response.ok) {
      throw new Error(`Unable to load logo (status ${response.status})`);
    }

    const svgMarkup = await response.text();
    logoContainer.innerHTML = svgMarkup;

    const svgElement = logoContainer.querySelector('svg');

    if (!svgElement) {
      throw new Error('Logo SVG missing root element');
    }

    svgElement.setAttribute('role', 'presentation');
    svgElement.setAttribute('focusable', 'false');

    prepareLogoPaths(svgElement);
  } catch (error) {
    console.error('Failed to load logo:', error);
    addLog('Unable to load animated logo: ' + error.message, 'error');
  }
}

/**
 * Cache logo paths and apply base styling classes
 */
function prepareLogoPaths(svgElement) {
  const pathElements = Array.from(svgElement.querySelectorAll('path'));

  const sortable = pathElements.map((path) => {
    let xPosition = 0;

    try {
      const box = path.getBBox();
      xPosition = box.x;
    } catch (error) {
      console.warn('Unable to compute bounding box for path', error);
    }

    return { path, x: xPosition };
  });

  sortable.sort((a, b) => a.x - b.x);
  logoPaths = sortable.map((item) => item.path);

  logoPaths.forEach((path) => {
    path.classList.add('logo-dot');
  });
}

/**
 * Ensure Tone.Transport is running while animations/audio play
 */
function ensureTransportRunning() {
  const sessionId = Symbol('transportSession');

  if (activeTransportSessions.size === 0 && Tone.Transport.state !== 'started') {
    Tone.Transport.start();
  }

  activeTransportSessions.add(sessionId);
  return sessionId;
}

/**
 * Release the shared Tone.Transport when no sessions remain
 */
function releaseTransport(sessionId, { force = false } = {}) {
  if (sessionId && activeTransportSessions.has(sessionId)) {
    activeTransportSessions.delete(sessionId);
  }

  if (force) {
    activeTransportSessions.clear();
  }

  if (activeTransportSessions.size === 0 && Tone.Transport.state !== 'stopped') {
    Tone.Transport.stop();
    Tone.Transport.cancel();
  }
}

/**
 * Start looping logo animation synced to Tone.js transport
 */
function startLogoPulse(tempo = 120) {
  if (!logoPaths.length) {
    return null;
  }

  Tone.Transport.bpm.value = tempo;

  const sessionId = Symbol('logoSession');
  activeLogoSessions.add(sessionId);

  const isFirstSession = activeLogoSessions.size === 1;

  if (!logoLoop) {
    beatCounter = 0;
    logoLoop = new Tone.Loop((time) => {
      Tone.Draw.schedule(() => {
        animateLogoBeat();
      }, time);
    }, '8n');
    logoLoop.start(0);
  } else if (logoLoop.state !== 'started') {
    beatCounter = 0;
    logoLoop.start(0);
  } else if (isFirstSession) {
    beatCounter = 0;
  }

  if (!logoAccentLoop) {
    logoAccentLoop = new Tone.Loop((time) => {
      Tone.Draw.schedule(() => {
        accentuateLogo();
      }, time);
    }, '4n');
    logoAccentLoop.start('8n');
  } else if (logoAccentLoop.state !== 'started') {
    logoAccentLoop.start('8n');
  }

  return sessionId;
}

/**
 * Stop logo animation loops and reset styles
 */
function stopLogoPulse({ sessionId, resetTransport = false } = {}) {
  if (sessionId && activeLogoSessions.has(sessionId)) {
    clearLogoSessionTimer(sessionId);
    activeLogoSessions.delete(sessionId);
  }

  if (resetTransport) {
    activeLogoSessions.forEach((id) => clearLogoSessionTimer(id));
    activeLogoSessions.clear();
    logoSessionTimers.clear();
  }

  if (activeLogoSessions.size > 0 && !resetTransport) {
    return;
  }

  if (logoLoop) {
    logoLoop.stop();
    logoLoop.dispose();
    logoLoop = null;
  }

  if (logoAccentLoop) {
    logoAccentLoop.stop();
    logoAccentLoop.dispose();
    logoAccentLoop = null;
  }

  clearAccentTimeouts();

  if (logoPaths.length) {
    logoPaths.forEach((path) => {
      path.classList.remove('logo-dot--active', 'logo-dot--accent');
    });
  }

  if (logoContainer) {
    logoContainer.classList.remove('logo-wrapper--pulse');
  }

  if (resetTransport) {
    releaseTransport(undefined, { force: true });
  }
}

/**
 * Animate a wave of active dots across the logo on each 8th-note
 */
function animateLogoBeat() {
  if (!logoPaths.length) {
    return;
  }

  const slices = 8;
  const groupSize = Math.ceil(logoPaths.length / slices);
  beatCounter = (beatCounter + 1) % (slices * 16);

  const cycleIndex = Math.floor(beatCounter / slices);
  const forward = cycleIndex % 2 === 0;
  const groupIndex = beatCounter % slices;
  const normalizedGroup = forward ? groupIndex : slices - 1 - groupIndex;
  const startIndex = normalizedGroup * groupSize;
  const endIndex = Math.min(startIndex + groupSize, logoPaths.length);

  logoPaths.forEach((path, index) => {
    const isActive = index >= startIndex && index < endIndex;
    path.classList.toggle('logo-dot--active', isActive);
  });
}

/**
 * Add syncopated accents on the off-beats
 */
function accentuateLogo() {
  if (!logoPaths.length) {
    return;
  }

  const accentCount = Math.max(6, Math.floor(logoPaths.length * 0.015));
  const accentPaths = [];

  for (let i = 0; i < accentCount; i++) {
    const randomIndex = Math.floor(Math.random() * logoPaths.length);
    const path = logoPaths[randomIndex];
    accentPaths.push(path);
    path.classList.add('logo-dot--accent');
  }

  if (logoContainer) {
    logoContainer.classList.add('logo-wrapper--pulse');
    accentTimeouts.push(
      setTimeout(() => {
        logoContainer.classList.remove('logo-wrapper--pulse');
      }, 160)
    );
  }

  accentTimeouts.push(
    setTimeout(() => {
      accentPaths.forEach((path) => path.classList.remove('logo-dot--accent'));
    }, 180)
  );
}

/**
 * Clear pending accent removal timers
 */
function clearAccentTimeouts() {
  accentTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
  accentTimeouts = [];
}

function registerLogoSessionTimer(sessionId, timerId) {
  if (!sessionId) {
    return;
  }

  const existingTimer = logoSessionTimers.get(sessionId);

  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  logoSessionTimers.set(sessionId, timerId);
}

function clearLogoSessionTimer(sessionId) {
  if (!sessionId) {
    return;
  }

  const timerId = logoSessionTimers.get(sessionId);

  if (timerId) {
    clearTimeout(timerId);
    logoSessionTimers.delete(sessionId);
  }
}

/**
 * Connect to SSE stream
 */
async function connect() {
  const repoId = repoIdInput.value.trim();
  const serverUrl = serverUrlInput.value.trim();

  if (!repoId) {
    alert('Please enter a repository ID');
    return;
  }

  if (!serverUrl) {
    alert('Please enter a server URL');
    return;
  }

  try {
    // Initialize Tone.js audio context
    if (!audioContext) {
      await Tone.start();
      audioContext = Tone.context;
      addLog('Audio context initialized', 'success');
    }

    // Close existing connection
    if (eventSource) {
      eventSource.close();
    }

    setStatus('connecting', 'Connecting...');
    addLog(`Connecting to ${serverUrl}/stream/${repoId}...`);

    // Create SSE connection (URL-encode repoId to handle slashes)
    const encodedRepoId = encodeURIComponent(repoId);
    const streamUrl = `${serverUrl}/stream/${encodedRepoId}?clientId=${clientId}`;
    eventSource = new EventSource(streamUrl);

    // Handle connection open
    eventSource.addEventListener('open', () => {
      setStatus('connected', `Connected to ${repoId}`);
      addLog(`Connected to repo ${repoId}`, 'success');
      connectBtn.disabled = true;
      disconnectBtn.disabled = false;
      testAudioBtn.disabled = false;
    });

    // Handle messages
    eventSource.addEventListener('message', async (event) => {
      try {
        const message = JSON.parse(event.data);
        await handleMessage(message);
      } catch (error) {
        console.error('Error parsing message:', error);
        addLog('Error parsing message: ' + error.message, 'error');
      }
    });

    // Handle errors
    eventSource.addEventListener('error', (error) => {
      console.error('SSE Error:', error);
      setStatus('disconnected', 'Connection lost');
      addLog('Connection error', 'error');
      connectBtn.disabled = false;
      disconnectBtn.disabled = true;
      testAudioBtn.disabled = true;
      stopLogoPulse({ resetTransport: true });

      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    });
  } catch (error) {
    console.error('Connection error:', error);
    setStatus('disconnected', 'Connection failed');
    addLog('Failed to connect: ' + error.message, 'error');
    stopLogoPulse({ resetTransport: true });
  }
}

/**
 * Disconnect from SSE stream
 */
function disconnect() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }

  setStatus('disconnected', 'Disconnected');
  addLog('Disconnected from stream');
  connectBtn.disabled = false;
  disconnectBtn.disabled = true;
  testAudioBtn.disabled = true;
  stopLogoPulse({ resetTransport: true });
}

/**
 * Handle incoming SSE message
 */
async function handleMessage(message) {
  console.log('Received message:', message);

  switch (message.type) {
    case 'connected':
      addLog(message.data.message, 'success');
      break;

    case 'audio_buffer':
      await handleAudioBuffer(message.data);
      break;

    case 'musical_parameters':
      await handleMusicalParameters(message.data);
      break;

    case 'heartbeat':
      heartbeatCount++;
      heartbeatCountEl.textContent = heartbeatCount;
      console.log('Heartbeat received');
      break;

    case 'error':
      addLog('Server error: ' + message.data.message, 'error');
      break;

    case 'disconnected':
      addLog('Server disconnected', 'error');
      disconnect();
      break;

    default:
      console.log('Unknown message type:', message.type);
  }
}

/**
 * Handle audio buffer message
 */
async function handleAudioBuffer(data) {
  let logoSession = null;
  let transportSession = null;

  try {
    addLog('Received audio buffer, playing...', 'success');

    // Deserialize buffer
    const buffer = deserializeBuffer(data.buffer);

    // Create Tone.js Player and play
    const player = new Tone.Player(buffer).toDestination();
    player.start();

    const tempo = data?.params?.tempo || 120;
    logoSession = startLogoPulse(tempo);
    transportSession = ensureTransportRunning();

    const playbackDuration = buffer.duration * 1000 + 120;
    const timerId = setTimeout(() => {
      stopLogoPulse({ sessionId: logoSession });
      releaseTransport(transportSession);
    }, playbackDuration);

    registerLogoSessionTimer(logoSession, timerId);

    audioCount++;
    audioCountEl.textContent = audioCount;

    addLog(`Playing audio: ${buffer.duration.toFixed(2)}s, ${tempo} BPM`, 'success');
  } catch (error) {
    console.error('Error playing audio:', error);
    addLog('Error playing audio: ' + error.message, 'error');
    if (logoSession) {
      stopLogoPulse({ sessionId: logoSession });
    } else {
      stopLogoPulse({ resetTransport: true });
    }

    if (transportSession) {
      releaseTransport(transportSession);
    }
  }
}

/**
 * Handle musical parameters message (client-side rendering)
 */
async function handleMusicalParameters(data) {
  let logoSession = null;
  let transportSession = null;
  let sessionTimer = null;
  let instrument;

  try {
    const { params } = data;
    addLog(`Received musical parameters: ${params.tempo} BPM, ${params.instrumentType}, ${params.duration}s`, 'info');

    // Create instrument based on parameters
    switch (params.instrumentType) {
      case 'fmSynth':
        instrument = new Tone.FMSynth().toDestination();
        break;
      case 'polySynth':
        instrument = new Tone.PolySynth(Tone.Synth).toDestination();
        break;
      case 'sampler':
        // Fallback to synth for sampler (would need actual samples)
        instrument = new Tone.Synth().toDestination();
        break;
      default:
        instrument = new Tone.Synth().toDestination();
    }

    // Set tempo
    Tone.Transport.bpm.value = params.tempo;

    // Get scale notes or use default
    const notes = params.scale || ['C4', 'E4', 'G4', 'B4'];
    const duration = params.duration || 5;

    // Create a simple pattern from the scale
    const notePattern = [];
    const noteDurations = [];
    const noteVelocities = [];

    // Generate a melodic sequence using the scale
    for (let i = 0; i < 8; i++) {
      notePattern.push(notes[i % notes.length]);
      noteDurations.push('8n'); // Eighth notes
      noteVelocities.push(0.5 + Math.random() * 0.3); // Random velocity 0.5-0.8
    }

    // Schedule the pattern
    let currentTime = 0;
    const eighthNoteDuration = (60 / params.tempo) / 2; // Duration of eighth note in seconds

    notePattern.forEach((note, i) => {
      Tone.Transport.schedule((time) => {
        instrument.triggerAttackRelease(note, noteDurations[i], time, noteVelocities[i]);
      }, currentTime);
      currentTime += eighthNoteDuration;
    });

    logoSession = startLogoPulse(params.tempo);
    transportSession = ensureTransportRunning();
    addLog(`Playing ${params.instrumentType} at ${params.tempo} BPM...`, 'success');

    // Stop after duration and clean up
    sessionTimer = setTimeout(() => {
      stopLogoPulse({ sessionId: logoSession });
      releaseTransport(transportSession);
      instrument.dispose();
      addLog('Playback complete', 'success');
    }, duration * 1000);

    registerLogoSessionTimer(logoSession, sessionTimer);

    audioCount++;
    audioCountEl.textContent = audioCount;
  } catch (error) {
    console.error('Error rendering audio:', error);
    addLog('Error rendering audio: ' + error.message, 'error');
    if (logoSession) {
      stopLogoPulse({ sessionId: logoSession });
    } else {
      stopLogoPulse({ resetTransport: true });
    }

    if (transportSession) {
      releaseTransport(transportSession);
    }

    if (sessionTimer) {
      clearTimeout(sessionTimer);
    }

    if (instrument) {
      instrument.dispose();
    }
  }
}

/**
 * Deserialize audio buffer from JSON
 */
function deserializeBuffer(data) {
  // Create AudioBuffer
  const buffer = audioContext.createBuffer(
    data.numberOfChannels,
    data.length,
    data.sampleRate
  );

  // Copy channel data
  data.channels.forEach((channelData, i) => {
    const float32Array = new Float32Array(channelData);
    buffer.copyToChannel(float32Array, i);
  });

  return buffer;
}

/**
 * Trigger test audio generation on server
 */
async function triggerTestAudio() {
  const repoId = repoIdInput.value.trim();
  const serverUrl = serverUrlInput.value.trim();
  const encodedRepoId = encodeURIComponent(repoId);

  try {
    addLog('Requesting test audio generation...');

    const response = await fetch(`${serverUrl}/stream/${encodedRepoId}/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tempo: 120,
        duration: 5,
        instrumentType: 'synth',
      }),
    });

    const result = await response.json();

    if (response.ok) {
      addLog('Test audio generation triggered', 'success');
    } else {
      addLog('Failed to generate test audio: ' + result.error, 'error');
    }
  } catch (error) {
    console.error('Error triggering test audio:', error);
    addLog('Error triggering test audio: ' + error.message, 'error');
  }
}

// Initialize
loadLogo();
addLog('Client ready. Enter repository and connect to stream.');
