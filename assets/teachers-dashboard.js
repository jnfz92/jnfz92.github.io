/* Panel del profesor: cursos asignados, alumnos y su progreso. Solo lectura.
   La seguridad real la aplica RLS en Supabase; esta comprobación solo mejora la experiencia. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const db=window.eeDb;
const ALLOWED_ROLES=['profesor','admin','superadmin'];
const DAY=86400000;

function status(message,error=false){const el=$('dashStatus');el.textContent=message;el.hidden=!message;el.classList.toggle('is-error',error)}
function node(tag,text,className){const n=document.createElement(tag);if(text!=null)n.textContent=text;if(className)n.className=className;return n}
function formatDate(value){return value?new Date(value).toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'}):'—'}
function ago(ms){const days=Math.floor(ms/DAY);return days<=0?'Hoy':days===1?'Ayer':'Hace '+days+' días'}

async function init(){
 if(!db){status('No se pudo conectar. Recarga la página.',true);return}
 const {data:auth,error:authError}=await db.auth.getUser();
 if(authError&&authError.name!=='AuthSessionMissingError')throw authError;
 if(!auth?.user){location.replace('/login.html?next='+encodeURIComponent('/dashboard/teachers/'));return}
 const me=auth.user.id;
 const {data:roles,error:rolesError}=await db.from('usuarios_roles').select('rol').eq('usuario_id',me);
 if(rolesError)throw rolesError;
 if(!(roles||[]).some(r=>ALLOWED_ROLES.includes(r.rol))){$('notAllowed').hidden=false;return}
 $('dashboard').hidden=false;
 await load(me);
}

async function load(me){
 status('Cargando tu panel…');
 const [courses,assignments]=await Promise.all([
  db.from('cursos_profesores').select('curso_id, cursos(id,nombre,activo)').eq('profesor_id',me),
  db.from('asignaciones_alumno').select('curso_id, alumno_id, cursos(nombre)').eq('profesor_id',me)
 ]);
 if(courses.error)throw courses.error;
 if(assignments.error)throw assignments.error;

 const courseList=(courses.data||[]).map(r=>r.cursos).filter(Boolean);
 const courseNames=new Map(courseList.map(c=>[c.id,c.nombre]));
 const studentCourses=new Map();
 for(const a of assignments.data||[]){
  if(!studentCourses.has(a.alumno_id))studentCourses.set(a.alumno_id,new Set());
  studentCourses.get(a.alumno_id).add(a.cursos?.nombre||courseNames.get(a.curso_id)||'Curso');
 }
 const ids=[...studentCourses.keys()];
 renderCourses(courseList);
 if(!ids.length){renderStudents([],{});$('statStudents').textContent='0';$('statCourses').textContent=String(courseList.length);$('statInactive').textContent='0';$('statAverage').textContent='—';status('');return}

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

 const students=[...byId.values()].sort((a,b)=>(!a.name)-(!b.name)||(a.name||'').localeCompare(b.name||'','es'));
 const now=Date.now();
 const inactive=students.filter(s=>!s.last||now-s.last>7*DAY).length;
 const scored=students.filter(s=>s.exams>0);
 const average=scored.length?scored.reduce((sum,s)=>sum+s.scoreSum/s.exams,0)/scored.length:null;

 $('statStudents').textContent=String(students.length);
 $('statCourses').textContent=String(courseList.length);
 $('statInactive').textContent=String(inactive);
 $('statAverage').textContent=average==null?'—':average.toFixed(1);
 renderStudents(students,{now});
 status('');
}

function renderCourses(courses){
 const list=$('coursesList');list.replaceChildren();
 if(!courses.length){list.append(node('li','No impartes ningún curso todavía.','td-muted'));return}
 for(const c of courses){
  const li=node('li','',c.activo?'':'td-muted');
  li.append(node('strong',c.nombre),node('span',c.activo?' · activo':' · inactivo','td-muted'));
  list.append(li);
 }
}

function renderStudents(students,{now}){
 const body=$('studentsBody');body.replaceChildren();
 $('studentsEmpty').hidden=students.length>0;
 for(const s of students){
  const tr=document.createElement('tr');
  const nameCell=node('td');
  nameCell.append(node('strong',s.name||'Alumno sin nombre'));
  nameCell.append(node('div',s.id.slice(0,8)+'…','td-muted td-small'));
  tr.append(nameCell,
   node('td',s.courses.join(', ')),
   node('td',String(s.reads)),
   node('td',String(s.exams)),
   node('td',s.exams?(s.scoreSum/s.exams).toFixed(1):'—'),
   node('td',String(s.units)));
  const last=node('td');
  if(s.last){
   last.append(node('div',formatDate(s.last)));
   const days=now-s.last;
   last.append(node('div',ago(days),days>7*DAY?'td-chip td-chip-warn':'td-small td-muted'));
  }else last.append(node('span','Sin actividad','td-chip td-chip-warn'));
  tr.append(last);
  body.append(tr);
 }
}

init().catch(error=>{console.error(error);status('No se pudo cargar el panel: '+(error?.message||error),true)});
})();
