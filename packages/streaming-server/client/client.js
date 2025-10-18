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

    // Create SSE connection
    const streamUrl = `${serverUrl}/stream/${repoId}?clientId=${clientId}`;
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

  try {
    addLog('Requesting test audio generation...');

    const response = await fetch(`${serverUrl}/stream/${repoId}/test`, {
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
