# Entrega · UniconHub Hack (Fase 1)

**Fecha límite:** miércoles 25 de noviembre, 12:00 (CDMX). Se sube en `app.uniconhub.org/e/uniconhub-hack`, una entrega por equipo.

| Entregable | Peso | Dónde está |
|---|---|---|
| Repositorio de GitHub | Requisito | https://github.com/ALFA117/pepe-companero |
| Video pitch (máx. 3 min) | 80 % | Guion abajo (sección 2) |
| Ficha de entrega | 20 % | Textos listos para pegar (sección 1) |

**Demo en vivo:** https://pepe-companero.vercel.app. Para probar como alumno, toca **"Probar sin código"** en el inicio. El panel del maestro está en `/docente`.

---

## 1. Ficha de entrega (lista para pegar)

### Nombre
Pepe, el compañero que se equivoca

### Descripción corta
Pepe es un ajolote de secundaria que hace su tarea **mal a propósito** y le pide ayuda al alumno por WhatsApp o en la web. El alumno tiene que demostrarle dónde está el error. Si se atora, Pepe le da pistas cada vez más concretas, pero **nunca le da la respuesta**. Cuánta ayuda necesitó cada alumno es el diagnóstico que ve su maestro.

### Problema
En PISA 2022 solo el **34 %** de los estudiantes mexicanos de 15 años alcanzó el nivel mínimo en matemáticas (promedio OCDE: 69 %) y el **53 %** en lectura (OCDE: 74 %). Además, hoy cualquier alumno puede pedirle la respuesta a una IA sin entenderla. El maestro, con 40 o más alumnos por grupo, no tiene forma de saber quién entendió de verdad.

### Solución
1. **Identifica el nivel real.** Cada reto tiene una escalera de ayuda del 0 (lo resolvió solo) al 4 (necesitó bajar a un tema previo). El nivel al que llegó el alumno es una medida de lo que sabe, no de lo que copió.
2. **Lo impulsa a esforzarse.** El alumno es el que sabe: tiene que explicar por qué Pepe está mal. Pepe nunca tiene la solución y un filtro bloquea cualquier mensaje que la revele.
3. **Lectura en voz alta.** Antes del reto de lectura, el alumno le lee el texto a Pepe en una nota de voz y se miden palabras por minuto, pausas y precisión estimada. Esas métricas solo las ve el maestro.
4. **Panel del maestro.** Muestra dónde se atora el grupo, quién necesita atención hoy, la conversación de cada alumno y hojas de práctica generadas a partir de las brechas del grupo.

### Stack
- **Canales:** WhatsApp (API de WhatsApp Business vía Kapso) y web móvil. Los dos usan el mismo motor.
- **Web:** Next.js 16 + TypeScript + Tailwind, desplegado en Vercel.
- **Base de datos:** Supabase (Postgres) con RLS.
- **IA:** modelos abiertos *gpt-oss* (20b para redactar y 120b para evaluar) en Groq. Whisper large-v3-turbo transcribe las notas de voz. El proveedor y el modelo se cambian con una variable de entorno.
- **Motor:** máquina de estados en TypeScript puro con 317 pruebas automáticas. **El modelo no decide el nivel:** un modelo clasifica la respuesta, el código decide el nivel y otro modelo solo redacta.

### ¿Por qué el stack se adecúa a México?
- **Llega por WhatsApp,** sin instalar nada y desde cualquier celular. El celular es el principal dispositivo de los 100 millones de usuarios de internet en México (83.1 % de la población, INEGI ENDUTIH 2024). Usa texto y notas de voz, que consumen pocos datos.
- **La web es gratis para el alumno** y sirve en salones con computadora. Las hojas de práctica se imprimen para salones sin conexión.
- **Contenido de 1° de secundaria en español de México,** con contexto cultural propio: lecturas sobre el ajolote de Xochimilco, los cenotes, la mariposa monarca y los tamales; problemas de fracciones, ecuaciones, porcentajes y jerarquía de operaciones.
- **Privacidad de menores desde el diseño:** el audio no se guarda (solo el texto transcrito), y el teléfono se guarda con hash y cifrado, nunca en claro.
- **Cumple la política de WhatsApp Business** que desde el 15 de enero de 2026 prohíbe los chatbots de IA de propósito general: Pepe solo habla del reto.
- **Modelos abiertos y baratos,** sin depender de un solo proveedor. Pueden correr en infraestructura propia si una autoridad educativa lo pide.

