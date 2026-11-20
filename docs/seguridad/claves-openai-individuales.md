Claves OpenAI individuales y persistentes

Cada usuario autenticado registra su propia clave. La Edge Function valida la clave, la cifra con AES-256-GCM y guarda únicamente el texto cifrado en public.openai_user_keys. El navegador nunca recibe la clave guardada ni la conserva en localStorage o sessionStorage.

La tabla tiene RLS activado y no concede permisos a anon ni authenticated. Solo el backend con SUPABASE_SERVICE_ROLE_KEY puede acceder. La fila se vincula a auth.users y se elimina automáticamente al borrar la cuenta.

CONFIGURACIÓN OBLIGATORIA ANTES DEL DESPLIEGUE

1. Genera una clave maestra aleatoria de 32 bytes con: openssl rand -base64 32
2. Opcional: guarda el resultado directamente en Supabase Dashboard > Edge Functions > Secrets con el nombre OPENAI_KEYS_ENCRYPTION_KEY. Si no se configura, las funciones derivan una clave AES-256-GCM del secreto SUPABASE_SERVICE_ROLE_KEY, que ya existe en el servidor. Nunca se expone al navegador.
3. Conserva una copia de recuperación en un gestor de secretos. Si se pierde o se rota sin volver a cifrar todas las filas, las claves OpenAI almacenadas no podrán descifrarse.
4. La Edge Function necesita SUPABASE_SERVICE_ROLE_KEY disponible en el entorno de Edge Functions. Si se utiliza la derivación de respaldo, no rotes ese secreto mientras existan claves cifradas con él: se perdería la capacidad de descifrarlas.

DESPLIEGUE ORDENADO

1. Aplicar supabase/migrations/20261120091815_openai_user_keys.sql.
2. Añadir OPENAI_KEYS_ENCRYPTION_KEY a los secretos de Edge Functions.
3. Desplegar supabase/functions/easy-english-ai.
4. Publicar el frontend actualizado.
5. Probar con dos cuentas: A guarda una clave; B no debe verla ni utilizarla; B guarda otra clave distinta; cada una prueba Writing/Plan; A elimina su clave y B conserva la suya.
6. Ejecutar supabase/tests/security/openai_user_keys.sql y los checks del repositorio.

No se migra ninguna clave temporal que pudiera existir en una pestaña: cada usuario tendrá que registrar su clave una vez tras activar esta versión. La persistencia no caduca automáticamente. Cada usuario sigue siendo responsable de su facturación, límites y revocación en OpenAI.

OPERACIONES

- key_status devuelve únicamente si existe una clave.
- key_save valida la clave con OpenAI, la cifra y la asocia al usuario autenticado.
- key_delete borra únicamente la fila del usuario autenticado.
- writing y plan descifran la clave en el servidor y la envían a OpenAI. La clave no se devuelve al cliente ni se incluye en respuestas o logs.
