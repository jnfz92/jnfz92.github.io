/* Revisión orientativa local de Writing B2: no usa IA ni sustituye la corrección docente */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const stop=new Set(['the','and','that','with','have','this','from','there','their','they','would','could','should','about','which','because','when','were','been','into','your','more','than','some','also','what','will','very','just','only','then','them']);
const categoryTips={
 essay:'En un essay, presenta tu postura, desarrolla argumentos y termina con una conclusión.',
 article:'En un article, cuida el título y conecta los ejemplos con el lector.',
 review:'En una review, describe, evalúa y termina con una recomendación.',
 email_informal:'En un email informal, usa un saludo natural y responde a todos los puntos.',
 email_formal:'En un email formal, evita abreviaturas y usa un cierre adecuado.',
 report:'En un report, usa subtítulos claros y recomendaciones finales.',
 story:'En una story, organiza el comienzo, el conflicto y el desenlace.'
};
function feedback(){
 const root=$('writingFeedback'),txt=$('wtexto').value.trim(),words=txt.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g)||[];
 root.replaceChildren();
 if(!words.length){root.textContent='Escribe un texto antes de solicitar la revisión.';return}
 const paragraphs=txt.split(/\n\s*\n/).filter(x=>x.trim());
 const type=$('wtipo').value;
 const recommendations=[];
 if(words.length<140)recommendations.push('Extensión: '+words.length+' palabras. Intenta llegar a 140–190 palabras.');
 else if(words.length>190)recommendations.push('Extensión: '+words.length+' palabras. Revisa si puedes resumir hasta 190.');
 else recommendations.push('Extensión dentro del rango orientativo de 140–190 palabras ('+words.length+').');
 if(paragraphs.length<3)recommendations.push('Organización: divide el texto en al menos tres párrafos con funciones claras.');
 else recommendations.push('Organización: has separado '+paragraphs.length+' párrafos. Comprueba la coherencia entre ellos.');
 const connectors=txt.match(/\b(however|although|moreover|furthermore|nevertheless|therefore|on the other hand|in addition|as a result|for instance|for example|in conclusion|firstly|finally|despite)\b/gi)||[];
 if(connectors.length<2)recommendations.push('Cohesión: intenta añadir conectores variados, sin forzarlos.');
 else recommendations.push('Cohesión: se han detectado '+connectors.length+' conectores; comprueba que se utilizan con naturalidad.');
 const frequency=new Map();
 words.map(w=>w.toLowerCase()).filter(w=>w.length>=5&&!stop.has(w)).forEach(w=>frequency.set(w,(frequency.get(w)||0)+1));
 const repeats=[...frequency].filter(x=>x[1]>=4).sort((a,b)=>b[1]-a[1]).slice(0,3);
 if(repeats.length)recommendations.push('Vocabulario: considera alternativas para '+repeats.map(([word,count])=>word+' ('+count+' veces)').join(', ')+'.');
 else recommendations.push('Vocabulario: no se detectan repeticiones muy frecuentes de palabras de contenido.');
 recommendations.push(categoryTips[type]||'Revisa si la respuesta satisface todos los puntos de la tarea.');
 recommendations.push('Revisión final: comprueba tiempos verbales, artículos y ortografía con el corrector de tu navegador.');
 const title=document.createElement('h3');title.textContent='Sugerencias para revisar tu writing';root.append(title);
 const list=document.createElement('ul');recommendations.forEach(t=>{const li=document.createElement('li');li.textContent=t;list.append(li)});root.append(list);
 const disclaimer=document.createElement('p');disclaimer.className='writing-feedback-note';
 disclaimer.textContent='Análisis automático orientativo hecho en tu navegador. No es una corrección gramatical completa, una nota de Cambridge ni una valoración por IA. El texto no se envía a un servicio externo.';
 root.append(disclaimer)
}
$('writingCheck').addEventListener('click',feedback);
})();