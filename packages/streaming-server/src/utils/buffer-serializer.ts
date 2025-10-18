/**
 * AudioBuffer Serialization Utility
 * Converts AudioBuffer to/from JSON for network transmission
 * BOC-13: Real-time streaming system
 */

import { SerializedBuffer } from '../types';

export class BufferSerializer {
  /**
   * Serialize AudioBuffer to JSON-compatible format
   */
  static serialize(audioBuffer: AudioBuffer): SerializedBuffer {
    const channels: number[][] = [];

    // Extract all channel data
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      const channelData = audioBuffer.getChannelData(i);
      channels.push(Array.from(channelData));
    }

    return {
      sampleRate: audioBuffer.sampleRate,
      length: audioBuffer.length,
      duration: audioBuffer.duration,
      numberOfChannels: audioBuffer.numberOfChannels,
      channels,
    };
  }

  /**
   * Deserialize JSON data back to AudioBuffer (browser-side)
   * This would be used in the browser client with Web Audio API
   */
  static deserialize(data: SerializedBuffer, audioContext: AudioContext): AudioBuffer {
    // Create empty buffer
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
   * Calculate approximate size of serialized buffer in bytes
   */
  static calculateSize(buffer: SerializedBuffer): number {
    // Each float32 is 4 bytes
    return buffer.numberOfChannels * buffer.length * 4;
  }

  /**
   * Compress buffer data by reducing precision (optional optimization)
   * Converts Float32 to Int16 to reduce size by 50%
   */
  static compressBuffer(audioBuffer: AudioBuffer): SerializedBuffer {
    const channels: number[][] = [];

    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      const channelData = audioBuffer.getChannelData(i);
      const compressed: number[] = [];

      // Convert Float32 (-1.0 to 1.0) to Int16 (-32768 to 32767)
      for (let j = 0; j < channelData.length; j++) {
        const sample = Math.max(-1, Math.min(1, channelData[j]));
        compressed.push(Math.round(sample * 32767));
      }

      channels.push(compressed);
    }

    return {
      sampleRate: audioBuffer.sampleRate,
      length: audioBuffer.length,
      duration: audioBuffer.duration,
      numberOfChannels: audioBuffer.numberOfChannels,
      channels,
    };
  }

  /**
   * Decompress Int16 buffer back to Float32 (browser-side)
   */
  static decompressBuffer(data: SerializedBuffer, audioContext: AudioContext): AudioBuffer {
    const buffer = audioContext.createBuffer(
      data.numberOfChannels,
      data.length,
      data.sampleRate
    );

    data.channels.forEach((channelData, i) => {
      const float32Array = new Float32Array(channelData.length);

      // Convert Int16 back to Float32
      for (let j = 0; j < channelData.length; j++) {
        float32Array[j] = channelData[j] / 32767;
      }

      buffer.copyToChannel(float32Array, i);
    });

    return buffer;
  }
}
