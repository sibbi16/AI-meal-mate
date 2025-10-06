import { teardownTestUsers } from './auth-utils';

async function globalTeardown() {
  console.log('🧹 Running global test teardown...');
  await teardownTestUsers();
}

export default globalTeardown; 