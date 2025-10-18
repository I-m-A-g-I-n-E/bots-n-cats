/**
 * Jest setup file
 * Initializes Web Audio API polyfill for Node.js testing and global jest
 */

import { jest } from '@jest/globals';
import { AudioContext } from 'web-audio-api';

// Make jest available globally
global.jest = jest;

// Make AudioContext available globally for Tone.js
global.AudioContext = AudioContext;
global.window = { AudioContext };
