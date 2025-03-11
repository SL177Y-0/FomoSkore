// Simple script to check Tailwind CSS configuration

import { createApp } from '@tailwindcss/node';

async function checkTailwindConfig() {
  try {
    console.log('Checking Tailwind CSS configuration...');
    
    const app = createApp({
      cwd: process.cwd(),
      mode: 'build'
    });
    
    await app.build();
    
    console.log('Tailwind CSS configuration is valid!');
  } catch (error) {
    console.error('Tailwind CSS configuration error:', error);
  }
}

checkTailwindConfig(); 