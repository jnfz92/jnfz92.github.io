import { createClient } from "npm:@supabase/supabase-js@2.57.0";

// Newsletter: double opt-in, consent-driven unsubscribe, daily delivery.
// All database access happens server-side with the project service-role key.
const BASE="https://jnfz92.github.io";
const ORIGIN="https://jnfz92.github.io";
const jsonHeaders={
  "Content-Type":"application/json; charset=utf-8",
  "Cache-Control":"no-store",
  "Access-Control-Allow-Origin":ORIGIN,
  "Access-Control-Allow-Headers":"content-type, apikey, authorization, x-newsletter-cron-secret",
  "Access-Control-Allow-Methods":"GET, POST, OPTIONS"
};
const reply=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:jsonHeaders});
const setting=(name:string)=>Deno.env.get(name)?.trim()||"";
const ready=()=>setting("NEWSLETTER_ENABLED")==="true"&&
  !!setting("RESEND_API_KEY")&&!!setting("NEWSLETTER_FROM")&&
  !!setting("NEWSLETTER_LINK_SECRET")&&!!setting("NEWSLETTER_CRON_SECRET");
const db=()=>{
  const url=setting("SUPABASE_URL"),secret=setting("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!secret)throw new Error("Supabase no configurado");
  return createClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false}});
};
const encode=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const digest=async(text:string)=>{
  const arr=new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text)));
  return [...arr].map(x=>x.toString(16).padStart(2,"0")).join("");
};
const token=()=>encode(crypto.getRandomValues(new Uint8Array(32)));
const validEmail=(email:string)=>email.length<=254&&/^[^\s@<>]{1,64}@[^\s@<>]+\.[^\s@<>]+$/.test(email);
const escaped=(str:string)=>str.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]||c));
const sign=async(id:string)=>{
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(setting("NEWSLETTER_LINK_SECRET")),
    {name:"HMAC",hash:"SHA-256"},false,["sign"]);
  return encode(new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode("baja:"+id))));
};
const equal=(a:string,b:string)=>{
  if(a.length!==b.length)return false;
  let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
};
async function send(to:string,subject:string,html:string,plain:string,key:string){
  const response=await fetch("https://api.resend.com/emails",{
    method:"POST",
    headers:{"Authorization":"Bearer "+setting("RESEND_API_KEY"),
      "Content-Type":"application/json","Idempotency-Key":key},
    body:JSON.stringify({from:setting("NEWSLETTER_FROM"),to:[to],subject,html,text:plain})
  });
  if(!response.ok){
    // Never write email addresses or API keys to logs.
    throw new Error("Error del proveedor de correo (HTTP "+response.status+")");
  }
  const result=await response.json().catch(()=>({}));
  return typeof result.id==="string"?result.id:"";
}
async function subscribe(email:string){
  const client=db(),now=new Date();
  const {data:existing,error:readError}=await client.from("newsletter_suscriptores")
    .select("id,estado,ultimo_intento_en").eq("email",email).maybeSingle();
  if(readError)throw readError;
  // Avoid account enumeration and rapid repeated confirmation emails.
  if(existing?.estado==="activo"||
    (existing?.ultimo_intento_en&&Date.now()-new Date(existing.ultimo_intento_en).getTime()<15*60*1000))
    return;
  const secretToken=token();
  const values={
    email,estado:"pendiente",confirmar_hash:await digest(secretToken),
    confirmar_hasta:new Date(now.getTime()+48*60*60*1000).toISOString(),
    ultimo_intento_en:now.toISOString(),baja_en:null,confirmado_en:null,
    ultimo_envio_en:null,ultimo_envio_dia:null
  };
  let result;
  if(existing){
    result=await client.from("newsletter_suscriptores").update(values).eq("id",existing.id);
  }else{
    result=await client.from("newsletter_suscriptores").insert(values);
  }
  if(result.error){
    if(result.error.code==="23505")return;
    throw result.error;
  }
  const link=BASE+"/newsletter.html#confirm="+encodeURIComponent(secretToken);
  const html='<main style="font:16px/1.6 Arial,sans-serif;max-width:600px;margin:auto">'+
    '<h1 style="color:#176447">Confirma tu suscripción a Easy English</h1>'+
    '<p>Has solicitado recibir un resumen diario de los artículos nuevos.</p>'+
    '<p><a href="'+link+'" style="background:#176447;color:#fff;padding:13px 18px;border-radius:10px;display:inline-block">Confirmar mi correo</a></p>'+
    '<p>El enlace caduca en 48 horas. Si no lo solicitaste, ignora este mensaje.</p></main>';
  try{
    await send(email,"Confirma tu newsletter de Easy English",html,
      "Confirma tu suscripción en: "+link+"\nSi no la solicitaste, ignora este mensaje.",
      "ee-confirm-"+values.confirmar_hash.slice(0,32));
  }catch(error){
    // Allow the person to retry if the provider is temporarily unavailable.
    await client.from("newsletter_suscriptores").update({ultimo_intento_en:null})
      .eq("email",email).eq("confirmar_hash",values.confirmar_hash);
    throw error;
  }
}
async function confirm(value:string){
  if(value.length>200||!value)return false;
  const hash=await digest(value),client=db();
  const {data,error}=await client.from("newsletter_suscriptores")
    .select("id,estado,confirmar_hasta")
    .eq("confirmar_hash",hash).maybeSingle();
  if(error)throw error;
  if(!data||data.estado!=="pendiente"||new Date(data.confirmar_hasta).getTime()<Date.now())return false;
  const {error:updateError}=await client.from("newsletter_suscriptores")
    .update({estado:"activo",confirmado_en:new Date().toISOString(),
      confirmar_hash:null,confirmar_hasta:null,ultimo_envio_dia:null,ultimo_envio_en:null})
    .eq("id",data.id).eq("confirmar_hash",hash);
  if(updateError)throw updateError;
  return true;
}
async function unsubscribe(id:string,signature:string){
  if(!/^[0-9a-f-]{36}$/i.test(id)||signature.length>200)return false;
  if(!equal(await sign(id),signature))return false;
  const {error}=await db().from("newsletter_suscriptores").update({
    estado:"baja",baja_en:new Date().toISOString(),confirmar_hash:null,confirmar_hasta:null
  }).eq("id",id);
  if(error)throw error;
  return true;
}
type Article={slug:string;titulo:string;descripcion:string|null;newsletter_publicado_en:string};
function emailDigest(articles:Article[],id:string,signature:string){
  const url=BASE+"/newsletter.html#baja="+encodeURIComponent(id)+"."+encodeURIComponent(signature);
  const items=articles.map(a=>{
    const link=BASE+"/leer.html?slug="+encodeURIComponent(a.slug);
    return '<li style="margin:0 0 22px"><a style="font-size:18px;font-weight:bold;color:#176447" href="'+link+'">'+
      escaped(a.titulo)+'</a><p style="margin:4px 0 0;color:#43584b">'+
      escaped((a.descripcion||"").slice(0,190))+'</p></li>';
  }).join("");
  const html='<div style="font-family:Arial,sans-serif;max-width:630px;margin:auto;color:#193a2a">'+
    '<h1 style="color:#176447">Easy English · Tus artículos nuevos</h1>'+
    '<p>Este es tu resumen de las publicaciones recientes.</p><ul style="padding-left:22px">'+items+'</ul>'+
    '<hr><p style="font-size:13px;color:#52695c">Te has suscrito voluntariamente al newsletter diario. '+
    '<a href="'+url+'">Darme de baja</a></p></div>';
  const plain="Easy English — artículos nuevos\n\n"+
    articles.map(a=>a.titulo+"\n"+BASE+"/leer.html?slug="+encodeURIComponent(a.slug)).join("\n\n")+
    "\n\nDarme de baja: "+url;
  return {html,plain};
}
async function dispatch(){
  const client=db(),now=new Date(),day=now.toISOString().slice(0,10);
  const {data:subscribers,error}=await client.from("newsletter_suscriptores")
    .select("id,email,confirmado_en,ultimo_envio_en,ultimo_envio_dia")
    .eq("estado","activo").or("ultimo_envio_dia.is.null,ultimo_envio_dia.lt."+day)
    .order("confirmado_en",{ascending:true}).limit(45);
  if(error)throw error;
  const result={examined:0,sent:0,withoutArticles:0,failed:0};
  for(const subscriber of subscribers||[]){
    result.examined++;
    try{
      const since=subscriber.ultimo_envio_en||subscriber.confirmado_en;
      if(!since)continue;
      const {data:articles,error:articleError}=await client.from("articulos")
        .select("slug,titulo,descripcion,newsletter_publicado_en")
        .gt("newsletter_publicado_en",since)
        .lte("newsletter_publicado_en",now.toISOString())
        .order("newsletter_publicado_en",{ascending:true}).limit(80);
      if(articleError)throw articleError;
      if(!articles?.length){
        const {error:markError}=await client.from("newsletter_suscriptores")
          .update({ultimo_envio_dia:day}).eq("id",subscriber.id).eq("estado","activo");
        if(markError)throw markError;
        result.withoutArticles++;continue;
      }
      const {data:previous,error:previousError}=await client.from("newsletter_envios")
        .select("id,estado").eq("suscriptor_id",subscriber.id).eq("dia",day).maybeSingle();
      if(previousError)throw previousError;
      if(previous?.estado==="enviado")continue;
      if(!previous){
        const {error:logError}=await client.from("newsletter_envios")
          .insert({suscriptor_id:subscriber.id,dia:day,
            articulos:articles.map((a:Article)=>a.slug),estado:"pendiente"});
        if(logError)throw logError;
      }
      const signature=await sign(subscriber.id),message=emailDigest(articles,subscriber.id,signature);
      const providerId=await send(subscriber.email,
        "Easy English · "+articles.length+" artículo"+(articles.length===1?" nuevo":"s nuevos"),
        message.html,message.plain,"ee-daily-"+subscriber.id+"-"+day);
      const {error:sentError}=await client.from("newsletter_envios")
        .update({estado:"enviado",finalizado_en:new Date().toISOString(),proveedor_id:providerId,error:null})
        .eq("suscriptor_id",subscriber.id).eq("dia",day);
      if(sentError)throw sentError;
      const {error:markError}=await client.from("newsletter_suscriptores")
        .update({ultimo_envio_dia:day,ultimo_envio_en:now.toISOString()})
        .eq("id",subscriber.id).eq("estado","activo");
      if(markError)throw markError;
      result.sent++;
    }catch(error){
      result.failed++;
      // Log generic error only, never subscriber addresses.
      console.error("Newsletter delivery failed:",String(error).slice(0,170));
    }
  }
  return result;
}
Deno.serve(async(request:Request)=>{
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:jsonHeaders});
  if(request.method==="GET")return reply(200,{enabled:ready()});
  if(request.method!=="POST")return reply(405,{error:"Método no permitido"});
  let body:Record<string,unknown>={};
  try{
    if(Number(request.headers.get("content-length")||"0")>1500)return reply(413,{error:"Solicitud demasiado grande"});
    body=await request.json();
  }catch{return reply(400,{error:"Solicitud inválida"});}
  const action=String(body.action||"");
  if(action==="dispatch"){
    const provided=request.headers.get("x-newsletter-cron-secret")||"";
    if(!setting("NEWSLETTER_CRON_SECRET")||!equal(provided,setting("NEWSLETTER_CRON_SECRET")))
      return reply(401,{error:"No autorizado"});
    if(!ready())return reply(503,{error:"Envío no configurado"});
    try{return reply(200,{ok:true,...await dispatch()});}
    catch(error){console.error("Newsletter dispatch error:",String(error).slice(0,150));return reply(500,{error:"Error de envío"});}
  }
  if(!["subscribe","confirm","unsubscribe"].includes(action))return reply(400,{error:"Acción desconocida"});
  if(!ready())return reply(503,{error:"El newsletter todavía no está disponible."});
  try{
    if(action==="subscribe"){
      const email=String(body.email||"").trim().toLowerCase();
      if(!validEmail(email))return reply(400,{error:"Escribe una dirección de correo válida"});
      await subscribe(email);
      return reply(200,{ok:true,message:"Si la dirección es válida y no estaba suscrita, recibirás un enlace de confirmación."});
    }
    if(action==="confirm"){
      const ok=await confirm(String(body.token||""));
      return reply(ok?200:400,ok?{ok:true}:{error:"El enlace no es válido o ha caducado"});
    }
    const ok=await unsubscribe(String(body.id||""),String(body.token||""));
    return reply(ok?200:400,ok?{ok:true}:{error:"El enlace de baja no es válido"});
  }catch(error){
    console.error("Newsletter request error:",String(error).slice(0,150));
    return reply(503,{error:"No se ha podido completar la solicitud. Inténtalo más tarde."});
  }
});
