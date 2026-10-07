import fs from "node:fs";
import zlib from "node:zlib";
import vm from "node:vm";

const html=fs.readFileSync("downloads.html","utf8");
const m=html.match(/const docs=(\{[\s\S]*?\});\s*async function gunzip/);
if(!m) throw new Error("Could not find docs object in downloads.html");
const docs=vm.runInNewContext("(" + m[1] + ")");

function latin(s){return s.normalize("NFKC").replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/[–—]/g,"-").replace(/…/g,"...").replace(/[^\t\n\r -ÿ]/g,"?")}
function esc(s){return s.replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)")}
function wrap(text,n=92){const out=[];for(const raw of text.split(/\r?\n/)){if(!raw.trim()){out.push("");continue}let line="";for(const w of raw.trim().split(/\s+/)){if((line+" "+w).trim().length>n){out.push(line);line=w}else line=(line+" "+w).trim()}if(line)out.push(line)}return out}
function buildPdf(text,title){
  const lines=wrap(latin(text)); const per=58,pages=[];
  for(let i=0;i<lines.length;i+=per) pages.push(lines.slice(i,i+per));
  const objs=[null]; objs[1]="<< /Type /Catalog /Pages 2 0 R >>";
  const pageIds=[],contentIds=[]; let next=4;
  for(let i=0;i<pages.length;i++){pageIds.push(next++);contentIds.push(next++)}
  objs[2]=`<< /Type /Pages /Kids [${pageIds.map(x=>x+" 0 R").join(" ")}] /Count ${pages.length} >>`;
  objs[3]="<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  pages.forEach((ls,i)=>{
    const pid=pageIds[i],cid=contentIds[i];
    const stream=["BT","/F1 9 Tf","42 800 Td","12 TL",`(${esc(i===0?title:"")}) Tj`,"T*"];
    for(const line of ls) stream.push(`(${esc(line)}) Tj`,"T*");
    stream.push("ET"); const s=stream.join("\n");
    objs[pid]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${cid} 0 R >>`;
    objs[cid]=`<< /Length ${Buffer.byteLength(s,"latin1")} >>\nstream\n${s}\nendstream`;
  });
  let pdf="%PDF-1.4\n",offset=[0];
  for(let i=1;i<objs.length;i++){offset[i]=Buffer.byteLength(pdf,"latin1");pdf+=`${i} 0 obj\n${objs[i]}\nendobj\n`}
  const xref=Buffer.byteLength(pdf,"latin1");
  pdf+=`xref\n0 ${objs.length}\n0000000000 65535 f \n`;
  for(let i=1;i<objs.length;i++) pdf+=String(offset[i]).padStart(10,"0")+" 00000 n \n";
  pdf+=`trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf,"latin1");
}
fs.mkdirSync("pdfs",{recursive:true});
for(const key of ["blog","notes","vocab"]){
  const d=docs[key]; if(!d) throw new Error("Missing "+key);
  const text=d.text ?? zlib.gunzipSync(Buffer.from(d.data,"base64")).toString("utf8");
  fs.writeFileSync("pdfs/"+d.name,buildPdf(text,d.title));
  console.log("built",d.name);
}
