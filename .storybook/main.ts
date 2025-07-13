@@ .. @@
 import type { StorybookConfig } from "@storybook/react-vite";
+import { mergeConfig } from 'vite';
+import path from 'path';
 
 const config: StorybookConfig = {
   stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
@@ .. @@
   framework: {
     name: "@storybook/react-vite",
     options: {},
+  },
+  viteFinal: async (config) => {
+    return mergeConfig(config, {
+      css: {
+        postcss: {
+          plugins: [
+            require('postcss-import'),
+            require('tailwindcss/nesting'),
+            require('tailwindcss'),
+            require('autoprefixer'),
+          ],
+        },
+      },
+      resolve: {
+        alias: {
+          '@': path.resolve(__dirname, '../src'),
+        },
+      },
+    });
   }
 };
 export default config;