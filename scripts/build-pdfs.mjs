import fs from "node:fs";
import vm from "node:vm";

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
  const h=fs.readFileSync(path,"utf8");
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

const allPosts=fs.readdirSync("post").filter(x=>x.endsWith(".html")).sort();
const blogText="Easy English · Artículos del blog\n1 October 2026\n\nÍNDICE\n"+
  allPosts.map((x,i)=>`${i+1}. ${titleOf(fs.readFileSync("post/"+x,"utf8"),x)}`).join("\n")+
  "\n\n"+allPosts.map(x=>articleText("post/"+x)).join("\n\n------------------------------\n\n");

const noteFiles=[
"get-phrasal-verbs.html","future-going-to-present-continuous.html","present-perfect-vs-past-simple.html",
"english-tenses-overview.html","countable-uncountable-nouns.html","gerund-infinitive.html",
"stative-verbs.html","skimming-scanning-reading.html","useful-vocabulary-review.html",
"dictionary-word-reference-study.html","pollution-environment-vocabulary.html"
];
const notesText="English Study Notes\n6 October 2026\n\n"+
  noteFiles.filter(x=>fs.existsSync("post/"+x)).map(x=>articleText("post/"+x)).join("\n\n------------------------------\n\n");

const downloads=fs.readFileSync("downloads.html","utf8");
const dm=downloads.match(/const docs=(\{[\s\S]*?\});\s*async function gunzip/);
let vocabText="English Vocabulary List\n6 October 2026";
if(dm){const docs=vm.runInNewContext("("+dm[1]+")");if(docs.vocab?.text)vocabText=docs.vocab.text}

fs.mkdirSync("pdfs",{recursive:true});
const outputs=[
 ["easy_english_articulos_01-10-2026.pdf",blogText,"Easy English - Artículos del blog"],
 ["english_apuntes_articulos_06-10-2026.pdf",notesText,"English Study Notes - 6 oct 2026"],
 ["vocabulary_list_06-10-2026.pdf",vocabText,"English Vocabulary List - 6 oct 2026"]
];
for(const [name,text,title] of outputs){
  fs.writeFileSync("pdfs/"+name,buildPdf(text,title));
  console.log("built",name,fs.statSync("pdfs/"+name).size,"bytes");
}