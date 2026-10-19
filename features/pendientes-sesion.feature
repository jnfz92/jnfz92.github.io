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
