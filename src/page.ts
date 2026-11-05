// src/page.ts — returns the full HTML for the Haunted Lockfile graveyard page

import { styles } from "./page/styles.js";
import { html } from "./page/html.js";
import { clientScript } from "./page/client.js";

export function renderPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Haunted Lockfile — your dependencies, as a graveyard</title>
<meta name="description" content="Drop in a package-lock.json and see which packages are dead, which are ghosts and which are zombies.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IM+Fell+English+SC&display=swap" rel="stylesheet">
<style>
${styles}
</style>
</head>
<body>
${html}
<script>
${clientScript}
</script>
</body>
</html>`;
}
