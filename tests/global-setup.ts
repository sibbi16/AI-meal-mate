import { setupTestUsers, teardownTestUsers } from './auth-utils';

async function globalSetup() {
  console.log('🧹 Running global test teardown...');
  await teardownTestUsers();
  console.log('🚀 Running global test setup...');
  await setupTestUsers();
}

export default globalSetup; 