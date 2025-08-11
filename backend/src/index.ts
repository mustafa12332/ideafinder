import { loadConfig } from './lib/config';
import { buildApp } from './server/app';

async function main(): Promise<void> {
  const config = loadConfig();
  const app = await buildApp(config);
  try {
    await app.listen({ host: config.host, port: config.port });
    app.log.info({ url: `http://${config.host}:${config.port}` }, 'Server listening');
  } catch (err) {
    app.log.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

void main();


