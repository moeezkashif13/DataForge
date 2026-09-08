try {
  process.loadEnvFile();
} catch {
  // If .env is missing or already loaded via environment, continue silently
}