- **Rápido en celulares sencillos:** 97 de 100 en rendimiento y 100 en accesibilidad en la prueba de Google (Lighthouse, simulando un celular). Si se cae la señal, el chat lo avisa y reenvía solo.

### ¿Requiere grandes inversiones?
No. Costo estimado con precios públicos de noviembre de 2026 y el consumo real medido en el prototipo:

| Concepto | Costo |
|---|---|
| IA por mensaje del alumno (Juez gpt-oss-120b + Pepe gpt-oss-20b) | ~US$0.0005 |
| IA por reto completo (~8 mensajes, cierre y nota de voz) | **~US$0.005 (unos 10 centavos de peso)** |
| IA por alumno en un ciclo escolar (3 retos por semana, 36 semanas) | **~US$0.55** |
| WhatsApp (Meta, mensaje de servicio en México, ~US$0.0085; los primeros 1,000 al mes son gratis por número) | ~US$0.07 por reto, porque Pepe junta sus burbujas en un solo mensaje |
| Web | US$0 por mensaje |
| Infraestructura para un piloto (Vercel, Supabase y Kapso en planes gratis o de entrada) | De US$0 a ~US$50 al mes |

Lo que hace falta para llevarlo a la realidad:
1. **Número de WhatsApp Business propio y verificado** ante Meta (hoy usamos el sandbox de Kapso).
2. **Aviso de privacidad y consentimiento de madres, padres o tutores,** porque son datos de menores.
3. **Piloto con 1 o 2 escuelas secundarias** para calibrar al Juez con respuestas reales de alumnos.
4. **Más retos alineados al programa de la SEP,** escritos con maestros. El formato ya existe y se valida solo.
5. **Plan de pago de IA** para atender a muchos alumnos al mismo tiempo (el plan gratis da para pocos).

### Originalidad
Los tutores con IA conocidos guían al alumno hacia la respuesta. Pepe invierte los papeles: **el alumno es el experto y la IA es el compañero que se equivoca.** Se apoya en dos líneas de investigación:
- **Aprender enseñando** (*efecto protegido*, Chase et al., 2009).
- **Aprender de ejemplos con errores** (Adams et al., 2014).

No conocemos otra herramienta que junte esto con WhatsApp, un diagnóstico por nivel de ayuda y la medición de fluidez lectora con notas de voz, pensada para secundarias de México.

---

## 2. Guion del video pitch (máx. 3:00)

Cada bloque dice qué criterio de la rúbrica cubre.

