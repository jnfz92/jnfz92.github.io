/* Panel del profesor: resumen, cursos y alumnos con su progreso. Solo lectura.
   La seguridad real la aplica RLS en Supabase; esta comprobación solo mejora la experiencia. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const db=window.eeDb;
const ALLOWED_ROLES=['profesor','admin','superadmin'];
const DAY=86400000;
const SECTIONS={resumen:'Resumen',cursos:'Mis cursos',alumnos:'Alumnos'};
let students=[];

function status(message,error=false){const el=$('dashStatus');el.textContent=message;el.hidden=!message;el.classList.toggle('is-error',error)}
function node(tag,text,className){const n=document.createElement(tag);if(text!=null)n.textContent=text;if(className)n.className=className;return n}
function formatDate(value){return value?new Date(value).toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'}):'—'}
function ago(ms){const days=Math.floor(ms/DAY);return days<=0?'Hoy':days===1?'Ayer':'Hace '+days+' días'}

function showSection(name){
 if(!SECTIONS[name])name='resumen';
 document.querySelectorAll('[data-panel]').forEach(s=>{s.hidden=s.dataset.panel!==name});
 document.querySelectorAll('.td-nav-btn').forEach(b=>{const on=b.dataset.section===name;on?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current')});
 $('pageTitle').textContent=SECTIONS[name];
}

async function init(){
 document.querySelectorAll('[data-section]').forEach(b=>b.addEventListener('click',()=>showSection(b.dataset.section)));
 document.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click',()=>showSection(b.dataset.goto)));
 $('studentSearch').addEventListener('input',()=>renderStudents());
 showSection('resumen');
 if(!db){status('No se pudo conectar. Recarga la página.',true);return}
 const {data:auth,error:authError}=await db.auth.getUser();
 if(authError&&authError.name!=='AuthSessionMissingError')throw authError;
 if(!auth?.user){location.replace('/login.html?next='+encodeURIComponent('/dashboard/teachers/'));return}
 const me=auth.user.id;
 $('userLabel').textContent=auth.user.email||'';
 const {data:roles,error:rolesError}=await db.from('usuarios_roles').select('rol').eq('usuario_id',me);
 if(rolesError)throw rolesError;
 if(!(roles||[]).some(r=>ALLOWED_ROLES.includes(r.rol))){$('notAllowed').hidden=false;return}
 $('dashboard').hidden=false;
 await load(me);
}

async function load(me){
 status('Cargando tu panel…');
 // Consultas separadas, sin embeds: cursos_profesores y cursos tienen dos caminos de relación
 // (FK directo y el que pasa por asignaciones_alumno) y PostgREST no sabe cuál usar.
 const [teaching,assignments]=await Promise.all([
  db.from('cursos_profesores').select('curso_id').eq('profesor_id',me),
  db.from('asignaciones_alumno').select('curso_id, alumno_id').eq('profesor_id',me)
 ]);
 if(teaching.error)throw teaching.error;
 if(assignments.error)throw assignments.error;
 const courseIds=[...new Set([...(teaching.data||[]).map(r=>r.curso_id),...(assignments.data||[]).map(r=>r.curso_id)])];
 let courseList=[];
 if(courseIds.length){
  const {data,error}=await db.from('cursos').select('id,nombre,activo').in('id',courseIds).order('nombre');
  if(error)throw error;
  courseList=data||[];
 }
 const courseNames=new Map(courseList.map(c=>[c.id,c.nombre]));
 const studentCourses=new Map();
 for(const a of assignments.data||[]){
  if(!studentCourses.has(a.alumno_id))studentCourses.set(a.alumno_id,new Set());
  studentCourses.get(a.alumno_id).add(courseNames.get(a.curso_id)||'Curso');
 }
 const ids=[...studentCourses.keys()];
 const studentsByCourse=new Map();
 for(const a of assignments.data||[]){if(!studentsByCourse.has(a.curso_id))studentsByCourse.set(a.curso_id,new Set());studentsByCourse.get(a.curso_id).add(a.alumno_id)}
 renderCourses(courseList,studentsByCourse);
 $('statCourses').textContent=String(courseList.length);
 if(!ids.length){
  students=[];
  renderStudents();renderSummary();
  status('');
  return;
 }

 const [names,lecturas,resultados,actividad,progreso]=await Promise.all([
  db.from('perfiles').select('usuario_id,nombre').in('usuario_id',ids),
  db.from('lecturas').select('usuario_id,leido_en').in('usuario_id',ids),
  db.from('resultados').select('usuario_id,nota,fecha').in('usuario_id',ids),
  db.from('actividad_diaria').select('usuario_id,dia').in('usuario_id',ids),
  db.from('progreso_curso').select('usuario_id,estado').in('usuario_id',ids).eq('estado','completada')
 ]);
 for(const r of [names,lecturas,resultados,actividad,progreso])if(r.error)throw r.error;

 const byId=new Map(ids.map(id=>[id,{id,name:null,courses:[...studentCourses.get(id)].sort(),reads:0,exams:0,scoreSum:0,units:0,last:0}]));
 for(const p of names.data||[]){const s=byId.get(p.usuario_id);if(s&&p.nombre)s.name=p.nombre}
 for(const l of lecturas.data||[]){const s=byId.get(l.usuario_id);if(!s)continue;s.reads++;s.last=Math.max(s.last,Date.parse(l.leido_en)||0)}
 for(const r of resultados.data||[]){const s=byId.get(r.usuario_id);if(!s)continue;s.exams++;s.scoreSum+=Number(r.nota)||0;s.last=Math.max(s.last,Date.parse(r.fecha)||0)}
 for(const d of actividad.data||[]){const s=byId.get(d.usuario_id);if(!s)continue;s.last=Math.max(s.last,Date.parse(d.dia)||0)}
 for(const p of progreso.data||[]){const s=byId.get(p.usuario_id);if(s)s.units++}

 students=[...byId.values()].sort((a,b)=>(!a.name)-(!b.name)||(a.name||'').localeCompare(b.name||'','es'));
 renderSummary();
 renderStudents();
 status('');
}

function renderSummary(){
 const now=Date.now();
 const inactive=students.filter(s=>!s.last||now-s.last>7*DAY);
 const scored=students.filter(s=>s.exams>0);
 const average=scored.length?scored.reduce((sum,s)=>sum+s.scoreSum/s.exams,0)/scored.length:null;
 $('statStudents').textContent=String(students.length);
 $('statInactive').textContent=String(inactive.length);
 $('statAverage').textContent=average==null?'—':average.toFixed(1);

 const list=$('attentionList');list.replaceChildren();
 for(const s of inactive.slice(0,8)){
  const li=node('li','','td-list-item');
  li.append(node('strong',s.name||'Alumno sin nombre'),node('span',s.last?'Última actividad: '+ago(now-s.last).toLowerCase():'Sin actividad registrada','td-chip td-chip-warn'));
  list.append(li);
 }
 $('attentionEmpty').hidden=inactive.length>0;
}

function renderCourses(courses,studentsByCourse){
 const grid=$('coursesGrid');grid.replaceChildren();
 $('coursesEmpty').hidden=courses.length>0;
 for(const c of courses){
  const card=node('article','','td-course');
  const count=(studentsByCourse.get(c.id)||new Set()).size;
  card.append(node('h3',c.nombre),
   node('span',c.activo?'Activo':'Inactivo',c.activo?'td-chip':'td-chip td-chip-muted'),
   node('p',count+(count===1?' alumno asignado':' alumnos asignados'),'td-small td-muted'));
  grid.append(card);
 }
}

function renderStudents(){
 const q=($('studentSearch').value||'').trim().toLowerCase();
 const rows=students.filter(s=>!q||(s.name||'').toLowerCase().includes(q)||s.courses.some(c=>c.toLowerCase().includes(q)));
 const body=$('studentsBody');body.replaceChildren();
 $('studentsEmpty').hidden=rows.length>0;
 const now=Date.now();
 for(const s of rows){
  const tr=document.createElement('tr');
  const nameCell=node('td');
  nameCell.append(node('strong',s.name||'Alumno sin nombre'),node('div',s.id.slice(0,8)+'…','td-muted td-small'));
  const last=node('td');
  if(s.last){
   last.append(node('div',formatDate(s.last)));
   const days=now-s.last;
   last.append(node('div',ago(days),days>7*DAY?'td-chip td-chip-warn':'td-small td-muted'));
  }else last.append(node('span','Sin actividad','td-chip td-chip-warn'));
  tr.append(nameCell,
   node('td',s.courses.join(', ')),
   node('td',String(s.reads)),
   node('td',String(s.exams)),
   node('td',s.exams?(s.scoreSum/s.exams).toFixed(1):'—'),
   node('td',String(s.units)),
   last);
  body.append(tr);
 }
}

init().catch(error=>{console.error(error);status('No se pudo cargar el panel: '+(error?.message||error),true)});
})();
