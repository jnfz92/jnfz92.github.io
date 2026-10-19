Característica: Exámenes personalizados y datos privados
  # No se simula una sesión real ni se crean calificaciones en producción sin credenciales específicas.
  @pendiente-sesion
  Escenario: Un alumno autenticado genera preguntas de su tema débil
    Dado que el alumno ha iniciado sesión en una cuenta de pruebas
    Cuando pide un examen de un tema pendiente
    Entonces recibe únicamente preguntas falladas de ese tema

  @pendiente-sesion
  Escenario: La corrección de un repaso no modifica calificaciones originales
    Dado que el alumno ha iniciado sesión en una cuenta de pruebas
    Cuando entrega un repaso de errores
    Entonces la calificación histórica permanece intacta

  @pendiente-sesion
  Escenario: El PDF del informe contiene gráficos y explicaciones legibles
    Dado que el alumno ha completado un examen en una cuenta de pruebas
    Cuando exporta el informe a PDF
    Entonces el PDF contiene resultados y no crea páginas vacías
  @pendiente-sesion
  Escenario: Registro de una cuenta de pruebas y confirmación de correo
    Dado que dispongo de una dirección de pruebas no usada
    Cuando completo el registro
    Entonces recibo confirmación y no se exponen credenciales

  @pendiente-sesion
  Escenario: Inicio y cierre de sesión restringen los datos personales
    Dado que existe un usuario de pruebas
    Cuando inicia sesión y después la cierra
    Entonces desaparecen las estadísticas privadas

  @pendiente-sesion
  Escenario: El perfil muestra progreso, objetivos y actividad coherentes
    Dado que el alumno tiene exámenes y actividad guardados
    Cuando consulta su perfil
    Entonces los gráficos coinciden con sus resultados reales

  @pendiente-sesion
  Escenario: El examen diario se entrega una sola vez
    Dado que hay un examen publicado y el usuario de pruebas tiene sesión
    Cuando entrega sus respuestas y reintenta por un error de conexión
    Entonces la nota se guarda sin duplicar el intento

  @pendiente-sesion
  Escenario: Los errores corregidos dejan de estar pendientes
    Dado que el alumno tiene preguntas falladas
    Cuando supera una tanda de repaso
    Entonces las preguntas acertadas dejan de estar pendientes

  @pendiente-sesion
  Escenario: Los mensajes se muestran solo a sus destinatarios
    Dado que hay dos usuarios de pruebas
    Cuando uno crea un mensaje privado
    Entonces únicamente el destinatario autorizado puede leerlo

  @pendiente-sesion
  Escenario: Las actividades de varias modalidades se corrigen
    Dado que el alumno tiene actividades de selección y respuesta abierta
    Cuando completa y entrega ambas modalidades
    Entonces las respuestas se corrigen y se guarda el progreso

  @pendiente-sesion
  Escenario: Un alumno puede editar y borrar sus comentarios
    Dado que el alumno ha publicado un comentario de pruebas
    Cuando solicita eliminarlo
    Entonces el comentario se oculta sin eliminar las respuestas ajenas

  @pendiente-sesion
  Escenario: Las sugerencias no permiten votos duplicados
    Dado que el alumno ha votado una sugerencia
    Cuando modifica su voto
    Entonces se aplica su última elección una única vez
