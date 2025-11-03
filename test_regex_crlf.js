// Test if regex works with CRLF line endings

const taskRegex = /^[\s]*[-*]\s*\[([ xX])\]\s*(.+)$/;

// Simulate what happens after split('\n') on CRLF file
const lines = [
  '# Test Import Tasks\r',
  '\r',
  '## Quick Wins\r',
  '\r',
  '- [ ] Add keyboard shortcuts\r',
  '- [ ] Show sync notifications  \r',
  '- [x] Fix project dropdown\r'
];

console.log('Testing regex with CRLF endings:\n');

lines.forEach((line, i) => {
  const match = line.match(taskRegex);
  console.log(`Line ${i}: "${line.replace(/\r/g, '[CR]')}"`);
  console.log(`  Match: ${match ? 'YES' : 'NO'}`);
  if (match) {
    console.log(`  Checked: ${match[1] === 'x'}`);
    console.log(`  Text: "${match[2].replace(/\r/g, '[CR]')}"`);
  }
  console.log();
});