| Tiempo | Qué se ve | Qué se dice | Criterio |
|---|---|---|---|
| 0:00–0:15 | El celular con WhatsApp: Pepe manda "1/2 + 1/3 = 2/5 😎 ¿Me la va a calificar bien?" | "Este es Pepe. Hizo su tarea y está mal. Y está mal a propósito." | Gancho |
| 0:15–0:35 | Texto en pantalla: 34 % y 53 % (PISA 2022) | "En México, solo 34 de cada 100 jóvenes de 15 años alcanzan el mínimo en matemáticas, y 53 en lectura. Y hoy cualquier alumno le pide la respuesta a una IA sin entenderla. El reto pide identificar el nivel real de cada estudiante e impulsarlo a esforzarse." | A · Solución al reto |
| 0:35–1:20 | Demo en WhatsApp: "sí, está bien" → botones A/B → "ya dime la respuesta" → "¡Yo tampoco la sé!" → el alumno lo corrige → "¡me salvaste!" | "Construimos a Pepe, un ajolote de secundaria. El alumno tiene que demostrarle dónde se equivocó. Si se atora, Pepe le da pistas cada vez más concretas, pero nunca le da la respuesta: no la conoce." | A · Qué construimos |
| 1:20–1:40 | Reto de lectura: el alumno manda una nota de voz leyendo | "En lectura, el alumno le lee el texto a Pepe en una nota de voz. Medimos su fluidez sin que se sienta examinado." | A · Highlights |
| 1:40–2:10 | Panel del maestro: brechas del grupo, "necesitan atención hoy", la ficha de un alumno, hojas de práctica | "Cuánta ayuda necesitó cada alumno es su nivel real. El maestro ve en qué se atora el grupo, a quién apoyar hoy y hojas de práctica listas para imprimir." | A · Cómo resuelve |
| 2:10–2:30 | Diagrama sencillo: Juez → máquina de estados → Pepe → filtro | "La IA no decide el nivel: un modelo evalúa, nuestro código decide y otro modelo solo redacta. Un filtro bloquea cualquier respuesta, el audio no se guarda y el teléfono va cifrado." | C · Originalidad |
| 2:30–2:50 | Texto en pantalla: "WhatsApp · sin instalar nada · ~10 centavos por reto" | "Funciona por WhatsApp, que ya está en el celular de las familias, o en la web gratis. Cada reto cuesta unos 10 centavos de IA. Para llevarlo a escuelas solo falta un número propio, el consentimiento de las familias y un piloto." | B · Contexto de México |
| 2:50–3:00 | Pepe feliz | "Pepe no le hace la tarea al alumno: lo hace pensar." | Cierre |

**Consejos para grabar:**
- Antes de grabar, corre `pnpm reiniciar-pruebas`.
- Graba el celular en vertical con el modo "No molestar" activado.
- Usa los mensajes exactos de [DEMO.md](DEMO.md) para que Pepe responda igual.
- Deja el video en 2:55 para no pasarte del límite.

---

## 3. Preguntas probables del jurado

- **¿Qué pasa si el alumno insiste en que le den la respuesta?** Pepe no la conoce: no ve la solución. Además, un filtro revisa cada mensaje y, si se le escapa algo, lo cambia por el texto del paso escrito a mano.
- **¿Y si la IA se equivoca al calificar?** Si la confianza es baja, se trata como parcial y el alumno sigue aprendiendo. El Juez se mide con 29 casos fijos (29 de 29) y el nivel lo decide código con 317 pruebas.
- **¿Cómo escala?** Por WhatsApp no hay que instalar nada. El costo de IA es de centavos por alumno y los modelos son abiertos, así que se pueden cambiar de proveedor.
- **¿Qué datos guardan de los menores?** Nombre, código y la conversación en texto. El audio no se guarda y el teléfono está con hash y cifrado.

---

## Fuentes

- OCDE, PISA 2022, nota de país de México: https://www.oecd.org/pisa/publications/Countrynote_MEX_Spanish.pdf
- INEGI, ENDUTIH 2024: https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/endutih/ENDUTIH_24_RR.pdf
- Precios de Groq (noviembre de 2026, según fuentes secundarias; confirmar en console.groq.com): https://www.cloudzero.com/blog/groq-pricing/
- Precios de WhatsApp en México desde el 1 de octubre de 2026 (confirmar en el sitio de Meta): https://chatmaxima.com/blog/whatsapp-service-message-pricing-october-2026/
- Chase, C. C., Chin, D. B., Oppezzo, M. A. y Schwartz, D. L. (2009). *Teachable agents and the protégé effect*. Journal of Science Education and Technology.
- Adams, D. M., McLaren, B. M. et al. (2014). *Using erroneous examples to improve mathematics learning with a web-based tutoring system*. Computers in Human Behavior.
