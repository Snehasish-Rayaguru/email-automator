import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})




// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vitejs.dev/config/
// export default defineConfig({
//   plugins: [react()],
//   server: {
//     proxy: {
//       '/api': {
//         target: 'https://thetechdrops.duckdns.org',
//         changeOrigin: true,
//         secure: false, // Allows self-signed certificates if any
//         rewrite: (path) => path.replace(/^\/api/, ''), // Removes '/api' before sending to backend
//       },
//     },
//   },
// })