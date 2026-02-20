-- Remove overly broad machine-owner policies that leak tickets/maintenances across users
DROP POLICY IF EXISTS "Machine owner reads tickets" ON public.tickets;
DROP POLICY IF EXISTS "Machine owner reads maintenances" ON public.maintenances;