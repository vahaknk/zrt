/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly DIRECTUS_URL: string;
  readonly DIRECTUS_TOKEN: string;
  readonly NOTION_TOKEN: string;
  readonly NOTION_DATABASE_ID: string;
  readonly NOTION_MINOR_FORM_DATABASE_ID: string;
  readonly RESEND_API_KEY: string;
  readonly ZARDIPUM_HOOK_SECRET: string;
  // Zoom Server-to-Server OAuth app; without these, meetings need a pasted link.
  readonly ZOOM_ACCOUNT_ID?: string;
  readonly ZOOM_CLIENT_ID?: string;
  readonly ZOOM_CLIENT_SECRET?: string;
  // The Directus Railway bucket (referenced from the Directus service's vars).
  readonly PLATFORM_S3_ENDPOINT: string;
  readonly PLATFORM_S3_REGION: string;
  readonly PLATFORM_S3_BUCKET: string;
  readonly PLATFORM_S3_KEY: string;
  readonly PLATFORM_S3_SECRET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}