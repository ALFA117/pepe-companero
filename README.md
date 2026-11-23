# Pepe, el compañero que se equivoca

MVP para el hackathon UniconHub. Pepe es un compañero de secundaria que siempre se equivoca a propósito, y el alumno tiene que demostrarle dónde está el error. El nivel de ayuda que necesita cada alumno es el diagnóstico que ve el maestro.

El plan completo está en [docs/PLAN.md](docs/PLAN.md).

## Cómo correrlo

```bash
pnpm install
cp .env.example .env.local   # y llena las llaves
pnpm dev
```

| Comando | Qué hace |
|---|---|
| `pnpm test` | Tests del motor (Vitest) |
| `pnpm typecheck` | Revisión de tipos |
| `pnpm lint` | ESLint |
| `pnpm build` | Build de producción |

## Base de datos

En Supabase, corre `supabase/migrations/*.sql` en orden y luego `supabase/seed.sql`. Todas las tablas tienen RLS activado y sin políticas: solo el servidor, con la service role key, puede leerlas.
