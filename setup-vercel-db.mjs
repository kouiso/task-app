#!/usr/bin/env node

/**
 * Vercel Postgres Automatic Setup Script
 *
 * This script automates:
 * 1. Vercel project linking
 * 2. Postgres database creation
 * 3. Database connection to project
 * 4. Environment variables setup
 * 5. Initial deployment
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const exec = (command, options = {}) => {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'inherit', ...options });
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    throw error;
  }
};

const execQuiet = (command) => {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    return null;
  }
};

async function main() {
  console.log('🚀 Vercel Postgres Automated Setup');
  console.log('=====================================\n');

  // Check Vercel CLI
  console.log('📦 Checking Vercel CLI...');
  const vercelVersion = execQuiet('vercel --version');
  if (!vercelVersion) {
    console.log('Installing Vercel CLI...');
    exec('npm install -g vercel');
  } else {
    console.log(`✅ Vercel CLI installed: ${vercelVersion.trim()}`);
  }

  // Step 1: Login
  console.log('\n📝 Step 1: Vercel Login');
  const whoami = execQuiet('vercel whoami');
  if (!whoami) {
    console.log('Please login to Vercel...');
    exec('vercel login');
  } else {
    console.log(`✅ Logged in as: ${whoami.trim()}`);
  }

  // Step 2: Link project
  console.log('\n🔗 Step 2: Link Project');
  if (!existsSync('.vercel/project.json')) {
    console.log('Linking project to Vercel...');
    exec('vercel link');
  } else {
    console.log('✅ Project already linked');
  }

  // Read project configuration
  const projectConfig = JSON.parse(readFileSync('.vercel/project.json', 'utf8'));
  const projectId = projectConfig.projectId;
  const orgId = projectConfig.orgId;

  console.log(`Project ID: ${projectId}`);
  console.log(`Org ID: ${orgId}`);

  // Step 3: Get API Token
  console.log('\n🔑 Step 3: Vercel API Token');
  console.log('Create a token at: https://vercel.com/account/tokens');
  console.log('Token name: task-app-setup');
  console.log('Scope: Full Account\n');

  const token = await question('Enter your Vercel API token: ');
  if (!token) {
    console.error('❌ Token is required');
    process.exit(1);
  }

  // Step 4: Create Database
  console.log('\n🗄️  Step 4: Create Postgres Database');
  const dbName = (await question('Database name (default: taskapp-db): ')) || 'taskapp-db';
  const region = (await question('Region (default: iad1 - Washington D.C.): ')) || 'iad1';

  console.log(`\nCreating database: ${dbName} in ${region}...`);

  const createResponse = await fetch('https://api.vercel.com/v1/storage/stores', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: dbName,
      type: 'postgres',
      region: region
    })
  });

  const createData = await createResponse.json();

  let storeId = createData.id;

  if (!storeId) {
    console.log('⚠️  Database might already exist');
    console.log('Fetching existing databases...\n');

    const listResponse = await fetch('https://api.vercel.com/v1/storage/stores', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const listData = await listResponse.json();

    if (listData.stores && listData.stores.length > 0) {
      console.log('Available databases:');
      listData.stores.forEach((store, i) => {
        console.log(`${i + 1}. ${store.name} (${store.id}) - ${store.type}`);
      });

      const selection = await question('\nSelect database number (or Enter to create new): ');
      if (selection && listData.stores[parseInt(selection) - 1]) {
        storeId = listData.stores[parseInt(selection) - 1].id;
      }
    }
  }

  if (!storeId) {
    console.error('❌ Failed to create or select database');
    console.error('Response:', createData);
    process.exit(1);
  }

  console.log(`✅ Database ID: ${storeId}`);

  // Step 5: Connect database to project
  console.log('\n🔌 Step 5: Connect Database to Project');

  const connectResponse = await fetch(`https://api.vercel.com/v1/storage/stores/${storeId}/connect`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      projectId: projectId
    })
  });

  const connectData = await connectResponse.json();

  if (connectResponse.ok) {
    console.log('✅ Database connected to project');
  } else {
    console.log('⚠️  Connection response:', connectData);
  }

  // Step 6: Set environment variables
  console.log('\n🔧 Step 6: Setting Environment Variables');

  // Read JWT_SECRET from .env.production
  let jwtSecret = 'Z/xG3M9/MB25IxKdTTtmzD/Lt3i/+u+rqX1l5KSZ71M=';
  if (existsSync('.env.production')) {
    const envContent = readFileSync('.env.production', 'utf8');
    const match = envContent.match(/JWT_SECRET=(.+)/);
    if (match) {
      jwtSecret = match[1];
    }
  }

  // Set environment variables using Vercel API
  const envVars = [
    { key: 'NODE_ENV', value: 'production', target: ['production'] },
    { key: 'JWT_SECRET', value: jwtSecret, target: ['production', 'preview', 'development'] },
    { key: 'DATABASE_URL', value: '${POSTGRES_PRISMA_URL}', target: ['production', 'preview', 'development'] }
  ];

  for (const envVar of envVars) {
    console.log(`Setting ${envVar.key}...`);

    const envResponse = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        key: envVar.key,
        value: envVar.value,
        type: 'encrypted',
        target: envVar.target
      })
    });

    if (envResponse.ok) {
      console.log(`✅ ${envVar.key} set`);
    } else {
      const errorData = await envResponse.json();
      console.log(`⚠️  ${envVar.key}: ${errorData.error?.message || 'Already exists or error'}`);
    }
  }

  // Step 7: Deploy
  console.log('\n🚀 Step 7: Deploy');
  const deploy = await question('Deploy to production now? (y/n): ');

  if (deploy.toLowerCase() === 'y') {
    console.log('\nDeploying...');
    exec('vercel --prod');

    console.log('\n✅ Deployment started!');
    console.log('\n📋 Next steps:');
    console.log('1. Wait for deployment to complete');
    console.log('2. Seed the database:');
    console.log('   vercel env pull .env.production.local');
    console.log('   npx prisma db seed');
  } else {
    console.log('\nSkipped deployment. Deploy later with: vercel --prod');
  }

  console.log('\n✅ Setup complete!');
  console.log('Dashboard: https://vercel.com/dashboard');

  rl.close();
}

main().catch((error) => {
  console.error('\n❌ Setup failed:', error.message);
  rl.close();
  process.exit(1);
});
