import type { ScannedFile } from "../model/project.js";

export const ragDimensions = [
  "source connectors / document ingestion",
  "document normalization / parsing",
  "chunking strategy",
  "metadata model",
  "embedding provider / embedding model",
  "vector store / index schema",
  "retrieval API",
  "hybrid search / keyword + vector",
  "reranking",
  "prompt assembly / context packing",
  "grounded generation / citations",
  "evaluation dataset",
  "retrieval metrics",
  "hallucination checks",
  "observability / tracing",
  "access control / tenant isolation",
  "cache / incremental indexing",
  "failure handling / retries",
  "cost tracking",
  "tests / CI"
] as const;

export type RagDimension = (typeof ragDimensions)[number];

export const ragDependencySignals = [
  "langchain",
  "@langchain/core",
  "@langchain/openai",
  "llamaindex",
  "llama-index",
  "pgvector",
  "qdrant-client",
  "pymilvus",
  "chromadb",
  "faiss",
  "weaviate-client",
  "pinecone",
  "openai",
  "voyage",
  "cohere",
  "sentence-transformers",
  "transformers"
];

export const ragKeywordSignals = [
  "rag",
  "retrieval augmented generation",
  "retriever",
  "reranker",
  "embedding",
  "embeddings",
  "vector",
  "vector store",
  "pgvector",
  "milvus",
  "qdrant",
  "pinecone",
  "weaviate",
  "chroma",
  "faiss",
  "hnsw",
  "ivfflat",
  "chunk",
  "chunking",
  "document loader",
  "loader",
  "ingestion",
  "indexing",
  "semantic search",
  "hybrid search",
  "bm25",
  "recall",
  "precision",
  "mrr",
  "ndcg",
  "citation",
  "grounding",
  "context window",
  "prompt assembly"
];

export function detectRagDimensions(files: ScannedFile[]): Set<RagDimension> {
  const dimensions = new Set<RagDimension>();
  const combined = files
    .map((file) => `${file.relativePath}\n${positiveContent(file.content)}`)
    .join("\n")
    .toLowerCase();

  addIf(dimensions, "source connectors / document ingestion", /ingest|connector|document loader|loader|load documents|sourceuri/.test(combined));
  addIf(dimensions, "document normalization / parsing", /normalize|normalizer|parse|parser|parsing/.test(combined));
  addIf(dimensions, "chunking strategy", /chunk|chunking|token count|tokenbudget/.test(combined));
  addIf(dimensions, "metadata model", /metadata|documentid|sourceuri|section/.test(combined));
  addIf(dimensions, "embedding provider / embedding model", /embedding|embed|text-embedding|sentence-transformers|voyage|openai/.test(combined));
  addIf(dimensions, "vector store / index schema", /vector store|vector index|pgvector|qdrant|pinecone|weaviate|chroma|faiss|hnsw|ivfflat/.test(combined));
  addIf(dimensions, "retrieval API", /retriever|retrieve|retrievalresult|retrievedcontext/.test(combined));
  addIf(dimensions, "hybrid search / keyword + vector", /hybrid|bm25|keyword/.test(combined));
  addIf(dimensions, "reranking", /rerank|reranker|cohere/.test(combined));
  addIf(dimensions, "prompt assembly / context packing", /packcontext|context pack|prompt assembly|context window|token budget/.test(combined));
  addIf(dimensions, "grounded generation / citations", /grounded|citation|citations|generategrounded|answer/.test(combined));
  addIf(dimensions, "evaluation dataset", /evaluation|eval|dataset|golden/.test(combined));
  addIf(dimensions, "retrieval metrics", /recall|precision|mrr|ndcg/.test(combined));
  addIf(dimensions, "hallucination checks", /hallucination/.test(combined));
  addIf(dimensions, "observability / tracing", /observability|trace|tracing|telemetry|recordragtrace/.test(combined));
  addIf(dimensions, "access control / tenant isolation", /tenant|tenantid|access control|permission|authorization/.test(combined));
  addIf(dimensions, "cache / incremental indexing", /cache|incremental|updatedat|upsert/.test(combined));
  addIf(dimensions, "failure handling / retries", /retry|retries|catch\s*\(|failure handling|backoff/.test(combined));
  addIf(dimensions, "cost tracking", /cost|tokens|estimatedcost/.test(combined));
  addIf(dimensions, "tests / CI", /(^|\/)(tests?|__tests__)\/|\.test\.|\.spec\.|vitest|pytest|github\/workflows|ci/.test(combined));

  return dimensions;
}

function positiveContent(content: string): string {
  return content
    .split(/\r?\n/)
    .filter((line) => !isNegativeRagSignal(line))
    .join("\n");
}

function isNegativeRagSignal(line: string): boolean {
  return /(?:\b(no|not|without|missing|lacks?)\b|缺少|没有).{0,100}\b(rag|retriever|retrieval|evaluation|eval|ci|embedding|vector|chunk|indexing|citation|observability|implementation|source)\b/i.test(
    line
  );
}

function addIf(
  dimensions: Set<RagDimension>,
  dimension: RagDimension,
  condition: boolean
): void {
  if (condition) {
    dimensions.add(dimension);
  }
}
