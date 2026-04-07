import fs from 'fs';
import path from 'path';

const files = [
  'src/components/DetailView.tsx',
  'src/components/EntityLists.tsx',
  'src/components/GraphView.tsx',
  'src/components/JsonModal.tsx',
  'src/components/SeoAnalytics.tsx',
  'src/components/seo/SeoReportTemplate.tsx'
];

const replacements: Record<string, string> = {
  'text-gray-': 'text-slate-',
  'bg-gray-': 'bg-slate-',
  'border-gray-': 'border-slate-',
  'text-blue-': 'text-indigo-',
  'bg-blue-': 'bg-indigo-',
  'border-blue-': 'border-indigo-',
  'text-green-': 'text-emerald-',
  'bg-green-': 'bg-emerald-',
  'border-green-': 'border-emerald-',
  'text-amber-': 'text-amber-',
  'bg-amber-': 'bg-amber-',
  'border-amber-': 'border-amber-',
};

for (const file of files) {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf-8');
    for (const [oldClass, newClass] of Object.entries(replacements)) {
      content = content.replace(new RegExp(oldClass, 'g'), newClass);
    }
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated ${file}`);
  }
}
