#!/usr/bin/env node

const command = process.argv[2] || 'mcp';

switch (command) {
  case 'mcp':
    await import('../src/server.js');
    break;
  default:
    console.error(`Unknown command: ${command}`);
    console.error('Usage: fleet-claude [mcp]');
    process.exit(1);
}
