-- Full-text search for documents (Postgres FTS first, per roadmap Phase 3).
-- Prisma cannot express tsvector triggers/GIN indexes, so this runs as a manual
-- migration step after `prisma migrate` creates the `documents.search_vector`
-- column (typed Unsupported("tsvector") in schema.prisma).

-- GIN index over the search vector.
CREATE INDEX IF NOT EXISTS documents_search_vector_gin
  ON documents USING GIN (search_vector);

-- Maintain the vector from title + type + the document's tag labels.
CREATE OR REPLACE FUNCTION documents_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.type, '')), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS documents_search_vector_trg ON documents;
CREATE TRIGGER documents_search_vector_trg
  BEFORE INSERT OR UPDATE OF title, type ON documents
  FOR EACH ROW EXECUTE FUNCTION documents_search_vector_update();
