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
  'bg-white border border-slate-200': 'bg-white/60 border border-slate-200/60 backdrop-blur-md shadow-sm',
  'bg-slate-50 border border-slate-200': 'bg-slate-50/60 border border-slate-200/60 backdrop-blur-md shadow-sm',
  'bg-slate-50 border border-slate-100': 'bg-slate-50/60 border border-slate-100/60 backdrop-blur-md shadow-sm',
  'bg-indigo-50 border border-indigo-100': 'bg-indigo-50/60 border border-indigo-100/60 backdrop-blur-md shadow-sm',
  'bg-slate-100': 'bg-slate-100/60 backdrop-blur-md',
  'bg-white border border-slate-200 rounded-xl': 'bg-white/60 border border-slate-200/60 rounded-2xl backdrop-blur-xl shadow-sm',
  'bg-white border border-slate-200 rounded-lg': 'bg-white/60 border border-slate-200/60 rounded-xl backdrop-blur-md shadow-sm',
  'bg-slate-50 p-4 rounded-lg border border-slate-200': 'bg-slate-50/60 p-4 rounded-xl border border-slate-200/60 backdrop-blur-md shadow-sm',
  'bg-indigo-50 p-4 rounded-lg text-sm text-indigo-800': 'bg-indigo-50/60 p-4 rounded-xl text-sm text-indigo-800/90 border border-indigo-100/60 backdrop-blur-md shadow-sm',
  'bg-[#141414]': 'bg-slate-900',
  'bg-emerald-50 border-emerald-300': 'bg-emerald-50/60 border-emerald-200/60 backdrop-blur-md shadow-sm',
  'bg-indigo-50 border-indigo-300': 'bg-indigo-50/60 border-indigo-200/60 backdrop-blur-md shadow-sm',
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
