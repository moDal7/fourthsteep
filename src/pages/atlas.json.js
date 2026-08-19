import { getCollection } from 'astro:content';
import { atlasRecord } from '../lib/atlas.js';

export async function GET() {
  const teas = await getCollection('teas');
  return new Response(JSON.stringify(teas.map(atlasRecord), null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
