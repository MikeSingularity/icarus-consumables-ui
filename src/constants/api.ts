/**
 * URL for the consumables JSON data file.
 *
 * In development, resolved to a local copy served by the Vite dev server.
 * In production, fetched at runtime from the authoritative GitHub Pages source.
 * Override via VITE_DATA_URL environment variable.
 */
export const DATA_URL: string =
  import.meta.env.VITE_DATA_URL ??
  'https://mikesingularity.github.io/icarus-consumables-data/icarus_consumables.min.json'
