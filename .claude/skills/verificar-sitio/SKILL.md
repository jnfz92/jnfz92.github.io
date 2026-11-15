---
name: verificar-sitio
description: Ejecuta las comprobaciones del CI de Easy English (rutas, catálogo, JS, contraste, Playwright, Cucumber) y resume resultados reales antes de entregar un cambio. Usar antes de dar por terminado cualquier cambio de HTML, CSS, JS, catálogo o navegación.
---

# Verificar el sitio

Ejecutar desde la raíz del repositorio. Anotar cada resultado real; no declarar éxito de lo que no se ha ejecutado.

## Siempre (estáticas, rápidas)
```bash
python scripts/check_routes.py
python -m unittest discover -s tests -p "test_*.py"
python3 scripts/check_catalog.py
```

## Según el cambio
- **JavaScript tocado**: `node --check assets/<archivo>.js` para cada archivo modificado (en CI: actividades, ee-ai, writing-ai, aula-ai-plan, clave-openai, writing-editor).
- **CSS o colores tocados**: `node scripts/audit-wcag-contrast.cjs`.
- **Interfaz o flujos**:
  ```bash
  npm install --no-save --no-package-lock @playwright/test@1.56.1
  npx playwright install --with-deps chromium
  npx playwright test --config=tests/playwright.config.cjs
  ```
  Para practicar: `npx playwright test tests/practicar.spec.cjs --config=tests/playwright.config.cjs`.
- **Features BDD o rutas públicas**:
  ```bash
  npm install --no-save --no-package-lock @cucumber/cucumber@11.3.0 playwright@1.56.1
  npx cucumber-js --config cucumber.cjs
  ```
  Escenarios `@pendiente-sesion` no se ejecutan con la cuenta del propietario.
- **Datos reales de Supabase** (`tests/live-supabase.spec.cjs`): solo si el cambio lo requiere; sin credenciales secretas.

## Si algo falla
1. Leer el mensaje completo; no reejecutar a ciegas.
2. Corregir la causa (permalink, enlace roto, `?v=` distinto, slug duplicado, contraste insuficiente).
3. Reejecutar solo la comprobación afectada y después la suite completa de estáticas.
4. Si el fallo no es del cambio (p. ej. un test de producción ya roto), decirlo y aportar la salida.

## Entrega
Tabla con comando, resultado (OK/FALLO/NO EJECUTADO) y motivo si no se ejecutó. Recordar que la comprobación visual en 320/375/768/1280 px es aparte y, si no se hizo, debe declararse.
