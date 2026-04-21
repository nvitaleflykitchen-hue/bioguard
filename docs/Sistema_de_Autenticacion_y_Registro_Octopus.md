# Sistema de Autenticación y Registro: Octopus Coquinaria

Este documento detalla la arquitectura de autenticación utilizada en Octopus para que pueda ser replicada por Antigravity en otros proyectos.

## 1. Stack Tecnológico
- **Proveedor**: [Supabase](https://supabase.com/) (Auth + PostgreSQL).
- **Librería Cliente**: `@supabase/supabase-js`.
- **Frontend**: React (Context API para manejo de estado global).

## 2. Configuración de Infraestructura (Supabase)

### Variables de Entorno
Se requieren las siguientes variables en el archivo `.env`:
- `VITE_SUPABASE_URL`: La URL del proyecto de Supabase.
- `VITE_SUPABASE_ANON_KEY`: La clave de API anónima.

### Esquema de Base de Datos
Además de la tabla interna de Supabase (`auth.users`), el sistema utiliza una tabla pública llamada `usuarios` para gestionar perfiles extendidos:

```sql
-- Tabla de perfiles extendidos
create table public.usuarios (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  business_name text,
  role text default 'user', -- 'admin', 'consultant', 'manager', 'client', 'user'
  plan text default 'FREE', -- 'FREE' o 'PRO'
  permissions text[],       -- Array de strings (ej: ['view_dashboard'])
  diagnostic_scores jsonb,  -- Datos del diagnóstico inicial
  updated_at timestamp with time zone default now()
);

-- Habilitar RLS (Row Level Security)
alter table public.usuarios enable row level security;

-- Política: Los usuarios pueden leer su propio perfil
create policy "Los usuarios pueden ver su propio perfil" 
on public.usuarios for select 
using (auth.uid() = id);
```

## 3. Implementación en React

### Servicio de Cliente (`supabase.ts`)
```typescript
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Contexto de Autenticación (`AuthContext.tsx`)
El `AuthContext` centraliza:
- El estado de la sesión de Supabase (`user`).
- El perfil extendido desde la tabla `usuarios` (`profile`).
- Helpers de permisos (`hasPermission`, `isAdmin`, `isPrivileged`).

**Flujo de Inicialización:**
1. Al montar el provider, verifica `supabase.auth.getSession()`.
2. Si hay sesión, llama a `fetchProfile(userId)` para traer la metadata de la tabla `usuarios`.
3. Escucha cambios de estado con `supabase.auth.onAuthStateChange`.

## 4. Flujo de Registro (Sign Up)
En Octopus, el registro ocurre integrado en el diagnóstico:
1. El usuario completa los datos.
2. Si elige una contraseña:
   - Se llama a `supabase.auth.signUp({ email, password })`.
   - Inmediatamente se crea/actualiza el registro en la tabla `usuarios` con el `id` devuelto por Auth.

## 5. Roles y Permisos
- **Roles**: `admin`, `consultant`, `manager`, `client`, `user`.
- **Lógica de Privilegios**: Los roles `admin` y `consultant` suelen saltarse las comprobaciones granulares (short-circuit logic).
- **Protección de Rutas**: Un componente `ProtectedRoute` verifica si el usuario está autenticado y si su rol/permisos le permiten acceder a la ruta.

---
**Nota para Antigravity**: Si vas a usar este sistema en otra app, asegúrate de configurar las políticas de RLS en Supabase para proteger los datos de la tabla `usuarios` y habilitar el proveedor de Email en `Authentication -> Providers`.
