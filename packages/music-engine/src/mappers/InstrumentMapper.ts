/**
 * InstrumentMapper: Maps programming languages to instrument types
 * BOC-3: Music Mapping Engine
 */

import type { InstrumentType } from '@bots-n-cats/audio-core';
import { LANGUAGE_MAPPINGS } from '../constants/mappings.js';

export class InstrumentMapper {
  /**
   * Map a programming language to an instrument type
   * @param language - Programming language (e.g., 'javascript', 'python')
   * @returns Instrument type to use
   */
  static languageToInstrument(language?: string): InstrumentType {
    if (!language) {
      return LANGUAGE_MAPPINGS.default;
    }

    const normalized = language.toLowerCase().trim();
    return LANGUAGE_MAPPINGS[normalized] || LANGUAGE_MAPPINGS.default;
  }

  /**
   * Get instrument type from file extension
   * @param filename - File name or path
   * @returns Instrument type
   */
  static fromFilename(filename: string): InstrumentType {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (!ext) {
      return LANGUAGE_MAPPINGS.default;
    }

    // Map extensions to languages
    const extMap: Record<string, string> = {
      js: 'javascript',
      ts: 'typescript',
      jsx: 'jsx',
      tsx: 'tsx',
      py: 'python',
      rs: 'rust',
      go: 'go',
      java: 'java',
      kt: 'kotlin',
      cpp: 'cpp',
      c: 'c',
      rb: 'ruby',
      php: 'php',
      hs: 'haskell',
      ex: 'elixir',
      erl: 'erlang',
      clj: 'clojure',
      scala: 'scala',
      r: 'r',
      jl: 'julia',
    };

    const language = extMap[ext];
    return this.languageToInstrument(language);
  }

  /**
   * Get all supported languages
   * @returns Array of supported language names
   */
  static getSupportedLanguages(): string[] {
    return Object.keys(LANGUAGE_MAPPINGS).filter((key) => key !== 'default');
  }

  /**
   * Check if a language is supported
   * @param language - Language to check
   * @returns True if language has a specific mapping
   */
  static isSupported(language: string): boolean {
    const normalized = language.toLowerCase().trim();
    return normalized in LANGUAGE_MAPPINGS && normalized !== 'default';
  }
}
