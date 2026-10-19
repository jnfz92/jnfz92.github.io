# Cada escenario describe qué comportamiento comprueba y qué resultado confirma.
# @publico = navegador real sin credenciales; @pendiente-sesion = exige usuario de prueba aislado.
Característica: Navegación y acceso público a Easy English
  Como estudiante
  Quiero acceder a las páginas y contenidos esenciales
  Para estudiar sin encontrar rutas rotas

  @publico
  Esquema del escenario: La página <nombre> responde correctamente
    Dado que abro la página "<ruta>"
    Entonces la página responde con HTTP 200
    Ejemplos:
      | nombre | ruta |
      | Inicio | /index.html |
      | Artículos | /articulos.html |
      | Lector | /leer.html |
      | Curso | /curso.html |
      | Exámenes | /examenes.html |
      | Practicar | /practicar.html |
      | Perfil | /perfil.html |
      | Actividades | /actividades.html |
      | Vocabulario | /vocabulario.html |
      | Comunidad | /comunidad.html |
      | Mensajes | /mensajes.html |
      | Sugerencias | /sugerencias.html |

  @publico
  Escenario: El visitante abre el catálogo de artículos auténticos
    Dado que navego a "/articulos.html"
    Entonces aparece al menos un enlace a un artículo de lectura

  @publico
  Escenario: El alumno puede abrir un artículo desde su enlace
    Dado que navego a "/leer.html?slug=como-escribir-email-b2-first-fce"
    Entonces el artículo muestra un título principal

  @publico
  Escenario: La selección de exámenes existe y ofrece un modo de empezar
    Dado que navego a "/practicar.html"
    Entonces encuentro el selector de exámenes

  @publico
  Escenario: El perfil ofrece autenticación sin exponer los datos privados
    Dado que navego a "/perfil.html"
    Entonces existe un formulario de autenticación del perfil

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
