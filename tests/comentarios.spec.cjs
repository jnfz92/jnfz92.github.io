const {test,expect}=require('@playwright/test');
const path=require('node:path');

async function pageWithComments(page,{user=null}={}){
  await page.setContent(`<!doctype html><html lang="es"><body class="ee-site">
   <section id="comentarios" data-article-slug="un-articulo">
    <h2>Comentarios y respuestas</h2>
    <div id="ee-comments-composer"></div>
    <p id="ee-comments-count"></p>
    <p id="ee-comments-status" role="status"></p>
    <div id="ee-comments-list"></div>
   </section></body></html>`);
  await page.evaluate(u=>{
    window.__rpcCalls=[];
    window.__commentData=[
      {id:1,padre_id:null,autor_alias:'@luna',contenido:'Comentario inicial',creado_en:'2026-10-17T11:00:00Z',es_mio:false,eliminado:false},
      {id:2,padre_id:1,autor_alias:'@sol',contenido:'Primera respuesta',creado_en:'2026-10-17T11:01:00Z',es_mio:false,eliminado:false},
      {id:3,padre_id:2,autor_alias:'Estudiante',contenido:'Respuesta a la respuesta',creado_en:'2026-10-17T11:02:00Z',es_mio:true,eliminado:false}
    ];
    window.eeDb={
      auth:{
        getUser:async()=>({data:{user:u},error:u?null:{name:'AuthSessionMissingError',message:'Auth session missing!'}}),
        onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})
      },
      rpc:async(name,args)=>{
        window.__rpcCalls.push({name,args});
        if(name==='listar_comentarios_articulo')return {data:window.__commentData,error:null};
        if(name==='publicar_comentario_articulo'){
          window.__commentData.push({id:4,padre_id:args.p_padre_id,autor_alias:'Estudiante',
            contenido:args.p_contenido,creado_en:'2026-10-17T11:03:00Z',es_mio:true,eliminado:false});
          return {data:4,error:null};
        }
        if(name==='eliminar_comentario_articulo'){
          const c=window.__commentData.find(x=>x.id===args.p_id);
          c.eliminado=true;c.contenido='[Comentario eliminado]';return {data:true,error:null};
        }
        return {data:null,error:{message:'RPC inesperada'}};
      }
    };
  },user);
  await page.addScriptTag({path:path.join(__dirname,'../assets/comentarios-articulos.js')});
  await expect(page.locator('#comentario-3')).toBeVisible();
}

test('lectura pública: hilo y respuesta a respuesta sin exponer correo',async ({page})=>{
  await pageWithComments(page);
  await expect(page.locator('.ee-comment')).toHaveCount(3);
  await expect(page.locator('#comentario-3')).toHaveAttribute('data-depth','2');
  await expect(page.locator('.ee-comment-auth a')).toHaveAttribute('href','/perfil.html');
  await expect(page.getByRole('button',{name:/responder/i})).toHaveCount(0);
});

test('usuario autenticado puede responder a una respuesta',async ({page})=>{
  await pageWithComments(page,{user:{id:'user1'}});
  await page.locator('#comentario-2').getByRole('button',{name:/responder/i}).click();
  await page.locator('#comentario-2 textarea').fill('Respuesta de tercer nivel');
  await page.locator('#comentario-2 button[type=submit]').click();
  await expect(page.locator('#comentario-4')).toBeVisible();
  const calls=await page.evaluate(()=>window.__rpcCalls);
  expect(calls.some(x=>x.name==='publicar_comentario_articulo'&&x.args.p_padre_id===2&&x.args.p_slug==='un-articulo')).toBeTruthy();
  await expect(page.locator('#comentario-4')).toHaveAttribute('data-depth','2');
});

test('un comentario propio se borra sin borrar sus respuestas',async ({page})=>{
  await pageWithComments(page,{user:{id:'user1'}});
  page.on('dialog',dialog=>dialog.accept());
  await page.locator('#comentario-3').getByRole('button',{name:'Eliminar'}).click();
  await expect(page.locator('#comentario-3 .ee-comment-body')).toContainText('[Comentario eliminado]');
  await expect(page.locator('#comentario-2')).toBeVisible();
});

test('el contenido HTML ajeno no se interpreta al pintar comentarios',async ({page})=>{
  await pageWithComments(page);
  await page.evaluate(()=>{
    window.__commentData[0].contenido='<img src=x onerror=alert(1)> Hola';
  });
  // Reiniciar el cliente con los mismos datos para forzar nuevo pintado.
  await page.addScriptTag({path:path.join(__dirname,'../assets/comentarios-articulos.js')});
  await expect(page.locator('#comentario-1 .ee-comment-body')).toContainText('<img src=x onerror=alert(1)> Hola');
  await expect(page.locator('#comentario-1 img')).toHaveCount(0);
});
