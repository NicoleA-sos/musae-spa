# Musaé Spa

SPA para gestionar reservas de un salón de belleza. El proyecto se desarrolla por fases con React, Vite, TypeScript y Supabase.

## Estado actual

Fase 1 completada: estructura React/Vite, rutas iniciales, diseño responsive base, cliente de Supabase preparado y configuración de SPA para Vercel.

## Requisitos

- Node.js 22 o superior.
- Un proyecto de Supabase (se configurará en las siguientes fases).

## Ejecución local

1. Copia `.env.example` como `.env.local`.
2. Completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` cuando tengas el proyecto de Supabase.
3. Instala dependencias con `npm install`.
4. Ejecuta `npm run dev`.

## Validación

```bash
npm run typecheck
npm run lint
npm run build
```

## Tecnologías

- React + Vite + TypeScript
- React Router
- Supabase (Auth, PostgreSQL, RLS y Edge Functions)
- Vercel

Las migraciones, políticas RLS, funciones y configuración de despliegue se incorporarán en las fases posteriores.
