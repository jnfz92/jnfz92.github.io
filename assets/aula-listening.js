(()=>{'use strict';const A=window.EEAula,$=A.$;
const bank=[
{audio:'Hi Emily, this is Daniel. The train to Oxford is leaving from platform six rather than platform four today. It is ten minutes late, so it will depart at quarter past three. I will meet you next to the ticket office.',q:'¿De qué andén sale el tren?',options:['Cuatro','Seis','Tres','Diez'],correct:1,why:'Daniel dice platform six.'},
{audio:'Good morning. The museum is closed on Mondays for maintenance. On Tuesdays it opens at ten and closes at five. Students can enter for six pounds if they show a valid student card.',q:'¿Qué deben presentar los estudiantes para pagar menos?',options:['Una reserva','Carné de estudiante válido','Una invitación','Un pasaporte'],correct:1,why:'Students need a valid student card.'},
{audio:'Hello, I am calling about our team meeting. We have moved it from Wednesday to Thursday because the designer is travelling. It will begin at nine thirty in the small conference room, not the main hall.',q:'¿Qué día tendrá lugar la reunión?',options:['Martes','Miércoles','Jueves','Viernes'],correct:2,why:'The meeting moved from Wednesday to Thursday.'},
{audio:'This is a reminder that your book is due on the fifteenth of June. You can renew it online for two more weeks unless another reader has requested it. Please return it on time to avoid a fine.',q:'¿En qué caso se puede renovar el libro?',options:['Siempre','Solo personalmente','Si nadie más lo ha reservado','Solo antes de mayo'],correct:2,why:'Unless another reader has requested it.'}
];
let index=-1;
function play(){
 if(!('speechSynthesis'in window)||!('SpeechSynthesisUtterance'in window)){
  A.note('listenStatus','Tu navegador no dispone de síntesis de voz. Usa otro navegador compatible.');return
 }
 const speech=window.speechSynthesis;speech.cancel();
 const u=new SpeechSynthesisUtterance(bank[index].audio);u.lang='en-GB';u.rate=.88;
 const voices=speech.getVoices();
 const voice=voices.find(v=>v.lang?.toLowerCase().startsWith('en-gb'))||voices.find(v=>v.lang?.toLowerCase().startsWith('en'));
 if(voice)u.voice=voice;
 u.onstart=()=>A.note('listenStatus','Reproduciendo voz sintetizada…');
 u.onend=()=>A.note('listenStatus','Puedes repetir el audio antes de responder.');
 u.onerror=()=>A.note('listenStatus','No se pudo reproducir el audio en este dispositivo.');
 speech.speak(u)
}
$('listenStart').onclick=()=>{
 index=(index+1)%bank.length;const item=bank[index];
 $('listenExercise').hidden=false;
 A.note('listenQuestion',item.q);A.note('listenFeedback','');
 const options=$('listenOptions');options.replaceChildren();
 item.options.forEach((text,i)=>{
  const label=A.elt('label'),radio=A.elt('input');radio.type='radio';radio.value=String(i);radio.name='listenAnswer';
  label.append(radio,document.createTextNode(' '+text));options.append(label)
 });
 play()
};
$('playListening').onclick=()=>{if(index>=0)play()};
$('listenCheck').onclick=()=>{
 const selected=document.querySelector('input[name=listenAnswer]:checked');
 if(!selected){A.note('listenFeedback','Elige una respuesta.');return}
 const item=bank[index];
 A.note('listenFeedback',(Number(selected.value)===item.correct?'✓ Correcto. ':'Inténtalo otra vez. ')+item.why)
};
})();