/**
 * Strip emoji from logger template literals using byte-level approach.
 * Reads file as Buffer, finds emoji byte sequences before known text patterns.
 */
const fs = require('fs');
const path = require('path');

function stripEmojiFromLoggerLines(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let count = 0;

  // Split into lines, process each
  const lines = content.split(/\r?\n/);
  const result = lines.map((line) => {
    // Check if line has a template literal that starts with a non-ASCII char
    // Pattern: starts with optional spaces + backtick + non-ASCII chars + space + known word
    const m = line.match(/^(\s*`)([\s\S]*?)(`\s*)$/) ||
              line.match(/^(\s*`)([\s\S]+)$/);
    if (!m) return line;

    // Remove non-ASCII / non-printable leading chars from template content
    const prefix = m[1];
    let body = m[2];
    const suffix = m[3] || '';

    // Strip leading non-ASCII (emoji range) chars and following space
    const originalBody = body;
    // Remove chars with codepoint > 127 at the very start, followed by optional space
    body = body.replace(/^[^\x00-\x7F\s][^\x00-\x7F]*\s?/, '');
    // Also remove variation selectors (FE0F) that may remain
    body = body.replace(/^\uFE0F\s?/, '');

    if (body !== originalBody) {
      count++;
      return prefix + body + suffix;
    }
    return line;
  });

  if (count > 0) {
    fs.writeFileSync(filePath, result.join('\n'), 'utf8');
    console.log(`${path.basename(filePath)}: ${count} line(s) cleaned`);
  } else {
    console.log(`${path.basename(filePath)}: nothing to clean`);
  }
}

const targets = [
  '../src/services/evolution.service.js',
  '../src/services/ai/geminiService.js',
  '../src/services/ai/audioTranscriptionService.js',
  '../src/services/ai/audioTranscriptionGroqService.js',
  '../src/services/ai/audioTranscriptionOllamaService.js',
  '../src/controllers/whatsapp.controller.js',
  '../src/routes/public.routes.js',
];

for (const rel of targets) {
  const full = path.join(__dirname, rel);
  if (fs.existsSync(full)) stripEmojiFromLoggerLines(full);
  else console.warn(`NOT FOUND: ${rel}`);
}
console.log('Done.');
