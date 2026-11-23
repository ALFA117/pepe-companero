# Plan del proyecto: Pepe, el compañero que se equivoca

> Documento de trabajo para los 2 devs. La especificación completa está en el brief del hackathon; aquí va **cómo** y **cuándo** la construimos, qué ajustes hacemos tras revisar la documentación real de las APIs y quién hace qué.
>
> Revisado el lunes 23 de noviembre de 2026.

---

## 0. Estado (lunes 23 de noviembre, tarde)

Las 8 fases están hechas y cada una tiene su commit. Pasan 295 tests, la revisión de tipos, lint y `pnpm build`.

| Fase | Estado | Probado contra servicios reales |
|---|---|---|
| 0 Base | ✅ | — |
| 1 Motor | ✅ | — (puro) |
| 2 Juez + Pepe | ✅ | Groq: conversación completa; Juez 23/23 en `pnpm evaluar-juez` |
| 3 Chat web | ✅ | Navegador (móvil), con Groq |
| 4 WhatsApp | ✅ código + tests | ❌ falta el webhook en Kapso (necesita la URL de producción) |
| 5 Voz | ✅ | Groq whisper con notas de voz reales |
| 6 Panel | ✅ | Navegador, con datos de demo en memoria |
| 7 Contenido + demo | ✅ | — |

**Cambios al plan original:**
- Proveedor de IA: Groq (`gpt-oss-20b` para Pepe y `gpt-oss-120b` para el Juez) y Google de respaldo, en vez de Anthropic.
- Transcripción con Groq en vez de OpenAI.

**Pendientes para la noche:**
1. Correr `supabase/migrations/20261123000001_permisos.sql` y `20261123000002_sesion_activa_unica.sql` (hoy Supabase responde `permission denied`), luego `pnpm seed-demo` y cambiar `BASE_DATOS=auto`.
2. Cambiar la identidad de git por la personal, hacer el push y el deploy en Vercel con las variables.
3. Crear el webhook de Kapso apuntando al dominio de producción, con `KAPSO_WEBHOOK_SECRET`.
4. La llave de Google no tiene créditos: el respaldo final no sirve hasta que se recargue o se cambie de modelo.
5. Decidir si los códigos de alumno reales llevan sufijo aleatorio (hoy son adivinables: PEPE-1B-01, -02…).
6. Groq gratis: 8K tokens por minuto por modelo. Con varios alumnos a la vez se va a llegar al límite; Pepe cae al `ejemplo` y el Juez a `parcial`.

---

## 1. Fechas clave (hora de CDMX)

| Cuándo | Qué |
|---|---|
| **Lun 23, tarde** | Fase 0 y contratos compartidos (tipos, interfaz `Canal`, esquema de BD) |
| **Lun 23, noche** | Cuentas personales: GitHub, Vercel, Supabase, Kapso, Anthropic, OpenAI. Primer push y deploy |
| **Mar 24, 22:00** | **Congelamos funciones.** A partir de aquí solo se arreglan bugs, se pule y se prepara la demo |
| **Mié 25, 05:00** | **Entrega** |

Quedan unas 38 horas. La ruta crítica es: **máquina de estados → Juez/Pepe → chat web → panel básico**. WhatsApp y la voz van en paralelo, pero la demo tiene que funcionar aunque fallen, porque el jurado puede usar la web.

---

## 2. Reparto entre los 2 devs

Primero se define el contrato y luego cada quien avanza en paralelo, en su propia rama.

| | **Dev A: motor e IA** | **Dev B: web, datos y canales** |
|---|---|---|
| Fase 0 | `src/motor/tipos.ts` y la interfaz `Canal` (el contrato) | Scaffold de Next.js, shadcn, migraciones, cliente de Supabase |
| Fase 1 | `maquina.ts` + tests, `cargar.ts` + los 2 retos | — (termina la Fase 0 y las consultas de `db/`) |
| Fase 2 | `juez.ts`, `pepe.ts`, `filtro.ts`, `procesar.ts`, `scripts/simular.ts` | Fase 3: `/api/chat` y `/alumno/[codigo]` (al principio con un motor simulado) |
| Siguiente | Fase 5: transcripción y `fluidez.ts` | Fase 4: Kapso, webhook y vinculación |
| Después | Fase 7: los 8 retos nuevos | Fase 6: panel docente + `seed-demo.ts` |
| Al final | README y guion de la demo | QA de los criterios de aceptación en producción |

