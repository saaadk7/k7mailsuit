/**
 * Installation script for MailSuite
 * 
 * This script installs all dependencies for the MailSuite project,
 * including the root project, extension, and server.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Function to execute a command and log output
function runCommand(command, cwd) {
  console.log(`\n\n> ${command} (in ${cwd || '.'})`)
  try {
    execSync(command, { 
      cwd: cwd || process.cwd(),
      stdio: 'inherit' 
    });
    return true;
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.message);
    return false;
  }
}

// Main installation function
async function install() {
  console.log('\n🚀 Starting MailSuite installation...\n');
  
  // Install root dependencies
  console.log('📦 Installing root dependencies...');
  if (!runCommand('npm install')) {
    console.error('❌ Failed to install root dependencies');
    process.exit(1);
  }
  
  // Install extension dependencies
  console.log('\n📦 Installing extension dependencies...');
  if (!runCommand('npm install', path.join(process.cwd(), 'extension'))) {
    console.error('❌ Failed to install extension dependencies');
    process.exit(1);
  }
  
  // Install server dependencies
  console.log('\n📦 Installing server dependencies...');
  if (!runCommand('npm install', path.join(process.cwd(), 'server'))) {
    console.error('❌ Failed to install server dependencies');
    process.exit(1);
  }
  
  // Check if .env file exists, if not copy from .env.example
  const envPath = path.join(process.cwd(), 'server', '.env');
  const envExamplePath = path.join(process.cwd(), 'server', '.env.example');
  
  if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    console.log('\n📄 Creating .env file from .env.example...');
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ Created .env file. Please update it with your configuration.');
  }
  
  console.log('\n✅ Installation complete!');
  console.log('\n📝 Next steps:');
  console.log('  1. Update server/.env with your configuration');
  console.log('  2. Start MongoDB server');
  console.log('  3. Run "npm start" to start both the extension and server');
  console.log('  4. Load the extension in Chrome from the "extension/build" directory');
}

// Run the installation
install().catch(error => {
  console.error('❌ Installation failed:', error);
  process.exit(1);
});
