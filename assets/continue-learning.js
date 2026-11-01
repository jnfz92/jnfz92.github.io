(()=>{'use strict';
const button=document.getElementById('continueUnitLink');
const description=document.getElementById('continueDescription');
if(!button||!description)return;
try{
 const raw=localStorage.getItem('easyenglish-last-unit-v1');
 const unit=raw?JSON.parse(raw):null;
 if(!unit||!Number.isInteger(unit.numero)||unit.numero<1||unit.numero>200)return;
 const target=String(unit.ruta||'');
 if(!/^\/curso\.html#unidad-\d{2,3}$/.test(target))return;
 button.href=target;
 button.textContent='Volver a la unidad '+String(unit.numero).padStart(2,'0')+' →';
 description.textContent='Última unidad abierta en este navegador: '+String(unit.titulo||'B2').slice(0,90)+'. Continúa aquí o entra en Mi aula para consultar tu plan y tu progreso.';
}catch(_){}
})();