**Llaves y cuentas:** las lleva el dev que dijo "yo me encargo de las API". Solo se guardan en `.env.local`, que nunca se sube al repo. `.env.example` lleva las variables vacías.

**Git:** `main` siempre tiene que compilar. Cada fase va en su rama (`fase-1-motor`, `fase-3-web`, …) y se integra a `main` cuando sus tests pasan. Hasta la noche trabajamos sin remoto y con una identidad de git provisional en el repo. Antes del primer push la cambiamos por la personal y reescribimos el autor de los commits.

---

## 3. Ajustes tras revisar la documentación real

Son los puntos donde el brief choca con las APIs, o donde le falta algo. **Hay que aprobarlos antes de implementarlos.**

### 3.1 Teléfono: el hash no sirve para enviar mensajes ⚠️
El brief pide guardar el teléfono **solo como hash**, pero el botón **"Asignar reto"** tiene que mandarle un WhatsApp al alumno, y Kapso necesita el número (`to`). Con un hash no se puede.
**Propuesta:** guardar `tel_hash` para buscar al alumno y además `tel_cifrado`, cifrado con AES-256-GCM y una llave en `TEL_CIFRADO_KEY`. Así el teléfono nunca queda en claro, que es lo que pide la regla 4. Agregamos la variable a `.env.example`.

### 3.2 Ventana de 24 horas de WhatsApp ⚠️
Kapso indica que fuera de la ventana de 24 horas solo se pueden mandar **plantillas aprobadas**, y el sandbox no permite plantillas.
**Propuesta:** "Asignar reto" crea la sesión nueva siempre.
- Si el alumno escribió en las últimas 24 horas, se le manda el primer mensaje por WhatsApp.
- Si no, la sesión queda pendiente y arranca en cuanto el alumno escriba algo. El panel muestra "Se enviará cuando el alumno escriba".

La plantilla real queda fuera del MVP.

### 3.3 Webhook de Kapso (confirmado en su documentación)
- **Firma:** header `X-Webhook-Signature`, HMAC-SHA256 del **cuerpo crudo**, en hex. Se compara con `timingSafeEqual`. Hay que leer `req.text()` antes de parsear el JSON.
- **Evento:** `whatsapp.message.received`, que llega en el header `X-Webhook-Event`.
- **Campos:** `message.id`, `message.from`, `message.type` (`text` / `interactive` / `audio`), `message.text.body`, `message.interactive.button_reply.{id,title}`, `message.audio.id` y `phone_number_id`.
- **Reintentos:** cualquier respuesta distinta de 200 se reintenta (al instante, a los 10 s y a los 40 s) y hay que contestar en menos de 10 s. Respondemos 200 y procesamos con `after()`, que es estable desde Next 15.1. Ponemos `maxDuration = 60` en la ruta.
- **Idempotencia:** `message.id` va en `turnos.mensaje_externo_id`, que es `unique`, así que el `insert` falla si el mensaje ya llegó. El header `X-Idempotency-Key` queda como respaldo.
- **Buffering de Kapso:** lo dejamos apagado. Si llega `batch: true`, iteramos `data[]`.
- **Escribiendo…:** usamos `messages.markRead({ typingIndicator: { type: 'text' } })`. El indicador dura unos 25 s o hasta que mandamos el mensaje.
- **Audio:** se descarga en dos pasos. Primero `GET /{media_id}?phone_number_id=…` devuelve `download_url`, que expira en unos 4 minutos. Luego se hace `GET` a esa URL, que regresa los bytes. Todo se procesa en memoria, sin pasar por Storage.
- **Envío:** paquete `@kapso/whatsapp-cloud-api` (`sendText`, `sendInteractiveButtons`). La documentación que leímos no menciona los límites de 3 botones y 20 caracteres; los aplicamos igual porque son los de WhatsApp.
- **Sandbox:** solo recibe mensajes el número registrado. Para el jurado, la puerta principal es la web.

