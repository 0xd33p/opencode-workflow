#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const targetBase = path.join(process.cwd(), '.opencode');

const mapping = {
  'agents': 'agents',
  'commands': 'commands',
  'skills': 'skills',
  'plugins': 'plugins',
  'tools': 'tools'
};

console.log('🚀 Initializing OpenCode Workflow setup...');

try {
  // 1. Create .opencode directory if it doesn't exist
  if (!fs.existsSync(targetBase)) {
    fs.mkdirSync(targetBase, { recursive: true });
    console.log(`✅ Created directory: ${targetBase}`);
  }

  // 2. Copy each component
  Object.entries(mapping).forEach(([srcFolder, destFolder]) => {
    const srcPath = path.join(__dirname, '..', srcFolder);
    const destPath = path.join(targetBase, destFolder);

    if (fs.existsSync(srcPath)) {
      // Create destination subdirectory
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }

      // Copy contents recursively
      // Note: fs.cpSync is available in Node.js 16.7.0+
      if (fs.cpSync) {
        fs.cpSync(srcPath, destPath, { recursive: true, force: true });
      } else {
        // Fallback for older Node versions (basic recursive copy)
        copyRecursiveSync(srcPath, destPath);
      }
      
      console.log(`📦 Installed ${srcFolder} -> .opencode/${destFolder}`);
    } else {
      console.warn(`⚠️ Warning: Source folder ${srcFolder} not found in package.`);
    }
  });

  console.log('\n✨ Setup complete! You can now use OpenCode CLI in this project.');
  console.log('👉 Try typing "/" to see available commands.');

} catch (error) {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
}

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest);
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}
