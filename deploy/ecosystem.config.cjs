// PM2 ecosystem — jalankan: pm2 start deploy/ecosystem.config.cjs
// PORT diambil dari env shell saat pm2 start (default 3000):
//   PORT=3110 pm2 start deploy/ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "umkm-desa",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: "./",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT ?? 3000,
      },
    },
  ],
};
