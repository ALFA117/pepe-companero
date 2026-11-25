# Guía de desarrollo

Todo lo técnico para correr, desplegar y mantener a Pepe. La presentación del proyecto está en el [README](../README.md).

## Arquitectura

```
WhatsApp ──► Kapso ──► POST /api/whatsapp ─┐   (firma HMAC, 200 inmediato, after())
Web del alumno ──────► POST /api/chat ─────┤
                                           ▼
                       procesar()  src/motor/procesar.ts
          ┌────────────────┼──────────────────────────┐
          ▼                ▼                          ▼
   transcribir()     Juez (LLM → JSON zod)     máquina de estados
   Groq whisper      clasifica la respuesta    (TypeScript puro, con tests)
   + fluidez.ts                                       │ decide nivel y paso
                                                      ▼
                                   Pepe (LLM → JSON) → filtro anti-respuesta
                                   (sin ver la solución; respaldo: el ejemplo del paso)
                                                      │
                                                      ▼
                                   canal.enviar() + Supabase → /docente
```

**Reglas que no se rompen**

1. El LLM nunca decide el nivel. El Juez clasifica, la máquina (`src/motor/maquina.ts`) decide y Pepe solo redacta.
2. Pepe nunca ve la solución, la rúbrica ni la lista de frases prohibidas. Además, un filtro revisa cada mensaje: si se le escapa la respuesta, reintenta una vez y después usa el `ejemplo` del paso. Si el LLM tarda más de 8 s, también usa el `ejemplo`.
3. Pepe solo habla del reto.
4. Privacidad: el audio vive solo en memoria y no se guarda. El teléfono se guarda como hash con sal (para buscar al alumno) y cifrado con AES-256-GCM (para "Asignar reto"), nunca en claro.
5. Las métricas de fluidez solo las ve el maestro.

### Estructura

| Carpeta | Qué hay |
|---|---|
| `src/motor/` | Contrato (`tipos.ts`), máquina de estados, Juez, Pepe, filtro, fluidez, intenciones (`intencion.ts`: saludos, atajos y riesgo, sin LLM) y orquestador |
| `src/retos/banco/` | 10 retos en JSON (5 de matemáticas y 5 de lectura), validados con zod al cargar |
| `src/canales/` | Kapso, Twilio y la lógica común de WhatsApp (vinculación por código) |
| `src/ia/` | Modelos configurables (`proveedor:modelo`), cadena de respaldo y transcripción |
| `src/db/` | Repositorio sobre Supabase y en memoria (mismo contrato) |
| `src/panel/` | Cálculos del panel, "Asignar reto" y hojas de práctica |
| `src/app/` | Web: inicio, `/alumno/[codigo]`, `/docente`, APIs |
| `supabase/` | Migraciones y seed de pruebas |
| `scripts/` | Simulador en terminal, evaluación del Juez y seed de demo |


## Cómo correrlo

```bash
pnpm install
cp .env.example .env.local   # y llena las llaves
pnpm dev
```

- Alumno: `http://localhost:3000` → **Probar sin código**, o el código `PEPE-1B-01` (pruebas) o `PEPE-DEMO-01` a `PEPE-DEMO-45` (demo).
- Maestro: `http://localhost:3000/docente` → PIN de `DOCENTE_PIN`.
- Con `BASE_DATOS=memoria` todo corre sin Supabase y con el grupo de demo cargado en memoria. Se pierde al reiniciar.

| Comando | Qué hace |
|---|---|
| `pnpm test` | 302 tests: máquina (todos los caminos y miles de conversaciones aleatorias), Juez, Pepe, filtro, fluidez, WhatsApp y panel |
| `pnpm typecheck` / `pnpm lint` / `pnpm build` | Revisión de tipos, ESLint y build |
| `pnpm simular [--reto <id>] [--audio nota.m4a]` | Conversación con Pepe en la terminal, con el LLM real |
| `pnpm evaluar-juez` | 26 casos fijos contra el Juez real (gasta tokens) |
| `pnpm probar-whatsapp [nota.m4a]` | Flujo de WhatsApp de punta a punta (webhook firmado, vinculación, botones, voz, privacidad) sin mandar mensajes reales |
| `pnpm reiniciar-pruebas [--desvincular]` | Deja como nuevos a PEPE-1B-01 a 03 antes de una demo |
| `pnpm probar-supabase` | Prueba de integración contra el Supabase real (índice único, versiones, carreras, idempotencia) |
| `pnpm seed-demo` | Siembra el grupo de demo "1° B" (45 alumnos) en Supabase |

