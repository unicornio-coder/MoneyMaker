# Reestructura profesional · informe final (23 sep 2026)

Seis fases, cada una con PR a `main` y PR a la rama de producción (`claude/gallant-bohr-re8e7b`). Capturas antes/después en `docs/capturas/fase-N/` (390 y 1440 px).

| Fase | PR | Qué quedó |
|---|---|---|
| 0 | #7 | `docs/ARQUITECTURA.md`, `formatMXN`/`formatFecha` (fechas civiles, sin el día −1), `pluralize`, `saludo` en cliente, `npm run capturas` |
| 1 | #9 | SPEI con propósito → ingreso/gasto, último periodo con datos ("Basado en agosto 2026") en Presupuesto, Patrimonio e Inicio, fórmula única `puedesInvertir`, `hoyMX()` en páginas, plurales, insights mensuales, evento `import_error`, foco visible |
| 2 | #11 | Landing nueva: una promesa, bancos reales, problema, cómo funciona, qué obtienes, seguridad, precio una vez, preguntas. Sin testimonios inventados |
| 3 | #13 | Importación asíncrona (202 en < 1 s, `waitUntil`, etapas y progreso, migración `0004`), caché por hash, texto primero al modelo, aviso en el shell, tabla de revisión editable, eventos `import_iniciada`/`import_lista` |
| 4 | #15 | `lib/brands.ts` + `BrandLogo` (local → Brandfetch → Clearbit → favicon → iniciales), `npm run logos`, `/app/dev/brands` |
| 5 | #17 | Onboarding de 4 pasos sin Belvo, búsqueda ⌘K, pie de Ajustes con versión y build, contraste en oscuro |
| 6 | este | CI en GitHub Actions (lint, tipos, tests, build, E2E con capturas), `/api/health`, página 404, informe |

## Lo que no se pudo hacer aquí (necesita tu máquina o tus llaves)

1. **`ANTHROPIC_API_KEY` en Vercel (Production)**: sin ella la lectura de PDFs con fuentes ofuscadas responde `sin_modelo`. Solo tú puedes ponerla (Vercel → Settings → Environment Variables) y redeployar.
2. **Logos locales**: este entorno no llega a los CDNs de logos. Corre `npm run logos` con internet y sube `public/logos` + `src/lib/brands.locales.json`. Mientras, producción usa Clearbit/favicons y monogramas.
3. **Rama de producción en Vercel**: sigue siendo `claude/gallant-bohr-re8e7b`. Recomiendo cambiarla a `main` para que cada merge publique solo.
4. **Belvo y Gmail**: siguen como "Próximamente" en la hoja de Agregar cuenta (decisión pendiente).
5. **Validar el PDF de Amex real** campo por campo una vez que la llave esté en producción (`qa/precision.test.ts` cubre los 3 PDFs sintéticos).

## Números

- 118 pruebas unitarias, 8 E2E (móvil y escritorio), lint y build en verde en cada fase.
- 18 PRs (9 de fase + 9 de publicación), 1 migración nueva aplicada en Supabase.
