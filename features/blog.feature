# language: es
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
      | Acceso | /login.html |
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
  Escenario: Los exámenes privados redirigen al acceso
    Dado que navego a "/practicar.html"
    Entonces aparece la página de inicio de sesión con enlace al registro

  @publico
  Escenario: El perfil privado redirige al acceso
    Dado que navego a "/perfil.html"
    Entonces aparece la página de inicio de sesión con enlace al registro