### 3.4 Transcripción
- Hoy, **solo `whisper-1`** da marcas de tiempo por palabra (`response_format: "verbose_json"`, `timestamp_granularities: ["word"]`). Está marcado como obsoleto, pero funciona hasta el 26 de febrero de 2027, así que lo usamos.
- Formatos: acepta `ogg` (WhatsApp) y `webm` (el MediaRecorder del navegador). El límite es 25 MB. Hay que mandar el nombre de archivo con su extensión.
- Sin `prompt` y con `language: "es"`.

### 3.5 AI SDK
- La versión actual es **AI SDK 7**: solo ESM y requiere Node 22 o más (tenemos Node 26).
- La salida estructurada se pide con `generateText({ output: Output.object({ schema }) })`.
- El límite de 8 s se pone con `abortSignal: AbortSignal.timeout(8000)`.
- Usamos zod 4.

### 3.6 Huecos del brief que llenamos
- **Carreras de mensajes:** en WhatsApp los alumnos mandan 2 o 3 burbujas seguidas. Agregamos `sesiones.version int`: cada transición hace `update … where version = X` y, si choca, se recarga y se reintenta. Así dos turnos no pisan la misma sesión.
- **"Pepe insiste una vez" en `leyendo_texto`:** hace falta guardar ese estado. Agregamos la columna `sesiones.insistio_lectura bool`.
- **Confianza menor a 0.5 → `parcial`:** en ese caso forzamos `detecto_error = false`, para que una evaluación dudosa no active el atajo al nivel 3.
- **Siguiente reto:** con 10 retos casi todos son de dificultad 1. Si no hay uno "más difícil del mismo concepto", se busca otro del mismo concepto, luego otro de la misma materia y, si no queda ninguno, ninguno. Guardamos `sesiones.siguiente_reto_id`.
- **Sesión pendiente:** agregamos el valor `pendiente` a `fase`, para el caso de 3.2.
- **Deploy:** se hace hasta la noche, con las cuentas personales. Hasta entonces, el entregable de la Fase 0 es "compila y corre en local".
- **Supabase en local:** no hay Docker en la máquina. Las migraciones se escriben en SQL y se aplican al proyecto en la nube con `supabase db push` en la noche. Mientras tanto, `db/` se programa contra los tipos.

---

## 4. Fases, con su plan y su forma de probarlas

Al cerrar cada fase: tests en verde, commit, un resumen corto y visto bueno para seguir.

### Fase 0: Base · Dev B (+ contrato de Dev A) · ~2 h
1. Instalar pnpm. Crear Next 16 con App Router, TypeScript estricto, Tailwind y `src/`.
2. shadcn/ui, Recharts, zod 4, `ai` + `@ai-sdk/anthropic`, `@supabase/supabase-js`, Vitest.
3. Estructura de carpetas de la sección 4 del brief.
4. `supabase/migrations/0001_inicial.sql`: las tablas del brief + los ajustes de la sección 3, con RLS activado y sin políticas públicas.
5. `src/db/cliente.ts` con `import 'server-only'` y la service role key.
6. `.env.example` (incluye `TEL_CIFRADO_KEY`) y `.gitignore`.
7. **Contrato:** `motor/tipos.ts` y `canales/tipos.ts`, para que los dos devs puedan avanzar en paralelo.

**Se prueba con:** `pnpm build` y `pnpm test` en verde. En la noche: la URL de producción abre.

