import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@types': path.resolve(__dirname, './types'),
            '@libraries': path.resolve(__dirname, './src/libraries'),
            '@components': path.resolve(__dirname, './src/components'),
        },
    },
});
