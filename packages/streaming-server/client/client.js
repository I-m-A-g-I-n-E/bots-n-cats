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
let reconnectAttempts = 0;
let reconnectTimer = null;
const MAX_RECONNECT_ATTEMPTS = 6;
const RECONNECT_DELAY = 30000; // 30 seconds

// LocalStorage keys
const STORAGE_KEYS = {
  REPO_ID: 'botsncats_repoId',
  SERVER_URL: 'botsncats_serverUrl',
};

// DOM Elements
const statusEl = document.getElementById('status');
const repoIdInput = document.getElementById('repoId');
const repoIdError = document.getElementById('repoIdError');
const serverUrlInput = document.getElementById('serverUrl');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const testAudioBtn = document.getElementById('testAudioBtn');
const logEl = document.getElementById('log');
const audioCountEl = document.getElementById('audioCount');
const heartbeatCountEl = document.getElementById('heartbeatCount');

// Validation
const REPO_FORMAT_REGEX = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;

// Event Handlers
connectBtn.addEventListener('click', connect);
disconnectBtn.addEventListener('click', disconnect);
testAudioBtn.addEventListener('click', triggerTestAudio);
repoIdInput.addEventListener('blur', validateRepoId);
repoIdInput.addEventListener('input', validateRepoId);

// Save to localStorage when inputs change
repoIdInput.addEventListener('change', () => {
  localStorage.setItem(STORAGE_KEYS.REPO_ID, repoIdInput.value.trim());
});
serverUrlInput.addEventListener('change', () => {
  localStorage.setItem(STORAGE_KEYS.SERVER_URL, serverUrlInput.value.trim());
});

/**
 * Validate repository ID format
 */
function validateRepoId() {
  const repoId = repoIdInput.value.trim();
  
  // Empty is valid (will be caught by connect function)
  if (!repoId) {
    repoIdInput.classList.remove('error');
    repoIdError.classList.remove('show');
    connectBtn.disabled = false;
    return true;
  }
  
  // Check format
  const isValid = REPO_FORMAT_REGEX.test(repoId);
  
  if (isValid) {
    repoIdInput.classList.remove('error');
    repoIdError.classList.remove('show');
    connectBtn.disabled = false;
    return true;
  } else {
    repoIdInput.classList.add('error');
    repoIdError.classList.add('show');
    connectBtn.disabled = true;
    return false;
  }
}

/**
 * Load saved values from localStorage
 */
function loadFromStorage() {
  const savedRepoId = localStorage.getItem(STORAGE_KEYS.REPO_ID);
  const savedServerUrl = localStorage.getItem(STORAGE_KEYS.SERVER_URL);

  if (savedRepoId) {
    repoIdInput.value = savedRepoId;
  }
  if (savedServerUrl) {
    serverUrlInput.value = savedServerUrl;
  }
}

/**
 * Generate a unique client ID
 */
function generateClientId() {
  return 'client_' + Math.random().toString(36).substring(2, 15);
}

/**
 * Attempt to reconnect after disconnection
 */
function scheduleReconnect() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    addLog(`Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Please reconnect manually.`, 'error');
    return;
  }

  reconnectAttempts++;
  const delay = RECONNECT_DELAY / 1000; // Convert to seconds for display

  addLog(`Reconnecting in ${delay}s (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`, 'info');
  setStatus('connecting', `Reconnecting in ${delay}s...`);

  reconnectTimer = setTimeout(() => {
    addLog(`Reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}...`, 'info');
    connect();
  }, RECONNECT_DELAY);
}

/**
 * Cancel pending reconnection
 */
function cancelReconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  reconnectAttempts = 0;
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
    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.REPO_ID, repoId);
    localStorage.setItem(STORAGE_KEYS.SERVER_URL, serverUrl);

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

    // Cancel any pending reconnects
    cancelReconnect();

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
      addLog('Server disconnected', 'error');
      connectBtn.disabled = false;
      disconnectBtn.disabled = true;
      testAudioBtn.disabled = true;

      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }

      // Attempt auto-reconnect
      scheduleReconnect();
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
  // Cancel any pending reconnects
  cancelReconnect();

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

    // Start playback
    Tone.Transport.start();
    addLog(`Playing ${params.instrumentType} at ${params.tempo} BPM...`, 'success');

    // Stop after duration and clean up
    setTimeout(() => {
      Tone.Transport.stop();
      Tone.Transport.cancel();
      instrument.dispose();
      addLog('Playback complete', 'success');
    }, duration * 1000);

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

// Initialize - load saved values from localStorage
loadFromStorage();
validateRepoId(); // Validate on page load
addLog('Client ready. Enter repository and connect to stream.');
