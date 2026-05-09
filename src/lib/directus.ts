import { createDirectus, rest, readItems, readItem } from '@directus/sdk';

const DIRECTUS_URL = import.meta.env.DIRECTUS_URL as string;

export const directus = createDirectus(DIRECTUS_URL).with(rest());

export { readItems, readItem };