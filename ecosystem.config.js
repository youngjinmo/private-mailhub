module.exports = {
  apps: [{
    name: 'private-mailhub',
    cwd: '/var/www/private-mailhub/back-end',
    script: './dist/main.js',
    instances: 2,
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    error_file: '/var/log/pm2/private-mailhub-error.log',
    out_file: '/var/log/pm2/private-mailhub-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000
  }]
};
