# Correo a ventas de Belvo (y a Syncfy / Finerio para comparar)

**Para:** sales@belvo.com
**Asunto:** Acceso a producción · agregación bancaria para app de finanzas personales en México

Hola, equipo de Belvo:

Soy [NOMBRE], fundador de MoneyMaker, una app de finanzas personales para México (web y móvil) que organiza el gasto por quincena, detecta suscripciones y meses sin intereses, y arma el presupuesto del usuario a partir de sus movimientos. Ya tenemos la integración construida contra su sandbox (widget, links recurrentes, cuentas, transacciones y webhooks) y queremos pasar a producción.

Nuestro modelo: suscripción de $250 MXN al mes por usuario, con lectura de 2 a 4 links por usuario. Arrancamos con una beta cerrada de 50 usuarios en las próximas 4 semanas y un objetivo de 1,000 usuarios en 6 meses.

Para tomar la decisión necesito que me confirmen:

1. **Precio**: costo por link activo al mes, costo por refresco adicional, mínimo de contrato (meses y monto) y si hay un plan para startups en etapa temprana.
2. **Cobertura retail en México**: específicamente Nu, American Express, Coppel, Banco Azteca, Hey Banco, Klar y Stori, además de BBVA, Banorte, Santander, HSBC, Banamex y Scotiabank. ¿Cuáles requieren token/MFA en cada actualización?
3. **Frecuencia de actualización** de transacciones para links recurrentes y latencia típica del webhook `new_transactions_available`.
4. **Datos de tarjetas de crédito**: fecha de corte, fecha límite de pago, pago mínimo y límite de crédito. ¿Se exponen para todas las instituciones?
5. **Tiempo a producción**: pasos de certificación y cuánto tardan desde la firma.
6. **Requisitos de cumplimiento** que piden al cliente (aviso de privacidad, KYB, seguridad).

¿Podemos agendar una llamada esta semana? Estoy disponible [DÍAS Y HORAS].

Gracias,
[NOMBRE] · [TELÉFONO] · [CORREO]
MoneyMaker · [DOMINIO]

---

*Para Syncfy (contacto en syncfy.com) y Finerio Connect (finerioconnect.com) manda el mismo texto cambiando el saludo y el punto 2: pregunta también si conectan Bitso o casas de bolsa (GBM+, Kuspit), que Belvo no cubre.*
