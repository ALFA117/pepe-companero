# Pepe, el compañero que se equivoca 🦎

MVP para el hackathon UniconHub. Pepe es un compañero de secundaria que **siempre se equivoca a propósito** y le pide ayuda al alumno, que tiene que demostrarle dónde está el error. Si el alumno tampoco sabe, Pepe baja por una **escalera de ayuda** (niveles 0 a 4) sin dar nunca la respuesta. El nivel de ayuda que necesitó cada alumno es el **diagnóstico** que ve el maestro.

- **Matemáticas:** Pepe resuelve un ejercicio con un error típico (por ejemplo, 1/2 + 1/3 = 2/5).
- **Lectura:** el alumno le lee el texto a Pepe en una nota de voz (se mide su fluidez) y luego corrige una conclusión equivocada citando el texto.
- **Canales:** WhatsApp (Kapso, con Twilio de respaldo) y web. Los dos usan el mismo motor.

El plan del proyecto está en [docs/PLAN.md](docs/PLAN.md).

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
| `src/motor/` | Contrato (`tipos.ts`), máquina de estados, Juez, Pepe, filtro, fluidez y orquestador |
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

- Alumno: `http://localhost:3000` → código `PEPE-1B-01` (pruebas) o `PEPE-DEMO-01` a `PEPE-DEMO-45` (demo).
- Maestro: `http://localhost:3000/docente` → PIN de `DOCENTE_PIN`.
- Con `BASE_DATOS=memoria` todo corre sin Supabase y con el grupo de demo cargado en memoria. Se pierde al reiniciar.

| Comando | Qué hace |
|---|---|
| `pnpm test` | 285 tests: máquina (todos los caminos y miles de conversaciones aleatorias), Juez, Pepe, filtro, fluidez, WhatsApp y panel |
| `pnpm typecheck` / `pnpm lint` / `pnpm build` | Revisión de tipos, ESLint y build |
| `pnpm simular [--reto <id>] [--audio nota.m4a]` | Conversación con Pepe en la terminal, con el LLM real |
| `pnpm evaluar-juez` | 23 casos fijos contra el Juez real (gasta tokens) |
| `pnpm seed-demo` | Siembra el grupo de demo "1° B" (45 alumnos) en Supabase |

## Base de datos (Supabase)

Corre en el **SQL Editor**, en orden:

1. `supabase/migrations/20261123000000_inicial.sql`: tablas, restricciones y RLS.
2. `supabase/migrations/20261123000001_permisos.sql`: permisos para `service_role`. Sin esta migración, el servidor recibe `permission denied`.
3. `supabase/seed.sql`: grupo de pruebas.

Después corre `pnpm seed-demo` y cambia `BASE_DATOS=auto`.

## Deploy (Vercel) y WhatsApp (Kapso)

1. Importa el repo en Vercel y copia las variables de `.env.local`, **sin** `BASE_DATOS=memoria`.
2. Deploy a producción.
3. En Kapso, crea el webhook del número con:
   - URL: `https://<dominio-de-producción>/api/whatsapp`. Tiene que ser el dominio de producción: los deployments de preview tienen protección y responden 401.
   - Evento: `whatsapp.message.received`.
   - Secreto: el mismo valor de `KAPSO_WEBHOOK_SECRET`.
   - Buffering: apagado (si está prendido también funciona).
4. Desde el celular registrado en el sandbox, manda tu código (por ejemplo `PEPE-1B-01`) por WhatsApp.

## Modelos

Se configuran con `MODEL_PEPE`, `MODEL_JUEZ` y `MODEL_RESPALDO`, en formato `proveedor:modelo` (`groq`, `google` o `anthropic`).

Con el plan gratis de Groq hay un límite de 8K tokens por minuto **por modelo**. Por eso la cadena de respaldo pasa primero por el otro modelo de Groq antes de usar `MODEL_RESPALDO`. Si de todos modos se agota, Pepe contesta con el `ejemplo` del paso y la conversación sigue.

## Límites conocidos

- **Precisión de lectura:** es *estimada*. La transcripción tiende a "corregir" los errores del alumno.
- **"Asignar reto" por WhatsApp:** solo escribe dentro de las 24 h desde el último mensaje del alumno (regla de WhatsApp). Fuera de esa ventana la sesión queda pendiente hasta que el alumno escriba.
- **Sandbox de Kapso:** solo responde al número registrado. Para el jurado, la web es la puerta principal.