## Base de datos (Supabase)

Corre en el **SQL Editor**, en orden:

1. `supabase/migrations/20261123000000_inicial.sql`: tablas, restricciones y RLS.
2. `supabase/migrations/20261123000001_permisos.sql`: permisos para `service_role`. Sin esta migración, el servidor recibe `permission denied`.
3. `supabase/migrations/20261123000002_sesion_activa_unica.sql`: una sola sesión activa por alumno.
4. `supabase/seed.sql`: grupo de pruebas.

Después corre `pnpm seed-demo`, cambia `BASE_DATOS=auto` y verifica con `pnpm probar-supabase`.

## Deploy (Vercel) y WhatsApp (Kapso)

1. Importa el repo en Vercel y copia las variables de `.env.local`, **sin** `BASE_DATOS=memoria`.
2. Deploy a producción.
3. En Kapso, crea el webhook del número con:
   - URL: `https://<dominio-de-producción>/api/whatsapp`. Tiene que ser el dominio de producción: los deployments de preview tienen protección y responden 401.
   - Evento: `whatsapp.message.received`.
   - Secreto: el mismo valor de `KAPSO_WEBHOOK_SECRET`.
   - Buffering: apagado (si está prendido también funciona).
4. Desde el celular registrado en el sandbox, manda tu código (por ejemplo `PEPE-1B-01`) por WhatsApp.

**Ojo con el sandbox de Kapso (lo que aprendimos al probar):**
- El número del sandbox es **compartido** entre proyectos. La sesión de tu celular (*Phone numbers → Sandbox WhatsApp → Sessions → Add session* y mandar el código de 6 letras), el webhook (pestaña *Webhooks* de ese mismo panel) y la `KAPSO_API_KEY` tienen que ser **del mismo proyecto**. Si no, los mensajes llegan pero Kapso rechaza las respuestas con *"Active sandbox session required to send messages"*.
- Los webhooks de *Integrations → Platform webhooks* son del proyecto y **nunca** reciben mensajes.
- Cada celular de prueba se activa desde ese celular. Los mensajes del sandbox gastan créditos del proyecto.
- Los celulares de México llegan como `521…` o `52…`. La app los trata como el mismo número.

## Modelos

Se configuran con `MODEL_PEPE`, `MODEL_JUEZ` y `MODEL_RESPALDO`, en formato `proveedor:modelo` (`groq`, `google` o `anthropic`).

Con el plan gratis de Groq hay un límite de 8K tokens por minuto **por modelo**, y cada mensaje del alumno gasta unos 3,300 (Juez ~2,000 y Pepe ~1,300): unos 5 mensajes por minuto entre todos. Cuando se agota, el Juez tiene prioridad y puede usar los dos modelos de Groq; Pepe solo usa el suyo (y `MODEL_RESPALDO` de otros proveedores) y si no alcanza contesta con el `ejemplo` del paso. Para una demo con varias personas a la vez conviene el plan de pago de Groq.

## Límites conocidos

- **Precisión de lectura:** es *estimada*. La transcripción tiende a "corregir" los errores del alumno.
- **"Asignar reto" por WhatsApp:** solo escribe dentro de las 24 h desde el último mensaje del alumno (regla de WhatsApp). Fuera de esa ventana la sesión queda pendiente hasta que el alumno escriba.
- **Códigos de alumno:** funcionan como acceso (web y vinculación de WhatsApp). Para alumnos reales conviene un sufijo aleatorio (p. ej. `PEPE-1B-07-K3F9`) en vez de números seguidos.
- **Sandbox de Kapso:** solo responde al número registrado. Para el jurado, la web es la puerta principal.

