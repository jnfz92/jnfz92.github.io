---
description: Comprobaciones CI que deben pasar antes de entregar cambios
paths:
  - "scripts/**"
  - "tests/**"
  - "features/**"
  - "cucumber.cjs"
  - ".github/workflows/**"
---

# Verificación y CI

Comprobaciones existentes (`.github/workflows/`):

| Comprobación | Comando local | Cuándo |
| --- | --- | --- |
| Rutas, permalinks, enlaces y assets | `python scripts/check_routes.py` y `python -m unittest discover -s tests -p "test_*.py"` | Siempre que cambien HTML, includes o assets |
| Catálogo y navegación | `python3 scripts/check_catalog.py` | Cambios en catálogo, menú, `header.html`, `articulos.html`, `index.html` |
| Sintaxis JS de funciones IA y aula | `node --check assets/<archivo>.js` | Cambios en `actividades.js`, `ee-ai.js`, `writing-*.js`, `aula-ai-plan.js`, `clave-openai.js` |
| Contraste WCAG | `node scripts/audit-wcag-contrast.cjs` | Cambios de color, CSS o tokens |
| Navegador (Playwright) | `npx playwright test --config=tests/playwright.config.cjs` | Cambios de interfaz o flujos |
| BDD (Cucumber) | `npx cucumber-js --config cucumber.cjs` | Cambios en `features/` o rutas públicas |

Reglas:
- Si un cambio afecta a rutas, menú o contraste, ejecutar la comprobación correspondiente **antes** de entregar.
- Las pruebas no deben crear usuarios reales ni enviar correos. `tests/auth-profile.spec.cjs` responde localmente a Auth.
- `tests/live-supabase.spec.cjs` consulta el proyecto real: ejecutarla solo si el cambio lo requiere y sin credenciales secretas.
- Escenarios `@pendiente-sesion` requieren usuario de prueba aislado; no ejecutarlos con la cuenta del propietario.
- Si no se pueden ejecutar (p. ej., sin Node o sin navegador), decirlo en la entrega y verificar por lectura.
- Dependencias de CI se instalan con `--no-save --no-package-lock`; no añadir `package.json` al repositorio.

**Why:** el sitio no tiene build; estas comprobaciones son la única red de seguridad antes de publicar en GitHub Pages.
**How to apply:** usar la skill `verificar-sitio`.