### Fase 1: Motor sin LLM · Dev A · ~3 h
1. Esquema zod de `Reto` en `cargar.ts`, que valida además que el último paso de cada nivel vuelva a la pregunta del reto (por ahora, con una revisión manual).
2. Los 2 retos del brief como JSON.
3. `transicion(sesion, evento, reto) → { sesion, accion }`: función pura. `accion` le dice a Pepe qué redactar (`plantear`, `insistir_lectura`, `pedir_justificacion`, `abrir_no_se`, `regresar_al_reto`, `cerrar`, `despedir_requiere_docente`, …).
4. Tests de todos los caminos de la sección 5 del brief, para los dos retos:
   - del 0 al 4 y `requiere_docente`;
   - atajo del 1 al 3;
   - pedir la respuesta (sube el contador y sube de nivel);
   - resolver en nivel 0 con y sin justificación, y la segunda vez sin justificar → `parcial`;
   - `fuera_de_tema` (no cambia nada);
   - `paso_correcto` en el último paso → `parcial`;
   - confianza menor a 0.5;
   - `leyendo_texto` con audio, con texto 1 vez y con texto 2 veces;
   - `cierre` → `terminado` + siguiente reto.

**Se prueba con:** `pnpm test` en verde.

### Fase 2: Juez + Pepe · Dev A · ~4 h
1. `juez.ts`: prompt + `EvaluacionTurno` y `EvaluacionFinal`. Recibe la solución y la rúbrica.
2. `pepe.ts`: prompt de personalidad + `SalidaPepe`. **No recibe** `solucion_para_juez`, y hay un test que lo garantiza revisando el prompt armado.
3. `filtro.ts`: normaliza, busca `prohibido_para_pepe`, regenera una vez y, si vuelve a fallar, usa el `ejemplo`. El mismo respaldo aplica si pasa de 8 s o si el JSON es inválido. Lleva tests con un LLM simulado.
4. `procesar.ts`: orquesta todo con dependencias inyectadas (juez, pepe, repo, transcriptor), para poder probarlo sin red.
5. `scripts/simular.ts`: chat en la terminal contra el motor real, con la BD en memoria.

**Se prueba con:** una conversación completa del reto 1 en la terminal, con el LLM real, probando "ya dime la respuesta" y "hazme mi tarea de historia".

### Fase 3: Chat web · Dev B · ~4 h (en paralelo con la Fase 2)
1. `db/` con las consultas de sesiones, turnos, evaluaciones y alumnos.
2. `POST /api/chat`: recibe `{ codigo, texto | boton | audio }` → `procesar` → guarda → devuelve los mensajes de Pepe.
3. `/alumno/[codigo]`: chat estilo WhatsApp, móvil primero, con chips para los botones y burbujas que aparecen poco a poco.
4. Grabación de audio con MediaRecorder: en esta fase solo se envía; se transcribe en la Fase 5.

**Se prueba con:** resolver el reto 1 desde el celular.

### Fase 4: WhatsApp · Dev B · ~4 h
1. `canales/kapso.ts` con la interfaz `Canal`.
2. `/api/whatsapp`: firma → 200 inmediato → `after()` → idempotencia → vinculación por código → "escribiendo…" → burbujas y botones.
3. `canales/twilio.ts` como respaldo, eligiendo con `CANAL_WHATSAPP`. Los botones van como opciones numeradas.
4. Tests: firma válida e inválida, payload duplicado, batch.

**Se prueba con:** resolver el reto 1 por WhatsApp en el sandbox, y verificar que un mensaje reenviado no recibe dos respuestas.

### Fase 5: Voz · Dev A · ~3 h
1. `transcribir.ts` con whisper-1 y palabras con marcas de tiempo, todo en memoria.
2. Borrar el audio: el buffer se descarta y no se sube nada a Storage.
3. `fluidez.ts`: normalización, alineación con Levenshtein por palabra, ppm, precisión estimada y pausas largas. Tests con lectura perfecta, con palabras omitidas y con pausas.
4. Fase `leyendo_texto` conectada en la web y en WhatsApp.

**Se prueba con:** el reto 2 completo con nota de voz; las métricas quedan en `fluidez` y el audio no se guarda en ningún lado.

**Si no da el tiempo:** quedarse solo con transcripción + ppm.

### Fase 6: Panel docente · Dev B · ~5 h
1. Protección con PIN: middleware + cookie `httpOnly`.
2. `/docente`: indicadores, "dónde se atora el grupo" (Recharts), "necesitan atención hoy" y la tabla filtrable.
3. `/docente/alumno/[id]`: explicación final, banderas ✓/✗, conversación y "Asignar reto" (con la regla de las 24 horas de 3.2).
4. Hojas de práctica: **se recortan primero.**

