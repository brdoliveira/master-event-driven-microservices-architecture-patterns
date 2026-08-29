import { readdirSync } from 'node:fs';

const testFiles = readdirSync(import.meta.dirname)
  .filter((file) => file.endsWith('.test.mjs'))
  .sort();

for (const testFile of testFiles) {
  await import(`./${testFile}`);
}
