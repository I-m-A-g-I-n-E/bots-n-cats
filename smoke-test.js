#!/usr/bin/env node

/**
 * Smoke test for bots-n-cats critical path
 * Verifies build structure and TypeScript compilation
 */

import { existsSync } from 'fs';
import { join } from 'path';

console.log('🐱 bots-n-cats Smoke Test\n');

const tests = [
  {
    name: 'TypeScript builds successfully',
    check: () => {
      const paths = [
        'packages/audio-core/dist/index.js',
        'packages/audio-core/dist/index.d.ts',
        'packages/audio-core/dist/core/ToneAudioCore.js',
        'packages/audio-core/dist/events/AudioEventBus.js',
        'packages/audio-core/dist/resources/ResourceManager.js',
        'packages/audio-core/dist/factories/InstrumentFactory.js',
        'packages/audio-core/dist/types/index.js',
      ];
      return paths.every(p => existsSync(join(process.cwd(), p)));
    }
  },
  {
    name: 'Webhook server structure',
    check: () => existsSync('packages/webhook-server/dist/index.js')
  },
  {
    name: 'Music engine structure',
    check: () => existsSync('packages/music-engine/dist/index.js')
  },
  {
    name: 'Git worktrees created',
    check: () => {
      const worktrees = [
        '../bots-webhook',
        '../bots-audio',
        '../bots-music',
        '../bots-cats',
        '../bots-stream'
      ];
      return worktrees.every(w => existsSync(join(process.cwd(), w)));
    }
  },
  {
    name: 'Documentation exists',
    check: () => {
      return existsSync('CLAUDE.md') &&
             existsSync('README.md') &&
             existsSync('packages/audio-core/README.md');
    }
  },
  {
    name: 'Node modules installed',
    check: () => {
      return existsSync('node_modules/tone') &&
             existsSync('node_modules/typescript');
    }
  }
];

let passed = 0;
let failed = 0;

tests.forEach((test, i) => {
  process.stdout.write(`Test ${i + 1}: ${test.name}... `);
  try {
    if (test.check()) {
      console.log('✅');
      passed++;
    } else {
      console.log('❌');
      failed++;
    }
  } catch (error) {
    console.log('❌', error.message);
    failed++;
  }
});

console.log('\n' + '='.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50) + '\n');

if (failed === 0) {
  console.log('🎉 All smoke tests passed!\n');
  console.log('Critical path verified:');
  console.log('  ✓ TypeScript compilation (ESM)');
  console.log('  ✓ Package structure');
  console.log('  ✓ Git worktrees');
  console.log('  ✓ Documentation');
  console.log('  ✓ Dependencies\n');
  console.log('🚀 Ready for parallel agent development!');
  console.log('\nNext steps:');
  console.log('  1. Launch agents in worktrees');
  console.log('  2. Agents implement their assigned Linear issues');
  console.log('  3. Runtime testing in browser environment');
  process.exit(0);
} else {
  console.error('❌ Some smoke tests failed');
  process.exit(1);
}
