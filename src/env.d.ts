/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly DIRECTUS_URL: string;
  readonly DIRECTUS_TOKEN: string;
  readonly NOTION_TOKEN: string;
  readonly NOTION_DATABASE_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}