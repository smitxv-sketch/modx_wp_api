const text = '[{"reply": "<a href=\\"https://cispb.com/test\\">Link</a>"}]';
console.log(text);
const linkRegex = /<a[^>]+href=\\?["']([^"'\\]+)\\?["'][^>]*>(.*?)<\/a>/gi;
let match;
while ((match = linkRegex.exec(text)) !== null) {
  console.log(match[1], match[2]);
}
