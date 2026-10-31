// Starts the Django API with the backend's virtual environment, on any platform.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const backend = join(dirname(fileURLToPath(import.meta.url)), '..', 'backend');
const python = join(
  backend,
  '.venv',
  process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python'
);

if (!existsSync(python)) {
  console.error('backend/.venv not found. Follow the setup steps in backend/README.md first.');
  process.exit(1);
}

const server = spawn(python, ['manage.py', 'runserver', '127.0.0.1:8000'], {
  cwd: backend,
  stdio: 'inherit',
});
server.on('exit', code => process.exit(code ?? 0));
