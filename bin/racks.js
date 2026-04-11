#!/usr/bin/env node

/**
 * RACKS CLI Entry Point
 * This script is called when users run: npx racks <command>
 */

import('../dist/cli/index.js').catch(err => {
  console.error('Failed to start RACKS:', err);
  process.exit(1);
});
