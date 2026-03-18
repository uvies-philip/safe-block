const net = require('node:net');
const { spawn } = require('node:child_process');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isPortOpen = (port, host = '127.0.0.1') =>
  new Promise((resolve) => {
    const socket = new net.Socket();

    const done = (value) => {
      socket.destroy();
      resolve(value);
    };

    socket.setTimeout(800);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
    socket.connect(port, host);
  });

const startProcess = (command, args) =>
  spawn(command, args, {
    shell: true,
    stdio: 'inherit',
  });

const children = [];

const startMissingServices = async () => {
  const backendUp = await isPortOpen(4000);
  const webUp = await isPortOpen(8082);

  if (!backendUp) {
    console.log('Starting backend on port 4000...');
    children.push(startProcess('npm', ['run', 'dev:backend']));
  } else {
    console.log('Backend already running on port 4000.');
  }

  if (!webUp) {
    console.log('Starting mobile web on port 8082...');
    children.push(startProcess('npm', ['run', 'dev:web', '--workspace', 'mobile']));
  } else {
    console.log('Mobile web already running on port 8082.');
  }

  if (children.length === 0) {
    console.log('SafeBlock dev services are already running.');
    return;
  }

  for (const child of children) {
    child.on('exit', async (code) => {
      if (code && code !== 0) {
        process.exitCode = code;
      }

      await wait(50);
      const anyAlive = children.some((proc) => !proc.killed && proc.exitCode === null);
      if (!anyAlive) {
        process.exit(process.exitCode ?? 0);
      }
    });
  }
};

const shutdown = () => {
  for (const child of children) {
    if (!child.killed && child.exitCode === null) {
      child.kill('SIGINT');
    }
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startMissingServices().catch((error) => {
  console.error('Failed to start dev services:', error);
  process.exit(1);
});
