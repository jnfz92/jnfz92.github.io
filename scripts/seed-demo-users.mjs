#!/usr/bin/env node
// Only demo accounts; use private SUPABASE_SERVICE_ROLE_KEY, never a browser key.
const url=(process.env.SUPABASE_URL||"").replace(/\/$/,""),secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
const password=process.env.EASY_ENGLISH_DEMO_PASSWORD||"123456",tag="easy-english-demo-2026";
if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)||!secret)throw Error("Configure private Supabase service role key");
const persons=[["Lucía","demo_lucia"],["Mario","demo_mario"],["Sara","demo_sara"],["Pablo","demo_pablo"],["Ana","demo_ana"],["Diego","demo_diego"],["Elena","demo_elena"],["Iván","demo_ivan"],["Noa","demo_noa"],["Hugo","demo_hugo"]].map(([name,alias],i)=>({name,alias,email:"easyenglish.demo"+String(i+1).padStart(2,"0")+"@example.com"}));
const topics=["B2 Use of English","Present Perfect","B1 vocabulary","Second Conditional","B2 Writing","Listening","Irregular verbs","Reported Speech","Speaking Part 2","Linkers","B1 Reading","Future forms","Exam practice","Writing a formal email","Grammar revision"];
const examples=["She has lived here for two years.","I have already finished my homework.","Could I have a return ticket, please?","If I had more time, I would read more.","I look forward to hearing from you.","I watched an English series with subtitles.","I bought a book yesterday.","He said he was studying English.","Both pictures show people studying together.","Although it was difficult, I kept trying.","This text is about a student travelling abroad.","We are meeting our tutor tomorrow.","I need to check my answers carefully.","Dear Sir or Madam,","There is a book on the table."];
const pairs=[...Array.from({length:10},(_,i)=>[i,(i+1)%10]),...Array.from({length:5},(_,i)=>[i,i+5])];
async function req(path,method="GET",body,prefer){
 const res=await fetch(url+path,{method,headers:{apikey:secret,Authorization:"Bearer "+secret,Accept:"application/json",...(body?{"Content-Type":"application/json"}:{}),...(prefer?{Prefer:prefer}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const text=await res.text();let json;try{json=text?JSON.parse(text):null}catch{json=text}
 if(!res.ok)throw Error("HTTP "+res.status+" "+path.split("?")[0]+": "+String(json?.message||json?.msg||json?.error||JSON.stringify(json)).slice(0,140));
 return json;
}
const list=(table,params)=>req("/rest/v1/"+table+"?"+new URLSearchParams(params));
const add=(table,data)=>req("/rest/v1/"+table,"POST",data,"return=representation");
const upsert=(table,data)=>req("/rest/v1/"+table+"?on_conflict=usuario_id","POST",data,"resolution=merge-duplicates,return=representation");
async function authUsers(){
 const out=[];for(let p=1;p<=20;p++){const j=await req("/auth/v1/admin/users?page="+p+"&per_page=200"),users=j.users||j;if(!Array.isArray(users))throw Error("Auth API unexpected format");out.push(...users);if(users.length<200)break;}return out;
}
async function main(){
 const known=new Map((await authUsers()).map(u=>[u.email?.toLowerCase(),u])),demo=[];
 for(const p of persons){
  let u=known.get(p.email);
  if(u&&u.user_metadata?.demo_seed!==tag)throw Error("Non-demo email already registered: "+p.email);
  if(!u){const j=await req("/auth/v1/admin/users","POST",{email:p.email,password,email_confirm:true,user_metadata:{name:p.name,demo_seed:tag},app_metadata:{demo_seed:tag}});u=j.user||j;if(!u.id)throw Error("Missing Auth user ID");console.log("Created "+p.alias);}
  await upsert("perfiles",{usuario_id:u.id,nombre:p.name+" (demostración)"});
  await upsert("perfiles_publicos",{usuario_id:u.id,alias:p.alias});
  demo.push({...p,id:u.id});
 }
 const ids=demo.map(p=>p.id),filter="in.("+ids.join(",")+")";
 const requestRows=await list("solicitudes_mensaje",{select:"id,remitente,destinatario,estado",remitente:filter,limit:"1000"});
 const knownRequest=new Map(requestRows.map(r=>[r.remitente+"|"+r.destinatario,r]));
 const existing=await list("mensajes_privados",{select:"remitente,destinatario,contenido",remitente:filter,limit:"1000"});
 const knownMessage=new Set(existing.map(r=>r.remitente+"|"+r.destinatario+"|"+r.contenido));
 for(let i=0;i<pairs.length;i++){
  const [a,b]=pairs[i],one=demo[a],two=demo[b],pair=one.id+"|"+two.id;
  if(!knownRequest.has(pair))await add("solicitudes_mensaje",{remitente:one.id,destinatario:two.id,mensaje_inicial:"[DEMO] ¿Practicamos "+topics[i]+"?",estado:"aceptada",respondido_en:new Date().toISOString()});
  else if(knownRequest.get(pair).estado!=="aceptada")throw Error("Existing demo request is not accepted");
  const messages=[
   [one.id,two.id,"[DEMO] Estoy preparando Cambridge B1/B2. Hoy repaso "+topics[i]+"."],
   [two.id,one.id,"[DEMO] ¡Genial! Vamos a practicar con ejemplos."],
   [one.id,two.id,"[DEMO] Mi ejemplo es: "+examples[i]+" ¿Qué te parece?"],
   [two.id,one.id,"[DEMO] ¡Buen ejemplo! Lo practicaré para el próximo simulacro."]
  ];
  for(let j=0;j<messages.length;j++){
   const [remitente,destinatario,contenido]=messages[j],unique=remitente+"|"+destinatario+"|"+contenido;
   if(knownMessage.has(unique))continue;
   await add("mensajes_privados",{remitente,destinatario,contenido,creado_en:new Date(Date.now()-((pairs.length-i)*60-j*5)*60000).toISOString()});
   knownMessage.add(unique);
  }
 }
 const users=(await authUsers()).filter(u=>u.user_metadata?.demo_seed===tag&&persons.some(p=>p.email===u.email?.toLowerCase()));
 const requests=(await list("solicitudes_mensaje",{select:"destinatario,estado",remitente:filter,limit:"1000"})).filter(r=>ids.includes(r.destinatario)&&r.estado==="aceptada");
 const messages=(await list("mensajes_privados",{select:"destinatario",remitente:filter,limit:"1000"})).filter(r=>ids.includes(r.destinatario));
 console.log("VERIFIED: "+users.length+" users, "+demo.length+" profiles, "+requests.length+" chats, "+messages.length+" messages");
 if(users.length!==10||requests.length<15||messages.length<60)throw Error("Incomplete demo seed");
}
main().catch(e=>{console.error("SEED ERROR: "+e.message);process.exitCode=1});