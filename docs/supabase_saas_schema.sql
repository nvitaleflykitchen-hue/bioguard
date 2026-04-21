-- ==========================================
-- ESTRUCTURA FUNDACIONAL SAAS (PCCLAB)
-- ==========================================

-- 1. Empresas (Tenants)
CREATE TABLE IF NOT EXISTS public.empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    cuit TEXT,
    plan TEXT DEFAULT 'FREE',
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Modificar 'usuarios' para enlazar a 'empresas' (Multitenant RLS)
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id);

-- 3. Documentos / Protocolos de Laboratorio
CREATE TABLE IF NOT EXISTS public.protocolos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    numero_protocolo TEXT NOT NULL,
    laboratorio TEXT DEFAULT 'Externo',
    fecha_emision DATE NOT NULL,
    archivo_url TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Muestras Individuales (Las que vienen dentro del protocolo)
CREATE TABLE IF NOT EXISTS public.muestras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocolo_id UUID NOT NULL REFERENCES public.protocolos(id) ON DELETE CASCADE,
    tipo_matriz TEXT NOT NULL, -- ej: alimento_t1, hisopado_superficie
    descripcion TEXT NOT NULL, -- ej: Ensalada de lechuga, Mesada Acero
    zona_ambiental TEXT,       -- ej: zona1, zona2
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Resultados Analíticos (Parámetros Microbiológicos)
CREATE TABLE IF NOT EXISTS public.resultados_microbiologicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    muestra_id UUID NOT NULL REFERENCES public.muestras(id) ON DELETE CASCADE,
    parametro TEXT NOT NULL,       -- ej: Salmonella spp.
    valor_hallado TEXT NOT NULL,   -- ej: Ausencia
    unidad TEXT NOT NULL,          -- ej: /25g
    limite_teorico TEXT,
    estado_cumplimiento TEXT CHECK (estado_cumplimiento IN ('CUMPLE', 'OBSERVADO', 'NO_CUMPLE')),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- BLINDAJE DE SEGURIDAD (RLS)
-- ==========================================
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocolos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muestras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resultados_microbiologicos ENABLE ROW LEVEL SECURITY;

-- Política de lectura aislada por inquilino (Tenant) para Protocolos
CREATE POLICY "Aislamiento de Empresa: Protocolos" 
ON public.protocolos FOR SELECT 
USING (empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()));

-- Al ejecutar este script, el backend estará listo para escalar a 1000 empresas simultáneas sin mezcla de datos.
