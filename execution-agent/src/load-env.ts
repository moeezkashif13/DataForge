import * as path from 'path';
import * as fs from 'fs';

const candidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../.env'),
];

let loaded = false;
for (const envPath of candidates) {
  if (fs.existsSync(envPath)) {
    try {
      process.loadEnvFile(envPath);
      loaded = true;
      break;
    } catch {
      // Continue to next candidate if error
    }
  }
}

if (!loaded) {
  try {
    process.loadEnvFile();
  } catch {
    // If .env is missing or already loaded via environment, continue silently
  }
}