**Se prueba con:** el panel refleja las sesiones reales de las fases 3 a 5.

### Fase 7: Contenido y pulido · los dos · ~4 h
1. 8 retos nuevos (Dev A). Los textos de lectura son originales, de 70 a 110 palabras, y cada error plantado es un error típico real.
2. `seed-demo.ts`: "1° B", 45 alumnos ficticios y una semana de sesiones (Dev B).
3. README con la arquitectura y cómo correrlo, y el guion de la demo.

**Se prueba con:** el panel se ve lleno y alguien de fuera puede probarlo solo.

---

## 5. Calendario por bloques

| Bloque | Dev A | Dev B |
|---|---|---|
| Lun tarde | Contrato (tipos) → Fase 1 | Fase 0 |
| Lun noche | Fase 1 (cierre) | Cuentas personales, push, deploy, `db push`, sandbox de Kapso |
| Mar mañana | Fase 2 | Fase 3 |
| Mar mediodía | Integrar 2 + 3 → **primera demo de punta a punta en la web** | |
| Mar tarde | Fase 5 | Fase 4 |
| Mar tarde-noche | Fase 7 (retos) | Fase 6 + seed |
| **Mar 22:00** | **Congelamos funciones** | |
| Mar 22:00 – Mié 03:00 | QA de los criterios en producción, ensayo de la demo, README | |
| Mié 03:00 – 05:00 | Margen y entrega | |

---

## 6. Qué se recorta, en orden

1. Hojas de práctica.
2. Twilio de respaldo.
3. Alineación palabra por palabra (se queda solo ppm).
4. Indicador de "escribiendo".
5. "Asignar reto" por WhatsApp (se queda solo en la web).

**Nunca se recortan:** la máquina de estados con tests, el Juez con JSON, el filtro anti-respuesta y el panel básico.

---

## 7. Riesgos

| Riesgo | Mitigación |
|---|---|
| El LLM tarda o falla en la demo en vivo | Respaldo con el `ejemplo` a los 8 s. Haiku para Pepe |
| Kapso o el sandbox fallan el día de la demo | La web es la vía principal. Twilio, si da tiempo |
| La transcripción "corrige" la lectura | La UI dice "precisión estimada" |
| El Juez se equivoca con respuestas informales | Ejemplos informales en su prompt. Si la confianza es menor a 0.5, se trata como `parcial` |
| Las cuentas personales se configuran tarde | Todo corre en local con `.env.local`. El deploy no bloquea el desarrollo |
| Dos mensajes seguidos pisan la sesión | Columna `version` con bloqueo optimista |

---

## 8. Criterios de aceptación → cómo se verifican

| Criterio | Verificación |
|---|---|
| Del nivel 0 al 4 en el reto 1 sin que aparezca "5/6" | Test de la máquina + test del filtro + recorrido manual en producción |
| "Ya dime" nunca revela la respuesta | Test del filtro en todos los niveles + prueba manual |
| Un tema fuera del reto lo regresa al reto | Test de la máquina + prompt de Pepe + prueba manual |
| La voz genera fluidez y no deja el audio | Tests de `fluidez` + revisar Storage y la BD |
| Un webhook duplicado no genera dos respuestas | Test de idempotencia + reenviar el payload con curl |
| Respaldo a los 8 s | Test con un LLM simulado que tarda 9 s |
| El panel muestra ayuda, brechas y explicación | Revisión manual con el seed + sesiones reales |
| Todo corre en el dominio de producción | QA final del martes en la noche |

---

## 9. Pendientes por decidir

- [ ] Aprobar los ajustes de la sección 3 (sobre todo 3.1, `tel_cifrado`, y 3.2, la ventana de 24 horas).
- [ ] Confirmar el reparto Dev A / Dev B.
- [ ] Carpeta definitiva del proyecto en la máquina.
- [ ] Nombre y correo de la identidad personal de git (en la noche).
