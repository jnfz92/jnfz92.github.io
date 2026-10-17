# Sugerencias

Las sugerencias se envían sin cuenta desde la web o la APK y se guardan con el estado `pendiente`. No se muestran ni aceptan votos hasta que se revisen.

## Activar la función

Ejecutar `supabase/12_sugerencias.sql` en Supabase SQL Editor. El script crea las tablas privadas, las funciones RPC y añade el acceso a Sugerencias a las copias de navegación de `public.paginas_blog`.

## Revisar y publicar

Consultar `public.sugerencias` en Supabase. Para publicar una propuesta revisada:

```sql
UPDATE public.sugerencias
SET estado = 'publicada'
WHERE id = 123;
```

Los estados permitidos son `pendiente`, `publicada` y `rechazada`. Solo las publicadas se devuelven en la web y la APK.

## Votos anónimos

Cada instalación del navegador guarda un UUID local y puede mantener un voto por sugerencia. Puede cambiar entre “Me gusta” y “No me gusta”; la base de datos reemplaza el voto anterior. El listado se ordena por cantidad de “Me gusta”, con las sugerencias más nuevas primero en caso de empate.

El UUID distingue navegadores, no identidades verificadas: al borrar los datos locales o usar otro navegador se puede volver a votar. Para votar no se requiere iniciar sesión.
