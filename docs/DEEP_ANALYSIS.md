# Deep Analysis

Deep analysis is not keyword counting. Every conclusion must be tied to evidence, and missing evidence must remain visible.

## Topic Analyzer

The generic topic analyzer supports these default topics:

- `rag`
- `agent`
- `llm-gateway`
- `prompt-management`
- `workflow`
- `i18n`
- `billing`
- `auth`
- `multi-tenant`
- `observability`
- `evaluation`
- `vector-search`
- `embedding`
- `deployment`
- `ci`
- `security`

Each topic can use:

- keyword signals
- file path signals
- dependency signals
- config signals
- code pattern signals
- negative or missing signals
- a maturity rubric

## Evidence Model

Deep conclusions use this evidence shape:

```ts
interface Evidence {
  projectName: string;
  filePath: string;
  lineStart?: number;
  lineEnd?: number;
  signal: string;
  snippet: string;
  confidence: "low" | "medium" | "high";
}
```

Findings without evidence should be presented as inference.

## Maturity Model

Topic maturity is normalized to:

- `none`
- `mention_only`
- `design_only`
- `prototype`
- `partial`
- `production_ready`

Rules:

- `mention_only`: only README/docs/comment mentions were found.
- `design_only`: architecture, interface, schema, or flow exists without core implementation.
- `prototype`: limited implementation or demo exists without a full verification chain.
- `partial`: an engineering chain is visible, but production concerns such as evaluation, observability, security, tenant isolation, failure handling, or CI are incomplete.
- `production_ready`: core chain, tests, configuration, observability or evaluation, security boundary, documentation, and CI-like signals are present.

## RAG Analyzer

The RAG analyzer detects twenty dimensions:

1. source connectors / document ingestion
2. document normalization / parsing
3. chunking strategy
4. metadata model
5. embedding provider / embedding model
6. vector store / index schema
7. retrieval API
8. hybrid search / keyword + vector
9. reranking
10. prompt assembly / context packing
11. grounded generation / citations
12. evaluation dataset
13. retrieval metrics
14. hallucination checks
15. observability / tracing
16. access control / tenant isolation
17. cache / incremental indexing
18. failure handling / retries
19. cost tracking
20. tests / CI

It recognizes signals such as RAG, retriever, reranker, embeddings, vector store, pgvector, Milvus, Qdrant, Pinecone, Weaviate, Chroma, FAISS, HNSW, IVFFlat, chunking, document loader, ingestion, indexing, semantic search, hybrid search, BM25, recall, precision, MRR, NDCG, citation, grounding, context window, and prompt assembly.

It also reads dependency signals such as LangChain, LlamaIndex, pgvector, qdrant-client, pymilvus, chromadb, faiss, weaviate-client, pinecone, OpenAI embeddings, Voyage, Cohere rerank, sentence-transformers, and transformers.

## Recommendation Engine

The recommendation engine looks for:

- multiple projects with the same topic
- repeated implemented dimensions
- strongest reference project candidates
- missing production dimensions
- platformization risk

For RAG, the recommended shared architecture is:

Source Connector -> Document Normalizer -> Chunker -> Metadata Extractor -> Embedding Adapter -> Vector Index -> Retriever -> Hybrid Search -> Reranker -> Context Packer -> Grounded Generator -> Citation Verifier -> Evaluation Harness -> Observability & Cost Dashboard -> Access Control / Tenant Isolation

Shared platform modules should own ingestion, normalization, chunking, embedding, indexing, retrieval, reranking, citation checks, evaluation, observability, cost tracking, and tenant isolation. Business projects should own data-source selection, permission policy, and business prompt behavior.
