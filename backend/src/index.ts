import { createApp } from './app';
import { env } from './config/env';
import { idempotencyService } from './services/idempotencyService';

async function main() {
  idempotencyService.startEvictionLoop();

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`OffPay backend listening on http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error('Fatal startup error', err);
  process.exit(1);
});
