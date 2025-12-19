-- Enable full row replication for real-time updates
ALTER TABLE public.shopping_lists REPLICA IDENTITY FULL;