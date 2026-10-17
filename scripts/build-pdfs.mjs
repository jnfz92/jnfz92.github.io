import fs from "node:fs";

const decode=s=>s
  .replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"')
  .replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">")
  .replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)));

function htmlToText(html){
  return decode(html
    .replace(/<script[\s\S]*?<\/script>/gi," ")
    .replace(/<style[\s\S]*?<\/style>/gi," ")
    .replace(/<br\s*\/?>/gi,"\n")
    .replace(/<\/(p|h1|h2|h3|li|div|section|article)>/gi,"\n")
    .replace(/<li[^>]*>/gi,"• ")
    .replace(/<[^>]+>/g," ")
    .replace(/[ \t]+/g," ")
    .replace(/\n\s*\n\s*\n+/g,"\n\n")
    .trim());
}
function titleOf(html,file){
  const m=html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m?htmlToText(m[1]):file.replace(/\.html$/,"").replace(/-/g," ");
}
function articleText(path){
  const h=htmlByFile.get(path.replace("post/",""));
  const main=(h.match(/<article[^>]*>([\s\S]*?)<\/article>/i)||h.match(/<main[^>]*>([\s\S]*?)<\/main>/i)||[null,h])[1];
  return titleOf(h,path)+"\n\n"+htmlToText(main);
}
function latin(s){return s.normalize("NFKC").replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/[–—]/g,"-").replace(/…/g,"...").replace(/[^\t\n\r -ÿ]/g,"?")}
function esc(s){return s.replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)")}
function wrap(text,n=92){const out=[];for(const raw of text.split(/\r?\n/)){if(!raw.trim()){out.push("");continue}let line="";for(const w of raw.trim().split(/\s+/)){if((line+" "+w).trim().length>n){if(line)out.push(line);line=w}else line=(line+" "+w).trim()}if(line)out.push(line)}return out}
function buildPdf(text,title){
  const lines=wrap(latin(text)); const per=58,pages=[];
  for(let i=0;i<lines.length;i+=per)pages.push(lines.slice(i,i+per));
  const objs=[null]; objs[1]="<< /Type /Catalog /Pages 2 0 R >>";
  const pageIds=[],contentIds=[]; let next=4;
  for(let i=0;i<pages.length;i++){pageIds.push(next++);contentIds.push(next++)}
  objs[2]=`<< /Type /Pages /Kids [${pageIds.map(x=>x+" 0 R").join(" ")}] /Count ${pages.length} >>`;
  objs[3]="<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  pages.forEach((ls,i)=>{
    const pid=pageIds[i],cid=contentIds[i];
    const stream=["BT","/F1 9 Tf","42 800 Td","12 TL",`(${esc(i===0?title:"")}) Tj`,"T*"];
    for(const line of ls)stream.push(`(${esc(line)}) Tj`,"T*");
    stream.push("ET"); const st=stream.join("\n");
    objs[pid]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${cid} 0 R >>`;
    objs[cid]=`<< /Length ${Buffer.byteLength(st,"latin1")} >>\nstream\n${st}\nendstream`;
  });
  let pdf="%PDF-1.4\n",offset=[0];
  for(let i=1;i<objs.length;i++){offset[i]=Buffer.byteLength(pdf,"latin1");pdf+=`${i} 0 obj\n${objs[i]}\nendobj\n`}
  const xref=Buffer.byteLength(pdf,"latin1");
  pdf+=`xref\n0 ${objs.length}\n0000000000 65535 f \n`;
  for(let i=1;i<objs.length;i++)pdf+=String(offset[i]).padStart(10,"0")+" 00000 n \n";
  pdf+=`trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf,"latin1");
}


/* Los artículos, colecciones y entradas de vocabulario provienen de Supabase.
   Esta tarea se ejecuta con GitHub Actions y publica archivos estáticos. */
const API='https://wnluofonzteaqtlfshgy.supabase.co/rest/v1/';
const KEY='sb_publishable_Ef-AXAapcwaPExEFS6kmug_tKLaulM8';
async function load(path) {
  const res=await fetch(API+path,{headers:{apikey:KEY,Accept:'application/json'}});
  if(!res.ok)throw new Error('Supabase '+res.status+': '+path);
  return res.json();
}
const [records,collections,members,vocab]=await Promise.all([
  load('articulos?select=ruta,html&order=ruta.asc&limit=1000'),
  load('colecciones_material?select=id,slug,titulo,tipo,incluir_todos_articulos,nombre_archivo,fecha_publicacion&publicado=eq.true&order=slug.asc&limit=1000'),
  load('coleccion_articulos?select=coleccion_id,articulo_slug,orden&order=orden.asc&limit=1000'),
  load('vocabulario?select=termino_en,traduccion_es,categoria,ejemplo_en,orden&publicado=eq.true&order=orden.asc&limit=1000')
]);
if(records.length<50)throw new Error('Faltan artículos en Supabase: '+records.length);
if(!collections.length)throw new Error('No hay colecciones de PDF publicadas');
const htmlByFile=new Map(records.map(x=>[x.ruta.replace('post/',''),x.html]));
const allPosts=[...htmlByFile.keys()].sort();

function dateLabel(d){
  return d?new Date(d+'T12:00:00').toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'}):'';
}
function buildArticleCollection(c){
  const files=c.incluir_todos_articulos
    ?allPosts
    :members.filter(m=>m.coleccion_id===c.id).sort((a,b)=>a.orden-b.orden)
      .map(m=>m.articulo_slug+'.html').filter(name=>htmlByFile.has(name));
  if(!files.length)throw new Error('Colección sin artículos: '+c.slug);
  return c.titulo+'\n'+dateLabel(c.fecha_publicacion)+'\n\nÍNDICE\n'+
    files.map((name,i)=>(i+1)+'. '+titleOf(htmlByFile.get(name),name)).join('\n')+
    '\n\n'+files.map(name=>articleText('post/'+name)).join('\n\n------------------------------\n\n');
}
function buildVocabCollection(c){
  if(!vocab.length)throw new Error('No hay entradas de vocabulario');
  return c.titulo+'\n'+dateLabel(c.fecha_publicacion)+
    '\n\nEnglish | Español | Category | Example\n'+
    vocab.map(v=>[v.termino_en,v.traduccion_es,v.categoria,v.ejemplo_en||''].join(' | ')).join('\n');
}

fs.mkdirSync('pdfs',{recursive:true});
for(const c of collections){
  if(!/^[\w-]+\.pdf$/.test(c.nombre_archivo))throw new Error('Nombre de archivo PDF inválido');
  const text=c.tipo==='vocabulario'?buildVocabCollection(c):buildArticleCollection(c);
  const file='pdfs/'+c.nombre_archivo;
  fs.writeFileSync(file,buildPdf(text,c.titulo));
  console.log('built',file,fs.statSync(file).size,'bytes');
}
