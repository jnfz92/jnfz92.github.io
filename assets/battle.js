/* Vocabulary Battle — salas en vivo (fase 1).
   Todas las decisiones de autorización se verifican en Supabase. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const db=window.eeDb;
let currentUser=null,room=null,players=[],poll=null,busy=false,game=null,answers={},sync=null,tick=null,renderedRound=false,doneScreen=false;
const status=(id,text)=>{$(id).textContent=text;};
const showError=(id,error)=>status(id,error?.message||'No se pudo completar la operación.');
const params=new URLSearchParams(location.search);
const invite=params.get('room')||params.get('code');
if(invite&&/^[A-Z0-9-]{3,30}$/i.test(invite))$('battleCode').value=invite.toUpperCase();
function element(tag,className,text){const x=document.createElement(tag);if(className)x.className=className;if(text!==undefined)x.textContent=text;return x}
function roomLink(){return location.origin+'/battle.html?room='+encodeURIComponent(room.code);}
function setLobbyVisible(){ $('battleLobby').hidden=false; $('battleLobby').scrollIntoView({behavior:'smooth',block:'start'}); }
function renderPlayers(){
 const list=$('lobbyPlayers');list.replaceChildren();
 if(!room)return;
 const isHost=room.host_id===currentUser?.id;
 const visible=isHost?players:players.filter(p=>p.user_id===currentUser?.id);
 const accepted=players.filter(p=>p.status==='accepted').length;
 $('lobbyInfo').textContent=room.level+' · '+room.topic+' · '+room.duration_seconds/60+' min · '+accepted+'/'+room.capacity+' aceptados';
 $('lobbyCode').textContent=room.code;
 $('lobbyHelp').textContent=isHost?'Solo tú puedes aceptar o rechazar participantes. Se admitirán como máximo '+room.capacity+'.':'Tu solicitud necesita la aprobación del anfitrión.';
 $('battleStart').hidden=!isHost;
 $('battleStart').disabled=accepted<2||room.status!=='waiting';
 $('lobbyStatus').textContent=isHost?'Sala creada. Comparte el enlace de invitación.':visible[0]?.status==='accepted'?'¡Admitido! Espera a que el anfitrión inicie la partida.':visible[0]?.status==='rejected'?'Tu solicitud fue rechazada.':'Solicitud enviada. Esperando aprobación.';
 if(!visible.length)list.append(element('p','','No hay solicitudes visibles todavía.'));
 for(const p of visible){
  const card=element('div','battle-player');
  const id=element('div');id.append(element('strong','',p.alias),element('small','',p.status==='accepted'?'Aceptado':p.status==='pending'?'Pendiente de aprobación':'Rechazado'));
  card.append(id);
  if(isHost&&p.status==='pending'){
   const actions=element('div','battle-player-actions');
   for(const [approved,label] of [[true,'Aceptar'],[false,'Rechazar']]){
    const button=element('button',approved?'':'secondary',label);button.type='button';
    button.addEventListener('click',async()=>{
      if(busy)return;busy=true;button.disabled=true;
      try{const {error}=await db.rpc('battle_decide_player',{p_room:room.id,p_user:p.user_id,p_approve:approved});if(error)throw error;await refreshRoom();}
      catch(e){showError('lobbyStatus',e)}finally{busy=false;button.disabled=false}
    });
    actions.append(button);
   }
   card.append(actions);
  }
  list.append(card);
 }
}
async function refreshRoom(){
 if(!room||!currentUser)return;
 if(room.status!=='waiting'){await refreshGame();return;}
 const result=await db.from('battle_rooms').select('id,code,host_id,level,topic,duration_seconds,capacity,status').eq('id',room.id).single();
 if(result.error)throw result.error;
 room=result.data;
 const p=await db.from('battle_players').select('room_id,user_id,alias,status,joined_at').eq('room_id',room.id).order('joined_at');
 if(p.error)throw p.error;players=p.data||[];
 renderPlayers();
 if(room.status==='playing'||room.status==='finished')await refreshGame();
}
async function enterRoom(roomId){
 if(poll)clearInterval(poll);
 room={id:roomId};
 await refreshRoom();setLobbyVisible();
 poll=setInterval(()=>refreshRoom().catch(e=>showError('lobbyStatus',e)),4500);
}
async function init(){
 if(!db){status('authStatus','No se ha podido conectar con Easy English.');return;}
 try{
   const {data:{user},error}=await db.auth.getUser();if(error)throw error;currentUser=user;
   const registered=!!user&&user.is_anonymous!==true;
   status('authStatus',registered?'Sesión iniciada. Puedes crear una sala.':'Necesitas iniciar sesión con una cuenta registrada para crear una sala.');
   $('loginNotice').hidden=registered;
   $('battleCreateForm').hidden=!registered;
   $('battleGuestLogin').hidden=!!user;
   if(!user){status('joinMessage','Puedes entrar con una cuenta o continuar como invitado temporal.');}
 }catch(e){showError('authStatus',e);$('loginNotice').hidden=false}
}
$('battleCreateForm').addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;busy=true;$('battleCreate').disabled=true;
 try{
  const {data:{user},error:authError}=await db.auth.getUser();
  if(authError||!user||user.is_anonymous)throw Error('Es necesario iniciar sesión con una cuenta registrada.');
  const alias=(user.user_metadata?.name||user.email?.split('@')[0]||'Anfitrión').slice(0,30);
  const {data,error}=await db.rpc('battle_create_room',{
   p_level:$('battleLevel').value,p_topic:$('battleTopic').value,
   p_duration:Number($('battleDuration').value),p_capacity:Number($('battleCapacity').value),p_alias:alias.length>=2?alias:'Host'
  });if(error)throw error;
  const record=Array.isArray(data)?data[0]:data;if(!record?.room_id)throw Error('No se recibió el identificador de la sala.');
  status('createMessage','¡Sala creada! Comparte el enlace y admite a los invitados.');
  await enterRoom(record.room_id);
 }catch(error){showError('createMessage',error)}finally{busy=false;$('battleCreate').disabled=false}
});
$('battleGuestLogin').addEventListener('click',async()=>{
  try{
    const {data,error}=await db.auth.signInAnonymously();
    if(error)throw error;
    currentUser=data.user;
    $('battleGuestLogin').hidden=true;
    status('joinMessage','Sesión temporal creada. Escribe tu alias y solicita acceso.');
  }catch(error){status('joinMessage','El acceso temporal aún no está disponible en Supabase. Puedes entrar iniciando sesión desde Perfil. '+(error?.message||''));}
});
$('battleJoinForm').addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;busy=true;
 try{
  const {data:{user},error:authError}=await db.auth.getUser();
  if(authError||!user)throw Error('Inicia sesión para solicitar acceso a la sala.');
  const {data,error}=await db.rpc('battle_join_room',{
   p_code:$('battleCode').value.trim().toUpperCase(),p_alias:$('battleAlias').value.trim()
  });if(error)throw error;
  status('joinMessage','Solicitud registrada.');
  await enterRoom(data);
 }catch(error){showError('joinMessage',error)}finally{busy=false}
});
$('copyBattleLink').addEventListener('click',async()=>{
 if(!room)return;
 const text=roomLink();
 try{await navigator.clipboard.writeText(text);status('lobbyStatus','Enlace copiado. Puedes compartirlo.')}
 catch{status('lobbyStatus','Copia este enlace: '+text)}
});
$('battleRefresh').addEventListener('click',()=>refreshRoom().catch(e=>showError('lobbyStatus',e)));
$('battleStart').addEventListener('click',async()=>{
 if(!room||room.host_id!==currentUser?.id||busy)return;
 busy=true;$('battleStart').disabled=true;
 try{const {error}=await db.rpc('battle_start',{p_room:room.id});if(error)throw error;room.status='playing';await refreshGame();}
 catch(e){showError('lobbyStatus',e)}finally{busy=false;}
});
function buildQuiz(items){
 const wrap=$('gameQuestions');wrap.replaceChildren();
 items.forEach(q=>{
  const field=element('fieldset','battle-question'),legend=element('legend','',q.ordinal+'. '+q.prompt);
  field.append(legend);
  q.options.forEach((option,i)=>{
   const label=element('label','battle-option'),radio=document.createElement('input');
   radio.type='radio';radio.name='battle-q'+q.ordinal;radio.value=String(i);radio.checked=answers[String(q.ordinal)]===String(i);
   radio.disabled=!!game.submitted;
   radio.addEventListener('change',()=>{answers[String(q.ordinal)]=String(i);queueSave()});
   label.append(radio,document.createTextNode(' '+option));field.append(label);
  });
  wrap.append(field);
 });
}
function queueSave(){
 if(sync)clearTimeout(sync);
 sync=setTimeout(async()=>{
  if(!game||game.submitted||game.status!=='playing')return;
  const {error}=await db.rpc('battle_save',{p_room:room.id,p_answers:answers,p_submit:false});
  if(error)showError('gameStatus',error);
 },350);
}
function fmt(ms){return Math.floor(Math.max(0,ms)/60000)+':'+String(Math.floor(Math.max(0,ms)/1000)%60).padStart(2,'0')}
function updateTimer(){
 if(!game||game.status!=='playing')return;
 const remaining=new Date(game.deadline_at).getTime()-Date.now();
 $('gameTimer').textContent='Tiempo restante: '+fmt(remaining);
 if(remaining<=0){$('gameSubmit').disabled=true;$('gameStatus').textContent='Se ha agotado el tiempo. Calculando resultados…';}
}
async function refreshGame(){
 if(!room)return;
 const {data,error}=await db.rpc('battle_state',{p_room:room.id});if(error){showError('lobbyStatus',error);return;}
 game=data;
 if(game.status==='waiting')return;
 $('battleLobby').hidden=true;
 if(game.status==='playing'){
  room.status='playing';$('battleGame').hidden=false;$('battleResults').hidden=true;
  if(!renderedRound){answers=game.answers||{};buildQuiz(game.questions);renderedRound=true;}
  $('gameSubmit').disabled=!!game.submitted;
  $('gameStatus').textContent=game.submitted?'Tus respuestas están entregadas. Esperando a los demás.':'Responde en el orden que prefieras y entrega cuando termines.';
  const ready=Date.now()>=new Date(game.started_at).getTime();
  $('gameSubmit').disabled=!!game.submitted||!ready||Date.now()>=new Date(game.deadline_at).getTime();
  $('gameQuestions').hidden=!!game.submitted||!ready;
  if(!ready)$('gameStatus').textContent='Preparados… La partida comienza en unos segundos.';
  if(game.submitted)doneScreen=true;
  if(!tick)tick=setInterval(updateTimer,400);
  updateTimer();
 }else if(game.status==='finished'){
  room.status='finished';$('battleGame').hidden=true;$('battleResults').hidden=false;
  if(tick){clearInterval(tick);tick=null;}
  renderResults(game);
 }
}
function renderResults(data){
 const board=$('battleRanking');board.replaceChildren();
 (data.ranking||[]).forEach((p,i)=>{
  const row=element('div','battle-player');
  row.append(element('strong','',(i+1)+'. '+p.alias),element('span','',p.score+' puntos · '+fmt(p.elapsed_ms)));
  board.append(row);
 });
 const details=$('battleCorrections');details.replaceChildren();
 (data.questions||[]).forEach(q=>{
  const card=element('div','battle-correction');
  const mine=data.answers?.[String(q.ordinal)];
  card.append(element('strong','',q.ordinal+'. '+q.prompt),element('p','', 'Tu respuesta: '+(mine===undefined?'Sin responder':q.options[Number(mine)])),
    element('p','', 'Correcta: '+q.options[q.correct_index]),element('p','',q.explanation));
  details.append(card);
 });
}
$('gameSubmit').addEventListener('click',async()=>{
 if(!room||!game||game.submitted||busy)return;
 if(!confirm('¿Entregar las respuestas definitivamente?'))return;
 busy=true;$('gameSubmit').disabled=true;
 if(sync){clearTimeout(sync);sync=null;}
 try{const {error}=await db.rpc('battle_save',{p_room:room.id,p_answers:answers,p_submit:true});if(error)throw error;await refreshGame();}
 catch(e){showError('gameStatus',e);$('gameSubmit').disabled=false}
 finally{busy=false}
});
$('battleNewRoom').addEventListener('click',()=>{location.href='/battle.html'});
window.addEventListener('pagehide',()=>{if(poll)clearInterval(poll)});
init();
})();