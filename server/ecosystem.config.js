module.exports = {
  apps: [
    {
      name: 'food-ordering-server',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        CLIENT_BASE_URL: 'https://food.wayon.in',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
  ],
};
