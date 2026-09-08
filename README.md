# Musaé Spa

SPA para gestionar reservas de un salón de belleza. El proyecto se desarrolla por fases con React, Vite, TypeScript y Supabase.

## Estado actual

Fases 1 y 2 completadas: estructura React/Vite, diseño responsive base, cliente de Supabase preparado, configuración de SPA para Vercel, migración PostgreSQL, datos iniciales y políticas RLS.

## Requisitos

- Node.js 22 o superior.
- Un proyecto de Supabase para aplicar la migración de `supabase/migrations`.

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

## Base de datos y seguridad

- La migración de Fase 2 crea `profiles`, `service_categories`, `services`, `business_hours`, `blocked_dates`, `reservations`, `reservation_items` y `payments`.
- Cada registro relevante posee UUID, fechas de creación/actualización y el usuario responsable cuando existe una sesión autenticada.
- Los precios, nombres y duración de cada servicio se copian a `reservation_items`; por eso una modificación posterior del catálogo no cambia el importe histórico de una reserva.
- RLS permite que cada cliente lea solo su perfil, reservas y pagos. Los servicios activos son públicos.
- Las escrituras de reservas, pagos, catálogo y horarios están bloqueadas en el cliente. Las Edge Functions de las fases posteriores las realizarán después de validar rol, precio y disponibilidad.

Revisa [la guía de Supabase](supabase/README.md) para aplicar la migración y los datos iniciales.

## Tecnologías

- React + Vite + TypeScript
- React Router
- Supabase (Auth, PostgreSQL, RLS y Edge Functions)
- Vercel

Las migraciones, políticas RLS, funciones y configuración de despliegue se incorporarán en las fases posteriores.
