# Guion de la demo (4 a 5 minutos)

## Antes de presentar (10 minutos antes)

1. `pnpm reiniciar-pruebas` para dejar como nuevos a PEPE-1B-01, 02 y 03 y borrar a los visitantes de "Probar sin código". El grupo de demo de 45 alumnos no se toca.
2. En la laptop, abre `https://<dominio>/docente` y entra con el PIN.
3. En el celular, abre `https://<dominio>` y escribe `PEPE-1B-01`. Que salga el reto y **no contestes todavía**. Si contesta, Groq está bien.
4. Si vas a mostrar WhatsApp, usa el celular registrado en el sandbox de Kapso. Si ya estaba vinculado de otra prueba, corre `pnpm reiniciar-pruebas --desvincular`.
5. Prueba el micrófono del celular: la web pide permiso la primera vez.

## Guion

### 1. El problema (20 s)

> Un maestro de secundaria tiene 45 alumnos y no sabe quién entendió y quién no. Los tutores con IA le dan la respuesta al alumno. Pepe hace lo contrario: es un compañero que **se equivoca a propósito** y el alumno tiene que corregirlo. Cuánta ayuda necesitó para lograrlo es el diagnóstico.

### 2. El alumno corrige a Pepe: matemáticas (1 min 30 s)

En el celular con `PEPE-1B-01`:

| Escribes | Qué mostrar |
|---|---|
| `sí, está bien` | Pepe baja al nivel 1 y da **opciones con botones** |
| Toca **Las dos están bien** | Baja otro escalón: ahora usa pizza |
| `ya dime la respuesta` | "¡Yo tampoco la sé!": **nunca da la respuesta** |
| `hazme mi tarea de historia` | Regresa al reto en una frase |
| `está mal, no se suman los de abajo porque son pedazos de distinto tamaño, da 5/6` | Lo reconoce y le pide que lo explique con sus palabras |
| `los de abajo dicen el tamaño de los pedazos, hay que igualarlos` | Se despide |

> El modelo no decide el nivel. Un Juez clasifica la respuesta, una máquina de estados con tests decide el nivel y Pepe solo redacta. Pepe nunca ve la solución, y un filtro revisa cada mensaje antes de mandarlo.

### 3. Lectura en voz alta (1 min)

1. En el panel, cambia al grupo **1° B (pruebas)**, abre **Alumno Prueba 1** y en **Asignar reto** elige **El ajolote de Xochimilco**.
2. En el celular, escribe `hola`. Pepe manda el texto y pide una nota de voz.
3. Graba leyendo el texto. Pepe da su conclusión equivocada (la pesca).
4. Contesta: `no, el texto dice que es por la contaminación y la tilapia`.

> El audio se transcribe y se borra: nunca se guarda. Con la transcripción medimos palabras por minuto, pausas largas y precisión estimada, y eso **solo lo ve el maestro**.

### 4. El panel del maestro (1 min 30 s)

Cambia al grupo **1° B** (demo, 45 alumnos, una semana de datos):

- **Indicadores:** alumnos activos, retos resueltos y ayuda promedio.
- **Dónde se atora el grupo:** fracciones equivalentes, por ejemplo. Es lo que el maestro repasa mañana.
- **Necesitan atención hoy:** quién lee lento o necesitó la ayuda máxima dos veces seguidas.
- **Ficha de un alumno** (Diego Gutiérrez): nivel de ayuda, fluidez y la conversación completa.
- **Hojas de práctica:** se generan a partir de las brechas del grupo, listas para imprimir.

### 5. WhatsApp (30 s, opcional)

Desde el celular del sandbox, manda `PEPE-1B-02` al número de Kapso. Pepe lo conecta y plantea el reto ahí mismo: es el mismo motor que la web.

> El teléfono se guarda como hash con sal, para encontrar al alumno, y cifrado, para que el maestro le asigne retos. Nunca en claro.

### 6. Cierre (15 s)

> Pepe no le hace la tarea al alumno: lo hace pensar. Y el maestro sabe en un vistazo quién necesita ayuda y en qué.

## Si algo falla

| Falla | Qué hacer |
|---|---|
| Pepe tarda o el límite de Groq se agota | No pasa nada visible: después de 8 s, Pepe contesta con el texto del paso escrito a mano. Sigue la demo |
| WhatsApp no contesta | Sáltate el paso 5; la web es la vía principal |
| No hay micrófono o no da permiso | En el paso 3, escribe `no puedo grabar` y Pepe sigue sin la lectura |
| Se cae el internet del lugar | Corre `pnpm dev` en la laptop con `BASE_DATOS=memoria` y usa `localhost:3000` (necesita internet para Groq; sin él, Pepe usa sus respuestas escritas a mano) |
| Un alumno quedó a medias de otra prueba | `pnpm reiniciar-pruebas` |

## Preguntas que pueden hacer

- **¿Y si el alumno le pide la respuesta de mil formas?** Pepe no la conoce: no ve la solución. Además, un filtro bloquea cualquier mensaje con la respuesta y lo cambia por el texto del paso.
- **¿Quién decide el nivel de ayuda?** Una máquina de estados en TypeScript con cientos de tests. El modelo solo clasifica la respuesta, y si su confianza es baja, se trata como parcial.
- **¿Qué guardan del alumno?** Su nombre, su código y la conversación en texto. El audio no se guarda y el teléfono no está en claro.
- **¿Cuánto cuesta?** Unos 3,300 tokens por mensaje del alumno, en modelos abiertos de Groq.
