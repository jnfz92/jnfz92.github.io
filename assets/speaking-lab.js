(()=>{'use strict';
const $=id=>document.getElementById(id);
const prompts={
A1:{conversation:['What is your name and where do you live?','Describe your family.','What food do you like?'],pronunciation:['My name is Alex and I live in Spain.','I would like a cup of tea, please.'],cambridge:['Introduce yourself and talk about your daily routine.']},
A2:{conversation:['Tell me about your last holiday.','Describe your favourite place in your town.'],pronunciation:['Yesterday I visited my grandparents.','Could you tell me where the station is?'],cambridge:['Describe what you like to do at weekends.']},
B1:{conversation:['Tell me about your typical weekend.','What are the advantages of learning English?','Describe a memorable trip.'],pronunciation:['I have been learning English for three years.','If I had more time, I would travel abroad.'],cambridge:['Describe a photo of people studying together. What might they be feeling?']},
B2:{conversation:['Should teenagers spend less time on social media? Explain your opinion.','Discuss the advantages and disadvantages of remote work.'],pronunciation:['Although the weather was terrible, we thoroughly enjoyed the journey.','I would rather work collaboratively than independently.'],cambridge:['Compare studying online and in a classroom. Which is more effective and why?']},
C1:{conversation:['To what extent does technology influence our personal relationships?','How can cities balance economic growth and sustainability?'],pronunciation:['The thoroughly thought-provoking theory challenged conventional wisdom.'],cambridge:['Evaluate the long-term consequences of artificial intelligence in education.']}
};
let index=0,recorder=null,stream=null,chunks=[],url=null,started=0,timer=null;
function prompt(){const pool=prompts[$('speakingLevel').value][$('speakingMode').value];$('speakingPrompt').textContent=pool[index%pool.length]}
function status(message){$('speakingStatus').textContent=message}
function revoke(){if(url){URL.revokeObjectURL(url);url=null}const audio=$('recordingPlayback');audio.pause();audio.removeAttribute('src');audio.load();audio.hidden=true;$('downloadAudio').hidden=true;$('discardRecording').disabled=true}
function clock(){const seconds=Math.floor((Date.now()-started)/1000);$('speakingTimer').textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0')}
function stopTracks(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}if(timer){clearInterval(timer);timer=null}}
$('speakingLevel').addEventListener('change',()=>{index=0;prompt()});
$('speakingMode').addEventListener('change',()=>{index=0;prompt()});
$('nextPrompt').addEventListener('click',()=>{index++;prompt()});
$('startRecording').addEventListener('click',async()=>{
 if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){status('Este navegador no permite grabar audio. Usa HTTPS y un navegador compatible.');return}
 $('startRecording').disabled=true;revoke();chunks=[];
 try{
  stream=await navigator.mediaDevices.getUserMedia({audio:true});
  recorder=new MediaRecorder(stream);
  recorder.addEventListener('dataavailable',event=>{if(event.data?.size)chunks.push(event.data)});
  recorder.addEventListener('stop',()=>{
   stopTracks();$('stopRecording').disabled=true;$('startRecording').disabled=false;
   if(!chunks.length){status('No se obtuvo audio. Inténtalo de nuevo.');return}
   const type=recorder.mimeType||'audio/webm';
   const blob=new Blob(chunks,{type});url=URL.createObjectURL(blob);
   const audio=$('recordingPlayback');audio.src=url;audio.hidden=false;
   const a=$('downloadAudio');a.href=url;a.download='easy-english-speaking.'+(type.includes('mp4')?'m4a':type.includes('ogg')?'ogg':'webm');a.hidden=false;
   $('discardRecording').disabled=false;status('Grabación lista. Escúchala o descárgala.');
  },{once:true});
  recorder.addEventListener('error',()=>{stopTracks();$('startRecording').disabled=false;$('stopRecording').disabled=true;status('No se pudo completar la grabación.');});
  recorder.start();started=Date.now();$('speakingTimer').textContent='00:00';timer=setInterval(clock,500);
  $('stopRecording').disabled=false;status('Grabando… Habla con naturalidad.');
 }catch(error){stopTracks();$('startRecording').disabled=false;$('stopRecording').disabled=true;status(error?.name==='NotAllowedError'?'No se concedió permiso para usar el micrófono. Revisa los permisos del navegador.':'No se pudo iniciar la grabación: '+(error.message||'error desconocido'))}
});
$('stopRecording').addEventListener('click',()=>{if(recorder?.state==='recording'){recorder.stop();$('stopRecording').disabled=true;clock()}});
$('discardRecording').addEventListener('click',()=>{revoke();$('speakingTimer').textContent='00:00';status('Grabación descartada. Puedes volver a empezar.')});
window.addEventListener('pagehide',()=>{if(recorder?.state==='recording')recorder.stop();stopTracks();if(url)URL.revokeObjectURL(url)});
prompt();
})();