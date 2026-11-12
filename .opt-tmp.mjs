import { createOptimizer } from '@qwik.dev/core/optimizer';
import fs from 'node:fs';
const o = await createOptimizer();
const code = fs.readFileSync('src/components/sounds/sound-library.tsx','utf8');
for (const mode of ['dev']) {
const r = await o.transformModules({ input:[{path:'components/sounds/sound-library.tsx', code}], srcDir: process.cwd()+'/src', rootDir: process.cwd(), entryStrategy:{type:'segment'}, minify:'none', transpileTs:true, transpileJsx:true, explicitExtensions:true, preserveFilenames:true, mode, isServer:true });
for (const m of r.modules) { if (m.code.includes('audio')) { console.log('=== '+m.path); console.log(m.code.split('\n').filter(l=>/audio|attempt|_jsx|ref/.test(l)).join('\n').slice(0,6000)); } }
console.log(r.diagnostics);
}
