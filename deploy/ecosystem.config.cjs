// PM2 ecosystem — jalankan: pm2 start deploy/ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "umkm-desa",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: "./",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
