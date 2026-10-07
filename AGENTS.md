# AGENTS.md — Reglas editoriales de Easy English

Estas reglas deben seguirse siempre que un agente de OpenAI cree, edite o publique artículos en este repositorio.

## 1. Estructura del repositorio

- La página principal debe permanecer en `/index.html`.
- Todos los artículos deben publicarse dentro de la carpeta `/post/`.
- No crear artículos HTML nuevos en la raíz del repositorio.
- Usar nombres de archivo descriptivos, en minúsculas y separados por guiones.
- Ejemplo: `post/presente-simple-en-ingles.html`.

## 2. Estructura obligatoria de cada artículo

Cada artículo debe mantener el estilo visual y editorial existente e incluir, como mínimo:

1. Encabezado con:
   - enlace a `../index.html`;
   - nombre del sitio "Easy English";
   - enlace "Volver al blog".

2. Hero del artículo con:
   - etiqueta o categoría;
   - título principal;
   - descripción clara;
   - nivel recomendado cuando corresponda.

3. Tabla de contenidos con enlaces internos a las secciones principales.

4. Desarrollo detallado del tema:
   - explicación paso a paso;
   - ejemplos en inglés;
   - traducción o explicación en español cuando sea útil;
   - tablas cuando ayuden a comparar estructuras;
   - notas o consejos destacados;
   - errores frecuentes;
   - lenguaje claro para principiantes.

5. Práctica:
   - ejercicios;
   - soluciones o respuestas;
   - al menos un pequeño reto práctico cuando tenga sentido.

6. Bloque final de continuación:
   - enlace al siguiente artículo relacionado, o
   - enlace para volver al índice principal.

7. Footer coherente con el resto del blog.

## 3. Profundidad y calidad del contenido

- No publicar artículos superficiales.
- Explicar cada concepto con suficiente detalle para que una persona principiante pueda estudiarlo sin acudir a otra fuente.
- Evitar párrafos de relleno.
- Priorizar inglés útil para situaciones reales.
- Incluir varios ejemplos originales.
- Explicar diferencias que suelen confundir a hispanohablantes.
- Mantener un tono claro, didáctico y directo.
- Usar nivel A1/A2 como referencia para contenido básico, salvo que el artículo indique otro nivel.

## 4. Categorías

Las categorías actuales incluyen:

- Lecciones de gramática y comunicación.
- Vocabulario.
- Series y películas.
- Práctica.

Cuando se añada una nueva categoría:

- debe aparecer en la página principal si es relevante;
- sus artículos también deben vivir en `/post/`;
- debe seguir el mismo sistema visual y de navegación.

## 5. Página principal

Cada vez que se publique un artículo nuevo:

- actualizar `index.html`;
- añadir un enlace visible al artículo;
- usar la ruta `post/<slug>.html`;
- incluir título, breve descripción y llamada a la acción;
- comprobar que todos los enlaces funcionan;
- mantener el diseño responsive.

Un artículo no se considera completamente publicado hasta que existe un enlace accesible desde la página principal, salvo que se indique expresamente lo contrario.

## 6. Enlaces internos

Desde un archivo dentro de `/post/`:

- para volver a la portada usar `../index.html`;
- para enlazar otro artículo de `/post/`, usar únicamente su nombre de archivo, por ejemplo:
  `leccion-2-to-be.html`.

Desde `index.html`:

- enlazar artículos como `post/nombre-del-articulo.html`.

## 7. Flujo de publicación

Al publicar un artículo nuevo:

1. Crear el artículo dentro de `/post/`.
2. Revisar estructura, ortografía y enlaces.
3. Actualizar `index.html` con su enlace.
4. Hacer commit y push a la rama principal.
5. Construir el enlace público esperado con esta forma:
   `https://jnfz92.github.io/post/<slug>.html`
6. Enviar un correo de aviso a:
   `juanfranciscofernandezherreros@gmail.com`

El correo debe contener:

- título del artículo;
- confirmación de que ya está publicado;
- enlace público directo;
- una descripción breve de una o dos frases.

Asunto recomendado:

`Nuevo artículo publicado: <título>`

## 8. Regla sobre el envío de correo

- Usar la integración de Gmail disponible para el agente cuando esté conectada y autorizada.
- No inventar que el correo se ha enviado.
- Si Gmail no está conectado o la acción no está disponible, publicar igualmente el artículo si el usuario lo pidió y comunicar claramente que el envío del email queda pendiente por falta de conexión.
- No cambiar el destinatario salvo instrucción explícita del usuario.

## 9. Git

- Trabajar sobre `main` salvo que el usuario pida otra rama.
- Usar mensajes de commit claros y descriptivos.
- Evitar dejar copias duplicadas de artículos en la raíz.
- Si se mueve un artículo, actualizar primero los enlaces y eliminar después la copia antigua.
- No romper contenido existente de forma innecesaria.

## 10. Comprobación final

Antes de dar la tarea por terminada comprobar:

- [ ] El artículo está dentro de `post/`.
- [ ] La portada enlaza al artículo.
- [ ] "Volver al blog" funciona.
- [ ] Los enlaces al siguiente artículo funcionan.
- [ ] El contenido tiene explicación, ejemplos y práctica.
- [ ] El sitio sigue siendo responsive.
- [ ] Los cambios están en GitHub.
- [ ] Se ha enviado el email de publicación si Gmail está conectado.
## 11. Frases y ejemplos bilingües

- Todas las frases, ejemplos y expresiones en inglés que se publiquen en el blog deben incluir también su traducción al español cuando tengan valor didáctico para el lector.
- Esta regla se aplica especialmente a las secciones de frases, ejemplos, vocabulario, gramática, speaking, ejercicios y contenido de series y películas.
- No dejar frases de ejemplo únicamente en inglés dentro de listados bilingües o secciones de estudio, salvo que exista una razón editorial explícita.
- Mantener la traducción inmediatamente junto a la frase original para facilitar la comparación.
- Si se añade una nueva colección de frases a `index.html` o a cualquier artículo de `/post/`, comprobar antes de publicar que todas las entradas del conjunto sean bilingües.

## 12. Formato obligatorio: HTML estático

- Todos los artículos del blog deben ser archivos **HTML estáticos** con extensión `.html`.
- Crear cada artículo directamente como `post/<slug>.html`.
- No crear ni publicar artículos del blog en Markdown (`.md`).
- No depender de Jekyll, layouts, front matter ni de una conversión Markdown → HTML para que un artículo funcione.
- Cada artículo debe ser un documento HTML completo y seguir el diseño visual de los artículos existentes en `post/`.
- Los enlaces de las tarjetas de `index.html` deben apuntar directamente al archivo `post/<slug>.html`.
- Antes de dar un artículo por publicado, comprobar que el archivo `.html` existe y que el `href` de la portada coincide exactamente con esa ruta.
- El artículo debe poder servirse correctamente como archivo estático, sin ningún paso de compilación.
- Si se regenera o sustituye un artículo existente, mantener también este formato HTML estático.
