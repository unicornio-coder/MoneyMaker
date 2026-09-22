# Precisión de lectura · 2026-09-21

Método: reglas (sin ANTHROPIC_API_KEY). Archivos: 3. Generado por `npm run qa:precision`.
**Resumen:** campos 100 % (36/36) · movimientos 100 % (29/29) · categorías 97 % (28/29). Meta: ≥ 95 % de filas leídas, ≥ 80 % bien categorizadas.


## provisional-01-credito-bbva-1.pdf

Campos del resumen: 12/12 · Movimientos: 11/11 (detectados 11) · Categorías: 10/11 · 0.1 s

| Campo del PDF | Esperado | Detectado | |
|---|---|---|---|
| Institución | BBVA | BBVA | ok |
| Tipo | credito | credito | ok |
| Últimos 4 | 0001 | 0001 | ok |
| Periodo inicio | 2026-06-16 | 2026-06-16 | ok |
| Periodo fin | 2026-07-15 | 2026-07-15 | ok |
| Fecha de corte | 2026-07-15 | 2026-07-15 | ok |
| Fecha límite de pago | 2026-08-05 | 2026-08-05 | ok |
| Pago mínimo | $1,200 | $1,200 | ok |
| Límite de crédito | $60,000 | $60,000 | ok |
| Saldo al corte | $18,450 | $18,450 | ok |
| Total de cargos | $3,904 | $3,904 | ok |
| Total de abonos | $9,450 | $9,450 | ok |
| Suscripciones | Netflix, Spotify | Netflix, Spotify | ok |
| MSI | Amazon 2/6 | Amazon 2/6 | ok |
| Nómina / quincena | — | — | ok |

## provisional-02-credito-bbva-2.pdf

Campos del resumen: 12/12 · Movimientos: 10/10 (detectados 10) · Categorías: 10/10 · 0.0 s

| Campo del PDF | Esperado | Detectado | |
|---|---|---|---|
| Institución | BBVA | BBVA | ok |
| Tipo | credito | credito | ok |
| Últimos 4 | 0001 | 0001 | ok |
| Periodo inicio | 2026-07-16 | 2026-07-16 | ok |
| Periodo fin | 2026-08-15 | 2026-08-15 | ok |
| Fecha de corte | 2026-08-15 | 2026-08-15 | ok |
| Fecha límite de pago | 2026-09-05 | 2026-09-05 | ok |
| Pago mínimo | $1,350 | $1,350 | ok |
| Límite de crédito | $60,000 | $60,000 | ok |
| Saldo al corte | $20,100 | $20,100 | ok |
| Total de cargos | $3,797 | $3,797 | ok |
| Total de abonos | $10,000 | $10,000 | ok |
| Suscripciones | Netflix, Spotify | Netflix, Spotify | ok |
| MSI | Amazon 3/6, Liverpool 11/12 | Liverpool 11/12, Amazon 3/6 | ok |
| Nómina / quincena | — | — | ok |

## provisional-03-debito-banorte-nomina.pdf

Campos del resumen: 12/12 · Movimientos: 8/8 (detectados 8) · Categorías: 8/8 · 0.0 s

| Campo del PDF | Esperado | Detectado | |
|---|---|---|---|
| Institución | Banorte | Banorte | ok |
| Tipo | debito | debito | ok |
| Últimos 4 | 0003 | 0003 | ok |
| Periodo inicio | 2026-08-01 | 2026-08-01 | ok |
| Periodo fin | 2026-08-31 | 2026-08-31 | ok |
| Fecha de corte | 2026-08-31 | 2026-08-31 | ok |
| Fecha límite de pago | — | — | ok |
| Pago mínimo | — | — | ok |
| Límite de crédito | — | — | ok |
| Saldo al corte | $23,120 | $23,120 | ok |
| Total de cargos | $16,873 | $16,873 | ok |
| Total de abonos | $29,000 | $29,000 | ok |
| Suscripciones | — | — | ok |
| MSI | — | — | ok |
| Nómina / quincena | días 14 y 30 | días 14 y 30 | ok |

