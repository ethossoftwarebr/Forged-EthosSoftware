-- Extensions habilitadas por padrão em todo Postgres da Forge.
-- Executado uma vez no primeiro start do container (via docker-entrypoint-initdb.d).
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS vector;
