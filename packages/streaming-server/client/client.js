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

// Logo animation state
let logoDots = [];
let activeLogoDots = [];
let logoPulseLoop = null;
let logoBeatIndex = 0;
const accentPattern = [
  { offset: 0, width: 2.1, accent: true },
  { offset: 1.6, width: 1.15, accent: false },
  { offset: 0.75, width: 1.6, accent: true },
  { offset: 2.5, width: 1, accent: false },
];

// Event Handlers
connectBtn.addEventListener('click', connect);
disconnectBtn.addEventListener('click', disconnect);
testAudioBtn.addEventListener('click', triggerTestAudio);

// Load logo and prepare animation
loadLogo();

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
      ensureLogoAnimation();
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

      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    });
  } catch (error) {
    console.error('Connection error:', error);
    setStatus('disconnected', 'Connection failed');
    addLog('Failed to connect: ' + error.message, 'error');
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
}

/**
 * Ensure the logo animation is active when audio context is unlocked
 */
function ensureLogoAnimation() {
  if (!logoPulseLoop && logoDots.length) {
    setupLogoPulse();
  }

  if (Tone.Transport.state !== 'started') {
    Tone.Transport.start();
  }
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
  try {
    addLog('Received audio buffer, playing...', 'success');

    // Deserialize buffer
    const buffer = deserializeBuffer(data.buffer);

    // Create Tone.js Player and play
    const player = new Tone.Player(buffer).toDestination();
    player.start();

    audioCount++;
    audioCountEl.textContent = audioCount;

    addLog(`Playing audio: ${buffer.duration.toFixed(2)}s, ${data.params.tempo} BPM`, 'success');
  } catch (error) {
    console.error('Error playing audio:', error);
    addLog('Error playing audio: ' + error.message, 'error');
  }
}

/**
 * Handle musical parameters message (client-side rendering)
 */
async function handleMusicalParameters(data) {
  try {
    const { params, repoId } = data;
    addLog(`Received musical parameters: ${params.tempo} BPM, ${params.instrumentType}, ${params.duration}s`, 'info');

    // Create instrument based on parameters
    let instrument;
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
    ensureLogoAnimation();

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
    const scheduledEvents = [];
    const eighthNoteDuration = (60 / params.tempo) / 2; // Duration of eighth note in seconds

    notePattern.forEach((note, i) => {
      const eventId = Tone.Transport.schedule((time) => {
        instrument.triggerAttackRelease(note, noteDurations[i], time, noteVelocities[i]);
      }, `+${currentTime}`);
      scheduledEvents.push(eventId);
      currentTime += eighthNoteDuration;
    });

    if (Tone.Transport.state !== 'started') {
      Tone.Transport.start();
    }
    addLog(`Playing ${params.instrumentType} at ${params.tempo} BPM...`, 'success');

    Tone.Transport.scheduleOnce((time) => {
      scheduledEvents.forEach((id) => Tone.Transport.clear(id));
      instrument.dispose();
      Tone.Draw.schedule(() => {
        addLog('Playback complete', 'success');
      }, time);
      scheduledEvents.length = 0;
    }, `+${Math.max(duration, currentTime)}`);

    audioCount++;
    audioCountEl.textContent = audioCount;
  } catch (error) {
    console.error('Error rendering audio:', error);
    addLog('Error rendering audio: ' + error.message, 'error');
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
addLog('Client ready. Enter repository and connect to stream.');

/**
 * Load the bots-n-cats logo SVG and prepare it for animation
 */
async function loadLogo() {
  if (!logoContainer) return;

  try {
    const response = await fetch('logo.svg');
    const svgMarkup = await response.text();
    logoContainer.innerHTML = svgMarkup;

    const svgElement = logoContainer.querySelector('svg');
    if (svgElement) {
      svgElement.setAttribute('role', 'presentation');
      svgElement.setAttribute('focusable', 'false');
    }

    logoDots = Array.from(logoContainer.querySelectorAll('path'));
    logoDots.forEach((dot) => {
      dot.classList.add('logo-dot');
    });

    if (audioContext) {
      ensureLogoAnimation();
    }
  } catch (error) {
    console.error('Failed to load logo.svg', error);
  }
}

/**
 * Set up a Tone.js loop to pulse logo dots in sync with the transport
 */
function setupLogoPulse() {
  if (!logoDots.length || logoPulseLoop) {
    return;
  }

  logoPulseLoop = new Tone.Loop((time) => {
    const pattern = accentPattern[logoBeatIndex % accentPattern.length];
    const totalDots = logoDots.length;
    const baseGroupSize = Math.max(6, Math.floor(totalDots / 90));
    const startIndex = Math.floor(
      (logoBeatIndex * baseGroupSize + pattern.offset * baseGroupSize) % totalDots
    );
    const groupSize = Math.max(4, Math.round(baseGroupSize * pattern.width));
    const indices = [];

    for (let i = 0; i < groupSize; i++) {
      indices.push((startIndex + i) % totalDots);
    }

    Tone.Draw.schedule(() => {
      highlightLogoDots(indices, pattern.accent);
    }, time);

    logoBeatIndex++;
  }, '8n');

  logoPulseLoop.start(0);
}

/**
 * Highlight a set of logo dots for the current beat
 */
function highlightLogoDots(indices, isAccent) {
  activeLogoDots.forEach((dot) => {
    dot.classList.remove('pulse');
    dot.classList.remove('accent');
  });

  activeLogoDots = indices
    .map((index) => logoDots[index])
    .filter(Boolean);

  activeLogoDots.forEach((dot) => {
    dot.classList.add('pulse');
    if (isAccent) {
      dot.classList.add('accent');
    }
  });
}
