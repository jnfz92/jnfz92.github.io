
/* Contrast audit of all static pages and all publicly readable Supabase articles.
   Read-only: never sends form submissions or writes to Supabase. */
'use strict';
const { chromium } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const fs = require('node:fs');
const path = require('node:path');
const BASE = 'https://jnfz92.github.io';
const API = 'https://wnluofonzteaqtlfshgy.supabase.co/rest/v1/';
const APIKEY = 'sb_publishable_Ef-AXAapcwaPExEFS6kmug_tKLaulM8';
const ROOT = path.resolve(__dirname, '..');
const pages = fs.readdirSync(ROOT).filter(x=>x.endsWith('.html'));
const categories = fs.readdirSync(path.join(ROOT,'category')).filter(x=>x.endsWith('.html')).map(x=>'category/'+x);
const statics = [...pages,...categories];
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
// PRs audit the deployed site; pages introduced in the PR do not exist there yet.
const isPullRequest=process.env.GITHUB_EVENT_NAME==='pull_request';
const unpublished=[];

async function getSlugs(){
  const response=await fetch(API+'articulos?select=slug&order=slug.asc&limit=1000',{headers:{apikey:APIKEY}});
  if(!response.ok)throw Error('Supabase catalog HTTP '+response.status);
  const data=await response.json();
  if(data.length<140)throw Error('Article list suspiciously incomplete: '+data.length);
  return data.map(x=>x.slug);
}

async function main(){
 const slugs=await getSlugs();
 const tasks=[
  ...statics.map(p=>({url:BASE+'/'+p,page:p,viewport:'desktop'})),
  ...statics.map(p=>({url:BASE+'/'+p,page:p,viewport:'mobile'})),
  ...slugs.map(slug=>({url:BASE+'/leer.html?slug='+encodeURIComponent(slug),page:'article:'+slug,viewport:'desktop'}))
 ];
 const b=await chromium.launch({headless:true});
 const results=[];let next=0;
 async function run(id){
  const context=await b.newContext({viewport:{width:1440,height:900},isMobile:false});
  const page=await context.newPage();
  while(next<tasks.length){
   const index=next++;const task=tasks[index]; const one={page:task.page,viewport:task.viewport,url:task.url,issues:[],incomplete:0};
   try{
    await page.setViewportSize(task.viewport==='mobile'?{width:390,height:844}:{width:1440,height:900});
    const response=await page.goto(task.url,{waitUntil:'domcontentloaded',timeout:25000});
    if(response&&response.status()===404&&isPullRequest&&task.page.endsWith('.html')&&!task.page.startsWith('article:')){unpublished.push(task.page);continue;}
    if(response&&response.status()>=400)throw Error('HTTP '+response.status());
    if(task.page.startsWith('article:')){
      await page.waitForFunction(()=>!document.querySelector('#loading'),{timeout:19000});
    }
    await page.waitForTimeout(200);
    const report=await new AxeBuilder({page}).withRules(['color-contrast']).analyze();
    for(const v of report.violations)for(const node of v.nodes){
      const check=[...(node.any||[]),...(node.all||[])].find(x=>x.id==='color-contrast');
      one.issues.push({
       selector:node.target?.join(', ')||'',
       html:(node.html||'').slice(0,270),
       summary:(node.failureSummary||'').slice(0,350),
       fg:check?.data?.fgColor||null,
       bg:check?.data?.bgColor||null,
       ratio:check?.data?.contrastRatio||null,
       expected:check?.data?.expectedContrastRatio||null
      });
    }
    one.incomplete=report.incomplete.filter(v=>v.id==='color-contrast').reduce((n,v)=>n+v.nodes.length,0);
   }catch(e){one.error=String(e?.message||e).slice(0,400);}
   results.push(one);
   if(one.issues.length||one.error)console.log('ISSUE '+JSON.stringify({page:one.page,viewport:one.viewport,n:one.issues.length,error:one.error||null,examples:one.issues.slice(0,4)}));
   if((index+1)%30===0)console.log('PROGRESS '+(index+1)+'/'+tasks.length);
  }
  await context.close();
 }
 try{await Promise.all(Array.from({length:4},(_,i)=>run(i)));}finally{await b.close();}
 const summary={unpublished_pr_pages:[...new Set(unpublished)],
  scanned:results.length, expected:tasks.length, articles:slugs.length,
  static_pages:statics.length,
  failures:results.reduce((n,r)=>n+r.issues.length,0),
  affected:results.filter(r=>r.issues.length).length,
  errors:results.filter(r=>r.error).length,
  incomplete:results.reduce((n,r)=>n+r.incomplete,0),
  byPage:results.filter(r=>r.issues.length||r.error).map(r=>({page:r.page,viewport:r.viewport,count:r.issues.length,error:r.error||null})),
 };
 fs.mkdirSync('reports',{recursive:true});
 fs.writeFileSync('reports/contrast-audit.json',JSON.stringify({summary,results},null,2)+'\n');
 console.log('FINAL_SUMMARY '+JSON.stringify(summary));
 if(summary.errors)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
