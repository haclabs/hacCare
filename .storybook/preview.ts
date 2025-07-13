@@ .. @@
 import type { Preview } from "@storybook/react";
+import '../src/index.css'; // Import your Tailwind CSS
 
 const preview: Preview = {
   parameters: {
@@ .. @@
     },
   },
 };
 
 export default preview;