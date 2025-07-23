import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import netlify from "@netlify/vite-plugin";



// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react(), netlify()],
	// server: {
	// 	host: "0.0.0.0",
	// 	proxy: {
	// 		"/api": {
	// 			target: 'https://reynaldtrading-production.up.railway.app', // URL de votre API
	// 			changeOrigin: true,
	// 			secure: false,
	// 			ws: true,
	// 			rewrite: path => path.replace(/^\/api/, '')
	// 		},
	// 	},
	// },
});
