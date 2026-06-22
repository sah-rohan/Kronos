// GenAI system-design modules, built on the same SDProblem engine as the
// classic system-design problems. Content is paraphrased in our own words.
import type { SDProblem } from "./problems";

// ---------- Gmail Smart Compose ----------
const SC = {
  input: { type: "client", name: "User Input", blurb: "Partial text", explain: "What the user has typed so far in the email. The system suggests the next words inline as they type, so latency must be tiny." },
  trigger: { type: "trigger", name: "Triggering Service", blurb: "Decides when to suggest", explain: "Not every keystroke deserves a suggestion. The triggering service decides when to call the model (e.g. at word boundaries, enough context) to control cost and avoid noisy suggestions." },
  model: {
    type: "llm", name: "Phrase Generator", blurb: "Language model",
    explain: "A transformer language model that, given the text so far, predicts the next phrase. The key decision is how it picks tokens from its probability distribution.",
    configs: [
      { id: "decode", question: "Decoding strategy?", options: [{ id: "greedy", label: "Greedy" }, { id: "beam", label: "Beam search" }, { id: "topp", label: "Top-p sampling" }], correct: "beam", why: "Beam search: it tracks the top few candidate sequences at each step, producing coherent, high-confidence completions. For autocomplete you want safe, likely text, not the diversity that top-p adds; greedy is too short-sighted and gets stuck." },
    ],
  },
  post: { type: "postproc", name: "Post-processing", blurb: "Filter suggestions", explain: "Filters out low-confidence or overly long suggestions, applies safety/style rules, and only surfaces a completion the user is likely to accept." },
  out: { type: "output", name: "Suggestion", blurb: "Inline completion", explain: "The accepted-looking phrase shown grayed-out in the compose box; the user presses Tab to accept it." },
} as const;
const SMART_COMPOSE: SDProblem = {
  slug: "genai-smart-compose", title: "Gmail Smart Compose", difficulty: "Medium",
  summary: "Suggest the next words as a user types - fast, coherent, low-friction.",
  slides: [
    { title: "What we're building", body: "Inline text completion: as you write an email, the system suggests the next phrase you can accept with Tab.", bullets: ["Must be near-instant (it fires while typing).", "Suggestions should be safe and likely, not creative.", "Only suggest when it's actually helpful."] },
    {
      title: "Concepts in this module",
      body: "The terms this design depends on, defined before we use them:",
      bullets: [
        "Language model: a model that, given text so far, predicts the next words. That's what powers the suggestion.",
        "Token: a chunk of text the model reads/writes (roughly a word).",
        "Latency: how long one request takes - it must be tiny here since suggestions appear as you type.",
      ],
    },
    { title: "The pipeline", body: "A short pipeline keeps it fast.", bullets: ["Input → Triggering Service → Phrase Generator → Post-processing → Suggestion.", "The triggering service decides when to call the model, so it doesn't run on every keystroke."] },
    { title: "Positional encoding", body: "A transformer has no built-in sense of order, so each token's position is encoded. Two options:", bullets: ["Sin-cosine (fixed): no extra parameters, handles long sequences, but can be suboptimal.", "Learned: positions learned in training - better fit, but more parameters and weaker generalization."] },
    {
      title: "Picking the decoding",
      body: "'Decoding' just means how the model picks the next word from its list of guesses (it outputs a probability for every possible word). Here are the three ways:",
      bullets: [
        "Greedy: always take the single highest-probability word. Fast, but short-sighted - one early wrong word derails the rest.",
        "Beam search: keep the few best whole-sentence candidates as you go and pick the best overall. Produces safe, coherent text.",
        "Top-p (nucleus) sampling: randomly pick from the smallest set of likely words. Adds variety/creativity - good for stories, not for predictable autocomplete.",
      ],
      quiz: { prompt: "Which decoding strategy fits autocomplete best?", options: [{ id: "greedy", label: "Greedy" }, { id: "beam", label: "Beam search" }, { id: "topp", label: "Top-p sampling" }], correct: "beam", why: "Beam search keeps the top few candidate sentences and yields coherent, high-confidence text - exactly what autocomplete wants. Top-p adds randomness/diversity you don't want here; greedy is too short-sighted and gets stuck." },
    },
    { title: "Evaluation", body: "How you'd measure it.", bullets: ["Offline: ExactMatch@N (does a suggestion match what the user actually typed) and perplexity.", "Online: acceptance rate, latency, and user engagement."] },
    { title: "Now build it", body: "Assemble the pipeline.", bullets: ["Wire Input → Trigger → Phrase Generator → Post-processing → Suggestion.", "Configure the decoding strategy.", "Check everything."] },
  ],
  palette: [SC.input, SC.trigger, SC.model, SC.post, SC.out],
  required: ["client", "trigger", "llm", "postproc", "output"],
  connections: [["client", "trigger"], ["trigger", "llm"], ["llm", "postproc"], ["postproc", "output"]],
  connectionWhy: { "client>trigger": "Typed text flows to the triggering service, which decides whether to suggest.", "trigger>llm": "When triggered, it calls the phrase generator with the context.", "llm>postproc": "Generated phrases are filtered before being shown.", "postproc>output": "The surviving suggestion is rendered inline." },
  missingWhy: { client: "There's no input to complete without the user's text.", trigger: "Without gating you'd run the model on every keystroke - slow and noisy.", llm: "Without the language model nothing generates completions.", postproc: "Without filtering, low-quality or unsafe suggestions reach the user.", output: "Without the output there's nothing shown to accept." },
  layout: { client: { x: 205, y: 20 }, trigger: { x: 205, y: 150 }, llm: { x: 205, y: 280 }, postproc: { x: 205, y: 410 }, output: { x: 205, y: 540 } },
  edgeLabels: { "client>trigger": "text", "trigger>llm": "context", "llm>postproc": "phrases", "postproc>output": "suggest" },
};

// ---------- Google Translate ----------
const TR = {
  input: { type: "client", name: "Source Text", blurb: "Sentence in", explain: "The sentence to translate. Translation is a sequence-to-sequence task: a whole input maps to a whole output in another language." },
  encoder: { type: "encoder", name: "Encoder", blurb: "Understands input", explain: "A stack of transformer blocks where each token attends to every other token (bidirectional self-attention) to build a context-rich representation of the source sentence." },
  decoder: {
    type: "decoder", name: "Decoder", blurb: "Generates output",
    explain: "Generates the translation token by token. It self-attends only to tokens already produced (causal) and cross-attends to the encoder's output so each output token can look at the whole source. The decision is how it's pretrained.",
    configs: [
      { id: "pretrain", question: "Pretraining objective?", options: [{ id: "next", label: "Next-token prediction" }, { id: "mlm", label: "Masked language modeling" }], correct: "mlm", why: "Use masked language modeling for an encoder-decoder. Plain next-token prediction lets the decoder 'cheat' by seeing the answer; masking forces the encoder to build real understanding the decoder then translates from." },
    ],
  },
  head: { type: "prediction_head", name: "Prediction Head", blurb: "Tokens → probabilities", explain: "A linear layer + softmax that turns the decoder's output vector into a probability distribution over the vocabulary, from which the next token is chosen (beam search for accuracy)." },
  out: { type: "output", name: "Translation", blurb: "Sentence out", explain: "The decoded sentence in the target language." },
} as const;
const TRANSLATE: SDProblem = {
  slug: "genai-translate", title: "Google Translate", difficulty: "Hard",
  summary: "Translate a sentence end to end with an encoder-decoder transformer.",
  slides: [
    { title: "What we're building", body: "Machine translation: map a sentence in one language to a sentence in another.", bullets: ["It's sequence-to-sequence: whole input → whole output.", "Quality and fluency matter more than raw speed."] },
    {
      title: "Concepts in this module",
      body: "The terms this design depends on, defined before we use them:",
      bullets: [
        "Token: a chunk of text (roughly a word or word-piece). Models read and write tokens, not raw characters.",
        "Embedding: a token turned into a list of numbers that captures its meaning, so the computer can do math on it.",
        "Attention: the mechanism that lets each token 'look at' other tokens to understand context (e.g. 'it' looking back at what 'it' refers to).",
        "Transformer: the model architecture built from stacked attention layers - the basis of modern language models.",
      ],
    },
    { title: "Encoder vs decoder", body: "The transformer (the model) has two halves.", bullets: ["Encoder: reads the whole source sentence; each token attends to all the others to fully understand it.", "Decoder: writes the translation one token at a time, only looking at tokens it has already produced, plus 'cross-attention' back to the encoder."] },
    { title: "Cross-attention", body: "The bridge between the two halves.", focus: ["encoder", "decoder"], bullets: ["Each decoder token can attend to every encoder embedding.", "That's how source meaning flows into the output as it's generated."] },
    {
      title: "Pretraining",
      body: "'Pretraining' is the first, self-taught phase where the model learns language from raw text with no human labels - by playing a fill-in-the-blank game on itself. Two ways to set up that game:",
      bullets: [
        "Next-token prediction: show the model text and have it guess the next word. Great for a single decoder, but for a translator it lets the decoder secretly see the answer and 'cheat'.",
        "Masked language modeling (MLM): hide (mask) random words in the input and have the model recover them. This forces the encoder to truly understand the sentence, which the decoder then translates from.",
      ],
      quiz: { prompt: "Which pretraining objective for an encoder-decoder?", options: [{ id: "next", label: "Next-token prediction" }, { id: "mlm", label: "Masked language modeling" }], correct: "mlm", why: "Masked language modeling: hide words and have the model recover them, forcing real understanding. Plain next-token prediction lets the decoder peek at the target and cheat." },
    },
    { title: "Evaluation", body: "Standard MT metrics.", bullets: ["BLEU (n-gram precision with a brevity penalty), ROUGE (recall), METEOR (precision+recall, semantic).", "Online: user feedback and edits."] },
    { title: "Now build it", body: "Assemble it.", bullets: ["Source → Encoder → Decoder → Prediction Head → Translation.", "Configure the pretraining objective.", "Check everything."] },
  ],
  palette: [TR.input, TR.encoder, TR.decoder, TR.head, TR.out],
  required: ["client", "encoder", "decoder", "prediction_head", "output"],
  connections: [["client", "encoder"], ["encoder", "decoder"], ["decoder", "prediction_head"], ["prediction_head", "output"]],
  connectionWhy: { "client>encoder": "The source sentence is fed to the encoder.", "encoder>decoder": "The encoder's representation is cross-attended by the decoder.", "decoder>prediction_head": "Decoder outputs go to the prediction head for token probabilities.", "prediction_head>output": "Tokens are decoded (beam search) into the final translation." },
  missingWhy: { client: "Nothing to translate without source text.", encoder: "Without the encoder there's no understanding of the source.", decoder: "Without the decoder nothing generates the translation.", prediction_head: "Without the head, decoder vectors aren't turned into tokens.", output: "Without the output there's no translation to return." },
  layout: { client: { x: 205, y: 20 }, encoder: { x: 205, y: 150 }, decoder: { x: 205, y: 280 }, prediction_head: { x: 205, y: 410 }, output: { x: 205, y: 540 } },
  edgeLabels: { "client>encoder": "tokens", "encoder>decoder": "context", "decoder>prediction_head": "vectors", "prediction_head>output": "decode" },
};

// ---------- ChatGPT-style assistant ----------
const GPT = {
  user: { type: "client", name: "User", blurb: "Sends a prompt", explain: "The user's message. The inference pipeline must be safe, helpful, and refuse cleanly when needed." },
  safetyIn: { type: "safety_filter", name: "Safety Filter", blurb: "Screens the prompt", explain: "Checks the incoming prompt for harmful or disallowed content before it ever reaches the model, so unsafe requests are caught up front." },
  enhancer: { type: "prompt_enhancer", name: "Prompt Enhancer", blurb: "Adds context", explain: "Augments the prompt with system instructions, retrieved context, and conversation history so the model has what it needs to answer well." },
  model: {
    type: "llm", name: "Response Generator", blurb: "The LLM",
    explain: "The large language model that produces candidate responses. It was trained in stages, and the decision here is how it's aligned to be helpful and safe.",
    configs: [
      { id: "align", question: "Final alignment stage?", options: [{ id: "pretrain", label: "Pretraining only" }, { id: "sft", label: "Supervised fine-tuning only" }, { id: "rlhf", label: "RLHF (reward model + RL)" }], correct: "rlhf", why: "RLHF is the alignment stage: a reward model scores responses by human preference and the policy is optimized (PPO/DPO) to maximize it. Pretraining gives raw capability and SFT teaches the format, but RLHF is what aligns tone, helpfulness, and safety." },
    ],
  },
  safetyOut: { type: "safety_eval", name: "Response Evaluator", blurb: "Screens the answer", explain: "Evaluates the generated response for harmful content. A safe answer goes to the user; an unsafe one is routed to the rejection generator." },
  rejection: { type: "rejection", name: "Rejection Generator", blurb: "Clean refusal", explain: "When the input prompt is unsafe or the generated response is unsuitable, this produces a proper refusal that explains why the request can't be fulfilled, instead of leaking a bad answer." },
  session: { type: "session", name: "Session Store", blurb: "Conversation memory", explain: "Holds the conversation history so multi-turn chats stay coherent; the enhancer reads it to give the model context." },
  out: { type: "output", name: "Response", blurb: "To the user", explain: "The final message shown to the user - either the safe generated answer or the rejection explanation." },
} as const;
const CHATGPT: SDProblem = {
  slug: "genai-chatbot", title: "ChatGPT Assistant", difficulty: "Hard",
  summary: "A safe, aligned chatbot inference pipeline - from prompt to evaluated response.",
  slides: [
    { title: "What we're building", body: "A conversational assistant that answers helpfully, remembers the conversation, and stays safe.", bullets: ["Safety on both the input and the output.", "Multi-turn memory.", "Aligned to human preferences, not just fluent."] },
    {
      title: "Concepts in this module",
      body: "The terms this design depends on, defined before we use them:",
      bullets: [
        "LLM (large language model): a model trained on huge amounts of text that predicts the next word; chained together that's how it 'writes' answers.",
        "Prompt: the text you send it (your question plus any instructions and context).",
        "Token: a chunk of text the model reads/writes (roughly a word).",
        "Inference: actually running the trained model to get an answer (as opposed to training it).",
      ],
    },
    { title: "Training stages", body: "Before it can chat, the model is trained in three stages.", bullets: ["Pretraining: learn language from a huge amount of text.", "SFT (supervised fine-tuning): copy human-written example answers to learn the response format.", "RLHF: tune answers toward what humans prefer."] },
    { title: "RLHF", body: "The alignment stage.", bullets: ["Train a reward model that scores (prompt, response) pairs by human preference.", "Optimize the model with RL (PPO/DPO) to maximize that reward.", "This is what makes responses helpful and safe, not just plausible."] },
    {
      title: "Pick the alignment",
      body: "'Alignment' means making the model's answers match what humans actually want (helpful, honest, safe). Recap of the three training stages:",
      bullets: [
        "Pretraining: learns language from huge text. Gives raw ability, but no sense of how to behave.",
        "SFT (supervised fine-tuning): humans write example answers and the model copies the style. Teaches the format of a good response.",
        "RLHF (reinforcement learning from human feedback): humans rank answers; a 'reward model' learns those preferences; the model is then trained to score higher. This is what actually tunes tone, helpfulness, and safe refusals.",
      ],
      quiz: { prompt: "Which stage aligns the assistant to be helpful and safe?", options: [{ id: "pretrain", label: "Pretraining" }, { id: "sft", label: "SFT" }, { id: "rlhf", label: "RLHF" }], correct: "rlhf", why: "RLHF: a reward model captures human preference and the model is trained to maximize it. Pretraining gives capability and SFT teaches the format, but RLHF aligns tone, helpfulness, and refusal behavior." },
    },
    { title: "Inference pipeline", body: "Each turn flows through safety and context steps before any answer reaches the user.", bullets: ["User → Safety Filter → Prompt Enhancer (+ session) → Response Generator → Response Evaluator.", "A safe response goes to the user; an unsafe input or output is routed to the Rejection Generator, which returns a clean refusal."] },
    { title: "Now build it", body: "Assemble it.", bullets: ["Happy path: User → Safety Filter → Prompt Enhancer → Response Generator → Response Evaluator → Response.", "Session → Prompt Enhancer for memory; Response Evaluator → Rejection Generator → Response for unsafe answers.", "Configure the alignment stage, then check."] },
  ],
  palette: [GPT.user, GPT.safetyIn, GPT.enhancer, GPT.model, GPT.safetyOut, GPT.rejection, GPT.session, GPT.out],
  required: ["client", "safety_filter", "prompt_enhancer", "llm", "safety_eval", "rejection", "session", "output"],
  connections: [["client", "safety_filter"], ["safety_filter", "prompt_enhancer"], ["session", "prompt_enhancer"], ["prompt_enhancer", "llm"], ["llm", "safety_eval"], ["safety_eval", "output"], ["safety_eval", "rejection"], ["rejection", "output"]],
  connectionWhy: { "client>safety_filter": "Every prompt is screened before anything else.", "safety_filter>prompt_enhancer": "Safe prompts are enriched with instructions and context.", "session>prompt_enhancer": "Conversation history is injected so multi-turn chats stay coherent.", "prompt_enhancer>llm": "The enhanced prompt is sent to the model.", "llm>safety_eval": "The response is screened before it reaches the user.", "safety_eval>output": "A safe response is returned to the user.", "safety_eval>rejection": "An unsafe response is routed to the rejection generator instead of being shown.", "rejection>output": "The rejection explanation is returned to the user." },
  missingWhy: { client: "No conversation without a user prompt.", safety_filter: "Without input screening, harmful prompts reach the model.", prompt_enhancer: "Without context/instructions the model answers poorly.", llm: "Without the model there's no response.", safety_eval: "Without output screening, harmful responses reach users.", rejection: "Without a rejection path, unsafe requests have no clean refusal.", session: "Without session memory, multi-turn chats lose context.", output: "Without an output there's nothing returned to the user." },
  layout: { client: { x: 225, y: 20 }, safety_filter: { x: 225, y: 120 }, prompt_enhancer: { x: 225, y: 235 }, session: { x: 410, y: 235 }, llm: { x: 225, y: 350 }, safety_eval: { x: 225, y: 465 }, rejection: { x: 410, y: 465 }, output: { x: 225, y: 585 } },
  edgeLabels: { "client>safety_filter": "prompt", "safety_filter>prompt_enhancer": "safe", "session>prompt_enhancer": "history", "prompt_enhancer>llm": "enhanced", "llm>safety_eval": "response", "safety_eval>output": "safe", "safety_eval>rejection": "unsafe", "rejection>output": "refusal" },
};

// ---------- RAG ----------
const RG = {
  docs: { type: "docs", name: "Documents", blurb: "Knowledge source", explain: "The corpus the assistant answers from (PDFs, wikis). They're parsed (OCR), chunked, and embedded ahead of time during indexing." },
  embedder: { type: "embedder", name: "Embedder", blurb: "Text → vectors", explain: "Turns each chunk (and later, the query) into a vector that captures semantic meaning, so similar meanings land close together in vector space." },
  index: {
    type: "vector_index", name: "Vector Index", blurb: "Searchable vectors",
    explain: "Stores chunk vectors for fast similarity search. The decision is how to index for retrieval.",
    configs: [
      { id: "index", question: "How to index chunks?", options: [{ id: "keyword", label: "Keyword (inverted index)" }, { id: "vector", label: "Vector (embeddings + ANN)" }], correct: "vector", why: "Vector indexing with ANN search: it matches on meaning, so a query finds relevant chunks even with different wording. Keyword search misses semantically-related text that doesn't share exact terms." },
    ],
  },
  retriever: {
    type: "retriever", name: "Retriever", blurb: "Finds relevant chunks",
    explain: "Embeds the user query and finds the closest chunks using approximate nearest neighbor (ANN) search, so retrieval stays fast over millions of vectors.",
    configs: [
      { id: "ann", question: "Similarity search method?", options: [{ id: "exact", label: "Exact nearest neighbor" }, { id: "ann", label: "Approximate NN (HNSW/LSH)" }], correct: "ann", why: "Approximate nearest neighbor (e.g. HNSW): it finds close-enough matches without scanning every vector, which is the only way to keep retrieval fast at scale. Exact search is too slow over millions of embeddings." },
    ],
  },
  llm: { type: "llm", name: "LLM", blurb: "Generates answer", explain: "Takes the user query plus the retrieved chunks and generates a grounded answer (chain-of-thought prompting, top-p sampling), citing the context instead of hallucinating." },
  user: { type: "client", name: "User", blurb: "Asks a question", explain: "Sends a question; the system answers using the company's own documents rather than the model's memory alone." },
  safetyIn: { type: "safety_filter", name: "Safety Filter", blurb: "Screens the query", explain: "Checks the incoming question for harmful or disallowed content before any retrieval or generation happens." },
  queryExp: { type: "query_expansion", name: "Query Expansion", blurb: "Broaden the query", explain: "Rewrites/expands the user's question (synonyms, sub-questions) so retrieval casts a wider, more relevant net before searching the index." },
} as const;
const RAG: SDProblem = {
  slug: "genai-rag", title: "Retrieval-Augmented Generation", difficulty: "Hard",
  summary: "Answer questions grounded in your own documents - index, retrieve, generate.",
  slides: [
    { title: "What we're building", body: "A RAG system: answer questions using a private document corpus instead of the model's training memory, so answers are current and grounded.", bullets: ["Reduces hallucination by grounding in real docs.", "Two phases: offline indexing, online query."] },
    {
      title: "Concepts in this module",
      body: "The terms this design depends on, defined before we use them:",
      bullets: [
        "Chunk: a small piece of a document (a paragraph or so) - documents are split up so you can fetch just the relevant bits.",
        "Embedding: a chunk (or question) turned into a list of numbers capturing its meaning, so similar meanings sit near each other.",
        "Vector / vector index: those number-lists are 'vectors'; the index stores them for fast meaning-based search.",
        "Retrieval: finding the chunks most relevant to a question. RAG = Retrieval-Augmented Generation: retrieve facts, then let the LLM write the answer from them.",
      ],
    },
    { title: "Indexing", body: "First, prepare the documents ahead of time (this happens offline, before any question).", focus: ["docs", "embedder", "vector_index"], bullets: ["Read the text (OCR for scanned PDFs) → split into chunks → embed each chunk into a vector → store them in the index.", "Chunking can be by length, by semantic breaks, or code-aware."] },
    {
      title: "How to index",
      body: "An 'index' is the lookup structure that lets you find relevant chunks fast. Two kinds:",
      bullets: [
        "Keyword index: matches on exact words (like Ctrl+F). Misses anything phrased differently - ask about 'car' and it won't find 'automobile'.",
        "Vector index: stores each chunk as an 'embedding' (a list of numbers capturing its meaning) so search matches on meaning, not exact words - 'car' finds 'automobile'.",
      ],
      quiz: { prompt: "Which index for meaning-based retrieval?", options: [{ id: "keyword", label: "Keyword index" }, { id: "vector", label: "Vector index (embeddings)" }], correct: "vector", why: "A vector index matches on meaning, so a question retrieves relevant chunks even when the wording differs. Keyword search only matches exact terms and misses paraphrases." },
    },
    { title: "Retrieval", body: "At query time, find the most relevant chunks fast.", focus: ["client", "retriever", "vector_index"], bullets: ["Embed the query into the same space, then ANN-search the index.", "ANN (tree, LSH, or graph/HNSW) returns close-enough neighbors without scanning everything."] },
    {
      title: "Pick the search",
      body: "To answer, you find the chunks whose embeddings are closest to the question's embedding ('nearest neighbors'). Two ways to find them:",
      bullets: [
        "Exact nearest neighbor: compare the query to every single chunk. Perfectly accurate, but far too slow over millions of chunks.",
        "Approximate nearest neighbor (ANN): clever shortcuts (e.g. HNSW, LSH) that find very-close matches without checking everything. Slightly less perfect, hugely faster.",
      ],
      quiz: { prompt: "How should you search millions of vectors?", options: [{ id: "exact", label: "Exact nearest neighbor" }, { id: "ann", label: "Approximate NN" }], correct: "ann", why: "Approximate nearest neighbor (HNSW/LSH) is the only way to keep retrieval fast at scale; exact search would have to scan every vector." },
    },
    { title: "Generation & evaluation", body: "Generate and measure.", bullets: ["The LLM answers from the query + retrieved chunks (CoT prompting, top-p).", "Evaluate context relevance (MRR, NDCG, Precision@k), faithfulness, and answer correctness (BLEU/ROUGE/METEOR)."] },
    { title: "The query path", body: "At query time the question is screened and broadened before retrieval.", focus: ["client", "safety_filter", "query_expansion", "retriever"], bullets: ["User → Safety Filter (block harmful queries) → Query Expansion (broaden the search) → Retriever.", "Then the retriever ANN-searches the index and hands chunks to the LLM."] },
    { title: "Now build it", body: "Assemble it.", bullets: ["Index: Documents → Embedder → Vector Index.", "Query: User → Safety Filter → Query Expansion → Retriever → Vector Index; Retriever → LLM.", "Configure the index and search, then check."] },
  ],
  palette: [RG.user, RG.safetyIn, RG.queryExp, RG.docs, RG.embedder, RG.index, RG.retriever, RG.llm],
  required: ["client", "safety_filter", "query_expansion", "docs", "embedder", "vector_index", "retriever", "llm"],
  connections: [["docs", "embedder"], ["embedder", "vector_index"], ["client", "safety_filter"], ["safety_filter", "query_expansion"], ["query_expansion", "retriever"], ["retriever", "vector_index"], ["retriever", "llm"]],
  connectionWhy: { "docs>embedder": "Documents are chunked and embedded during indexing.", "embedder>vector_index": "Chunk vectors are stored in the index.", "client>safety_filter": "The user query is screened for harmful content first.", "safety_filter>query_expansion": "A safe query is broadened to improve recall.", "query_expansion>retriever": "The expanded query is handed to the retriever.", "retriever>vector_index": "The retriever ANN-searches the index for relevant chunks.", "retriever>llm": "Retrieved chunks plus the query are sent to the LLM to generate a grounded answer." },
  missingWhy: { client: "No question to answer without a user.", safety_filter: "Without input screening, harmful queries reach the system.", query_expansion: "Without expansion, retrieval misses relevant chunks phrased differently.", docs: "Without documents there's nothing to ground answers in.", embedder: "Without embeddings, chunks and queries can't be compared semantically.", vector_index: "Without an index there's nowhere to search for relevant chunks.", retriever: "Without the retriever, the LLM has no grounding context.", llm: "Without the LLM nothing generates the final answer." },
  layout: { client: { x: 400, y: 20 }, safety_filter: { x: 400, y: 140 }, query_expansion: { x: 400, y: 260 }, retriever: { x: 400, y: 380 }, llm: { x: 400, y: 510 }, docs: { x: 30, y: 20 }, embedder: { x: 30, y: 170 }, vector_index: { x: 30, y: 320 } },
  edgeLabels: { "docs>embedder": "chunk+embed", "embedder>vector_index": "store", "client>safety_filter": "query", "safety_filter>query_expansion": "safe", "query_expansion>retriever": "expanded", "retriever>vector_index": "ANN search", "retriever>llm": "context" },
};

// ---------- Image Captioning (Image2Text) ----------
const IC = {
  image: { type: "client", name: "Input Image", blurb: "A photo", explain: "The picture we want to describe in words. Captioning turns an image into a sentence." },
  encoder: {
    type: "image_encoder", name: "Image Encoder", blurb: "Image → features",
    explain: "Turns the image into a sequence of feature vectors (numbers describing what's in each region) that the text decoder can read. The choice is what kind of encoder.",
    configs: [
      { id: "enc", question: "Image encoder type?", options: [{ id: "cnn", label: "CNN" }, { id: "vit", label: "Transformer (ViT)" }], correct: "vit", why: "A Transformer (ViT) splits the image into patches and uses self-attention, so it captures both nearby detail AND long-range relationships across the whole image. A CNN is great at local patterns but weaker at connecting distant regions." },
    ],
  },
  decoder: { type: "decoder", name: "Text Decoder", blurb: "Features → words", explain: "A transformer that writes the caption one word at a time, using attention to focus on the relevant image regions for each word." },
  post: { type: "postproc", name: "Post-processing", blurb: "Clean up", explain: "Applies fairness/inclusivity rules and tidies the caption before showing it." },
  out: { type: "output", name: "Caption", blurb: "Sentence out", explain: "The final text describing the image." },
} as const;
const IMAGE_CAPTION: SDProblem = {
  slug: "genai-image-caption", title: "Image Captioning", difficulty: "Medium",
  summary: "Describe an image in words with an image encoder + text decoder.",
  slides: [
    { title: "What we're building", body: "Image captioning: take a photo and produce a sentence describing it.", bullets: ["Input is an image, output is text - so we need to bridge two very different things.", "Used for accessibility (alt text), search, and organizing photos."] },
    {
      title: "Concepts in this module",
      body: "The terms this design depends on, defined before we use them:",
      bullets: [
        "Feature vector: a list of numbers summarizing what's in part of an image (an edge, a face, a dog...).",
        "Encoder: a network that converts the image into those feature vectors.",
        "Decoder: a network that reads the features and writes words one at a time.",
        "Attention: lets the decoder focus on the right part of the image for each word it writes.",
      ],
    },
    {
      title: "Choosing the encoder",
      body: "The encoder converts the image into features the decoder can read. Two common choices:",
      bullets: [
        "CNN (convolutional network): slides small filters over the image. Excellent at local patterns (textures, edges), but weaker at linking far-apart regions.",
        "Transformer / ViT: cuts the image into patches and uses attention so every patch can relate to every other - captures local AND global context.",
      ],
      quiz: { prompt: "Which image encoder captures both local and global context?", options: [{ id: "cnn", label: "CNN" }, { id: "vit", label: "Transformer (ViT)" }], correct: "vit", why: "A ViT uses self-attention across all patches, so distant regions can inform each other. A CNN only sees local neighborhoods at a time." },
    },
    { title: "Decoding the caption", body: "The text decoder writes the caption.", focus: ["image_encoder", "decoder"], bullets: ["It generates word by word, attending to the image features.", "Beam search keeps the most coherent caption."] },
    { title: "Evaluation", body: "How you'd measure caption quality.", bullets: ["CIDEr compares your caption to several human reference captions (robust to wording).", "Trained with cross-entropy on next-word prediction over image-caption pairs."] },
    { title: "Now build it", body: "Assemble the pipeline.", bullets: ["Image → Image Encoder → Text Decoder → Post-processing → Caption.", "Pick the encoder type, then check."] },
  ],
  palette: [IC.image, IC.encoder, IC.decoder, IC.post, IC.out],
  required: ["client", "image_encoder", "decoder", "postproc", "output"],
  connections: [["client", "image_encoder"], ["image_encoder", "decoder"], ["decoder", "postproc"], ["postproc", "output"]],
  connectionWhy: { "client>image_encoder": "The image is fed to the encoder to extract features.", "image_encoder>decoder": "Image features are read by the decoder to write words.", "decoder>postproc": "The raw caption is cleaned and checked.", "postproc>output": "The final caption is returned." },
  missingWhy: { client: "No image to caption.", image_encoder: "Without an encoder the image isn't turned into features.", decoder: "Without the decoder nothing turns features into words.", postproc: "Without post-processing, captions aren't checked for quality/fairness.", output: "Without output there's no caption to return." },
  layout: { client: { x: 205, y: 20 }, image_encoder: { x: 205, y: 150 }, decoder: { x: 205, y: 280 }, postproc: { x: 205, y: 410 }, output: { x: 205, y: 540 } },
  edgeLabels: { "client>image_encoder": "pixels", "image_encoder>decoder": "features", "decoder>postproc": "caption", "postproc>output": "final" },
};

// ---------- Realistic Face Generation (GAN) ----------
const FG = {
  noise: { type: "client", name: "Noise Vector", blurb: "Random seed", explain: "A list of random numbers. The generator turns this randomness into an image - different noise gives a different face." },
  gen: {
    type: "generator", name: "Generator", blurb: "Noise → image",
    explain: "A network that turns the random noise into a realistic face. The big design decision is which family of model to use for generation.",
    configs: [
      { id: "model", question: "Which model family?", options: [{ id: "vae", label: "VAE" }, { id: "gan", label: "GAN" }, { id: "diffusion", label: "Diffusion" }], correct: "gan", why: "A GAN gives high-quality, fast generation with good attribute control (age, expression) - a strong fit for faces. VAEs tend to look blurry; diffusion is excellent but slower. (Any of these can work; GAN is the book's choice here.)" },
    ],
  },
  disc: { type: "discriminator", name: "Discriminator", blurb: "Real or fake?", explain: "A network that looks at an image and guesses whether it's a real photo or a generated fake. It's the generator's opponent during training." },
  out: { type: "output", name: "Generated Face", blurb: "Image out", explain: "The final synthesized face image." },
} as const;
const FACE_GEN: SDProblem = {
  slug: "genai-face-generation", title: "Realistic Face Generation", difficulty: "Hard",
  summary: "Generate realistic faces with a GAN - a generator and discriminator that compete.",
  slides: [
    { title: "What we're building", body: "Generate brand-new, realistic human faces that don't belong to any real person.", bullets: ["Input is random noise, output is a believable face.", "Quality and diversity both matter."] },
    {
      title: "Concepts in this module",
      body: "The terms this design depends on, defined before we use them:",
      bullets: [
        "Noise vector: a list of random numbers used as the 'seed' for one generated image.",
        "Generator: the network that turns noise into an image.",
        "Discriminator: the network that judges whether an image is real or generated.",
        "Adversarial training: the two networks compete - one tries to fool, the other tries to catch - and both get better.",
      ],
    },
    {
      title: "Choosing the model family",
      body: "Several model families can generate images. The trade-offs:",
      bullets: [
        "VAE: simple and stable, but images often look blurry.",
        "GAN: a generator vs a discriminator. High-quality, fast, good control of attributes (age, smile) - but training can be unstable.",
        "Diffusion: starts from noise and denoises step by step. Excellent quality, but slower to generate.",
      ],
      quiz: { prompt: "Which family pairs a generator against a discriminator?", options: [{ id: "vae", label: "VAE" }, { id: "gan", label: "GAN" }, { id: "diffusion", label: "Diffusion" }], correct: "gan", why: "A GAN is defined by two competing networks - a generator and a discriminator. That adversarial setup is what drives the sharp, realistic results used here." },
    },
    {
      title: "How they train (two-way)",
      body: "The generator and discriminator train together, each pushing the other to improve.",
      focus: ["generator", "discriminator"],
      bullets: [
        "Generator → Discriminator: the generator sends a fake image, trying to fool it.",
        "Discriminator → Generator: the discriminator's verdict flows back as a learning signal, telling the generator how to look more real.",
        "This back-and-forth is why you'll draw connections in both directions.",
      ],
    },
    { title: "Challenges & evaluation", body: "GANs are powerful but finicky.", bullets: ["Watch for mode collapse (same face over and over) and non-convergence; fixes include WGAN, normalization, and noise.", "Measure with Inception Score (quality + diversity) and FID (closeness to real images - lower is better)."] },
    { title: "Now build it", body: "Assemble it.", bullets: ["Noise → Generator → Generated Face.", "Connect Generator → Discriminator AND Discriminator → Generator (the adversarial loop).", "Pick the model family, then check."] },
  ],
  palette: [FG.noise, FG.gen, FG.disc, FG.out],
  required: ["client", "generator", "discriminator", "output"],
  connections: [["client", "generator"], ["generator", "output"], ["generator", "discriminator"], ["discriminator", "generator"]],
  connectionWhy: { "client>generator": "Random noise seeds the generator.", "generator>output": "The generator produces the final face.", "generator>discriminator": "The generator sends fake images to the discriminator to try to fool it.", "discriminator>generator": "The discriminator's real/fake judgment flows back to train the generator." },
  missingWhy: { client: "Without a noise seed the generator has no input.", generator: "Without the generator nothing creates faces.", discriminator: "Without the discriminator there's no adversary to train the generator.", output: "Without output there's no face to return." },
  layout: { client: { x: 205, y: 20 }, generator: { x: 205, y: 200 }, discriminator: { x: 205, y: 400 }, output: { x: 205, y: 580 } },
  edgeLabels: { "client>generator": "noise", "generator>output": "face", "generator>discriminator": "fake", "discriminator>generator": "feedback" },
};

// ---------- High-Resolution Image Synthesis (VQ-VAE + Transformer) ----------
const HR = {
  image: { type: "client", name: "Input / Seed", blurb: "Training image", explain: "A high-resolution image (in training) or a seed token (at generation). We learn to compress images into discrete tokens and back." },
  enc: { type: "vae_encoder", name: "Image Tokenizer", blurb: "Image → tokens", explain: "A CNN encoder compresses the image into a small grid of vectors." },
  quant: { type: "quantizer", name: "Quantizer", blurb: "Snap to codebook", explain: "Snaps each vector to the nearest entry in a learned 'codebook', turning the image into a short list of discrete token IDs - far easier to model than raw pixels." },
  gen: {
    type: "image_gen", name: "Image Generator", blurb: "Transformer over tokens",
    explain: "A transformer that generates the image token by token (chunk by chunk, not pixel by pixel - much faster at high resolution). The decision is how it samples each token.",
    configs: [
      { id: "sample", question: "How to sample each token?", options: [{ id: "greedy", label: "Greedy" }, { id: "topp", label: "Top-p sampling" }], correct: "topp", why: "Top-p sampling adds controlled variety so generated images are diverse and realistic. Pure greedy would make every image collapse toward the same safe output." },
    ],
  },
  dec: { type: "vae_decoder", name: "Decoder", blurb: "Tokens → image", explain: "Looks up each token's vector in the codebook and a CNN decoder reconstructs the full-resolution image." },
  out: { type: "output", name: "High-res Image", blurb: "Image out", explain: "The final high-resolution image." },
} as const;
const HIRES: SDProblem = {
  slug: "genai-hires-synthesis", title: "High-Resolution Image Synthesis", difficulty: "Hard",
  summary: "Generate big images efficiently by modeling discrete image tokens (VQ-VAE + Transformer).",
  slides: [
    { title: "What we're building", body: "Generating large, detailed images. Doing this pixel by pixel is far too slow, so we model compact image 'tokens' instead.", bullets: ["Compress image → tokens, generate tokens, decompress → image.", "Tokens make a huge image tractable to model."] },
    {
      title: "Concepts in this module",
      body: "The terms this design depends on, defined before we use them:",
      bullets: [
        "Token (here): a discrete ID standing for a small patch of image - like a word, but for pictures.",
        "Codebook: a fixed dictionary of patch-vectors; quantizing means picking the closest entry.",
        "Quantize: snap a continuous vector to the nearest codebook entry, turning it into a discrete token.",
        "VQ-VAE: the encoder + quantizer + decoder that compress an image to tokens and back.",
      ],
    },
    { title: "The pipeline", body: "Two stages: a tokenizer that compresses, and a generator that creates new token sequences.", bullets: ["Tokenizer: Image → Encoder → Quantizer → tokens; tokens → Decoder → Image.", "Generator: a transformer predicts a sequence of tokens, which the decoder turns into an image."] },
    {
      title: "Sampling the tokens",
      body: "The transformer predicts a probability for each possible next token. How should it pick?",
      bullets: [
        "Greedy: always the single most likely token - tends to produce repetitive, samey images.",
        "Top-p (nucleus): randomly pick from the smallest set of likely tokens - keeps images varied and realistic.",
      ],
      quiz: { prompt: "Best sampling for diverse, realistic images?", options: [{ id: "greedy", label: "Greedy" }, { id: "topp", label: "Top-p sampling" }], correct: "topp", why: "Top-p adds controlled randomness so outputs stay diverse; greedy collapses toward one safe image." },
    },
    { title: "Now build it", body: "Assemble it.", bullets: ["Input → Image Tokenizer → Quantizer → Image Generator → Decoder → High-res Image.", "Configure sampling, then check."] },
  ],
  palette: [HR.image, HR.enc, HR.quant, HR.gen, HR.dec, HR.out],
  required: ["client", "vae_encoder", "quantizer", "image_gen", "vae_decoder", "output"],
  connections: [["client", "vae_encoder"], ["vae_encoder", "quantizer"], ["quantizer", "image_gen"], ["image_gen", "vae_decoder"], ["vae_decoder", "output"]],
  connectionWhy: { "client>vae_encoder": "The image is compressed by the encoder.", "vae_encoder>quantizer": "Encoder vectors are snapped to discrete tokens.", "quantizer>image_gen": "The transformer models/generates the token sequence.", "image_gen>vae_decoder": "Generated tokens are sent to the decoder.", "vae_decoder>output": "The decoder reconstructs the full-resolution image." },
  missingWhy: { client: "No image/seed to work from.", vae_encoder: "Without the encoder the image isn't compressed.", quantizer: "Without quantization there are no discrete tokens to model.", image_gen: "Without the generator nothing produces new token sequences.", vae_decoder: "Without the decoder tokens never become an image.", output: "Without output there's no image to return." },
  layout: { client: { x: 205, y: 20 }, vae_encoder: { x: 205, y: 130 }, quantizer: { x: 205, y: 240 }, image_gen: { x: 205, y: 350 }, vae_decoder: { x: 205, y: 460 }, output: { x: 205, y: 570 } },
  edgeLabels: { "client>vae_encoder": "image", "vae_encoder>quantizer": "vectors", "quantizer>image_gen": "tokens", "image_gen>vae_decoder": "gen tokens", "vae_decoder>output": "image" },
};

// ---------- Text2Image (Diffusion) ----------
const TI = {
  prompt: { type: "client", name: "Text Prompt", blurb: "Words in", explain: "The user's description of the image they want, e.g. 'a red bicycle in the rain'." },
  textenc: { type: "text_encoder", name: "Text Encoder", blurb: "Words → meaning", explain: "Turns the prompt into embeddings (numbers capturing meaning) using a pretrained encoder like CLIP, so the image model knows what to draw." },
  diff: {
    type: "diffusion", name: "Diffusion Model", blurb: "Noise → image",
    explain: "Starts from pure noise and removes a little noise at a time, guided by the text, until an image appears. The decision is which generation approach to use.",
    configs: [
      { id: "approach", question: "Which generation approach?", options: [{ id: "auto", label: "Autoregressive (token by token)" }, { id: "diffusion", label: "Diffusion (iterative denoising)" }], correct: "diffusion", why: "Diffusion iteratively refines from noise, giving exceptional realism and a flexible speed/quality trade-off (more steps = higher quality). Autoregressive is simpler but here diffusion is the stronger fit for photorealistic images." },
    ],
  },
  sr: { type: "super_resolution", name: "Super-Resolution", blurb: "Upscale", explain: "Takes the generated image and increases its resolution/detail for a crisp final result." },
  out: { type: "output", name: "Image", blurb: "Image out", explain: "The final generated image matching the prompt." },
} as const;
const TEXT2IMAGE: SDProblem = {
  slug: "genai-text2image", title: "Text2Image", difficulty: "Hard",
  summary: "Generate an image from a text prompt with a diffusion model.",
  slides: [
    { title: "What we're building", body: "Type a sentence, get a matching image. The model must understand the text and paint something that fits.", bullets: ["Input is text, output is an image.", "Realism and prompt-alignment both matter."] },
    {
      title: "Concepts in this module",
      body: "The terms this design depends on, defined before we use them:",
      bullets: [
        "Embedding: text turned into numbers capturing meaning, so the image model can use it.",
        "Diffusion: start from random noise and remove noise step by step until an image forms.",
        "Denoising step: one round of cleaning up the noisy image a little.",
        "Cross-attention: how the text meaning steers what the image model paints at each step.",
      ],
    },
    {
      title: "Diffusion vs autoregressive",
      body: "Two ways to generate the image:",
      bullets: [
        "Autoregressive: build the image one piece/token at a time, like writing a sentence. Simple, uniform, but rigid.",
        "Diffusion: start from noise and iteratively denoise toward the image. Exceptional realism, and you can trade speed for quality by changing the number of steps.",
      ],
      quiz: { prompt: "Which approach denoises from random noise iteratively?", options: [{ id: "auto", label: "Autoregressive" }, { id: "diffusion", label: "Diffusion" }], correct: "diffusion", why: "Diffusion progressively removes noise over many steps. That iterative refinement is what gives the high realism used in modern text-to-image systems." },
    },
    { title: "Guiding with text", body: "The text steers the image.", focus: ["text_encoder", "diffusion"], bullets: ["The text encoder produces embeddings; the diffusion model cross-attends to them so the prompt influences every denoising step.", "Classifier-free guidance (CFG) strengthens how closely the image follows the prompt."] },
    { title: "Evaluation", body: "How you'd measure it.", bullets: ["CLIPScore measures how well the image matches the text (cosine similarity of their embeddings).", "Online: engagement, latency, cost per user."] },
    { title: "Now build it", body: "Assemble it.", bullets: ["Prompt → Text Encoder → Diffusion Model → Super-Resolution → Image.", "Configure the approach, then check."] },
  ],
  palette: [TI.prompt, TI.textenc, TI.diff, TI.sr, TI.out],
  required: ["client", "text_encoder", "diffusion", "super_resolution", "output"],
  connections: [["client", "text_encoder"], ["text_encoder", "diffusion"], ["diffusion", "super_resolution"], ["super_resolution", "output"]],
  connectionWhy: { "client>text_encoder": "The prompt is encoded into meaning vectors.", "text_encoder>diffusion": "Text embeddings guide the diffusion model via cross-attention.", "diffusion>super_resolution": "The generated image is upscaled for detail.", "super_resolution>output": "The crisp final image is returned." },
  missingWhy: { client: "No prompt to generate from.", text_encoder: "Without text encoding the model doesn't know what to draw.", diffusion: "Without the diffusion model nothing generates the image.", super_resolution: "Without upscaling the image stays low-resolution.", output: "Without output there's no image to return." },
  layout: { client: { x: 205, y: 20 }, text_encoder: { x: 205, y: 150 }, diffusion: { x: 205, y: 280 }, super_resolution: { x: 205, y: 410 }, output: { x: 205, y: 540 } },
  edgeLabels: { "client>text_encoder": "prompt", "text_encoder>diffusion": "guidance", "diffusion>super_resolution": "image", "super_resolution>output": "upscaled" },
};

// ---------- Personalized Text2Image Headshot ----------
const PH = {
  ref: { type: "client", name: "Reference Photos", blurb: "A few selfies", explain: "A handful of photos of the specific person we want to generate headshots of." },
  tune: {
    type: "trainer", name: "Personalization", blurb: "Teach the model 'you'",
    explain: "Adapts a pretrained text-to-image model so it learns this specific person from the reference photos. The decision is which adaptation method to use.",
    configs: [
      { id: "method", question: "Personalization method?", options: [{ id: "textinv", label: "Textual Inversion" }, { id: "dreambooth", label: "DreamBooth" }, { id: "lora", label: "LoRA" }], correct: "lora", why: "LoRA trains a small set of extra parameters, so it's efficient, preserves the original model, and needs minimal storage - ideal for many users. DreamBooth captures more detail but updates the whole model (heavy storage); textual inversion is lightest but learns the least detail." },
    ],
  },
  diff: { type: "diffusion", name: "Diffusion Model", blurb: "Generates the look", explain: "The base text-to-image diffusion model, now personalized, generates new images of the person in the requested style." },
  quality: { type: "safety_eval", name: "Quality Assessment", blurb: "Keep the good ones", explain: "Scores generated headshots and keeps only the high-quality, on-identity results." },
  out: { type: "output", name: "Headshots", blurb: "Images out", explain: "The final personalized headshots." },
} as const;
const HEADSHOT: SDProblem = {
  slug: "genai-personalized-headshot", title: "Personalized Text2Image Headshot", difficulty: "Hard",
  summary: "Fine-tune a diffusion model on a few photos to generate personalized headshots.",
  slides: [
    { title: "What we're building", body: "Given a few photos of a person, generate new professional headshots of that same person in different styles.", bullets: ["Must look like the actual person (identity), not a generic face.", "Should be efficient enough to do per-user."] },
    {
      title: "Concepts in this module",
      body: "The terms this design depends on, defined before we use them:",
      bullets: [
        "Fine-tuning: taking a model that already works and training it a bit more on new, specific data.",
        "Parameters: the model's adjustable numbers; updating fewer of them is cheaper to store and train.",
        "Diffusion model: the base text-to-image generator (noise → image).",
        "Identity: how well the output actually resembles the target person.",
      ],
    },
    {
      title: "Choosing how to personalize",
      body: "Three ways to teach the model a specific person:",
      bullets: [
        "Textual Inversion: learn one new 'word' for the person. Tiny and cheap, but captures the least detail.",
        "DreamBooth: fine-tune the whole model. Captures lots of detail, but heavy on storage and compute.",
        "LoRA: train a small add-on set of parameters. Efficient, preserves the base model, minimal storage - great default per user.",
      ],
      quiz: { prompt: "Most storage-efficient way to personalize per user?", options: [{ id: "textinv", label: "Textual Inversion" }, { id: "dreambooth", label: "DreamBooth" }, { id: "lora", label: "LoRA" }], correct: "lora", why: "LoRA adds a small set of trainable parameters and leaves the base model untouched, so each user only needs a tiny adapter stored - efficient and scalable." },
    },
    { title: "Generate & check", body: "Generate, then filter.", focus: ["diffusion", "safety_eval"], bullets: ["The personalized diffusion model generates candidate headshots.", "A quality step keeps only sharp, on-identity results.", "Evaluate identity with CLIP/DINO similarity to the reference photos."] },
    { title: "Now build it", body: "Assemble it.", bullets: ["Reference Photos → Personalization → Diffusion Model → Quality Assessment → Headshots.", "Pick the method, then check."] },
  ],
  palette: [PH.ref, PH.tune, PH.diff, PH.quality, PH.out],
  required: ["client", "trainer", "diffusion", "safety_eval", "output"],
  connections: [["client", "trainer"], ["trainer", "diffusion"], ["diffusion", "safety_eval"], ["safety_eval", "output"]],
  connectionWhy: { "client>trainer": "The reference photos drive personalization.", "trainer>diffusion": "Personalization adapts the diffusion model to the person.", "diffusion>safety_eval": "Generated headshots are scored for quality/identity.", "safety_eval>output": "Only the good headshots are returned." },
  missingWhy: { client: "No reference photos means no person to learn.", trainer: "Without personalization the model can't reproduce this person.", diffusion: "Without the diffusion model nothing generates images.", safety_eval: "Without quality assessment, bad or off-identity images slip through.", output: "Without output there are no headshots to return." },
  layout: { client: { x: 205, y: 20 }, trainer: { x: 205, y: 150 }, diffusion: { x: 205, y: 280 }, safety_eval: { x: 205, y: 410 }, output: { x: 205, y: 540 } },
  edgeLabels: { "client>trainer": "photos", "trainer>diffusion": "adapt", "diffusion>safety_eval": "candidates", "safety_eval>output": "best" },
};

// ---------- Text2Video (Latent Diffusion) ----------
const TV = {
  prompt: { type: "client", name: "Text Prompt", blurb: "Words in", explain: "The description of the video to generate, e.g. 'a dog running on a beach at sunset'." },
  textenc: { type: "text_encoder", name: "Text Encoder", blurb: "Words → meaning", explain: "Turns the prompt into embeddings that steer the video generator." },
  diff: {
    type: "video_diffusion", name: "Video Diffusion", blurb: "Generate frames",
    explain: "A diffusion model that generates video in a compressed 'latent' space. The key decision is how it keeps motion smooth across frames.",
    configs: [
      { id: "temporal", question: "How to keep frames consistent?", options: [{ id: "none", label: "Per-frame only (no temporal link)" }, { id: "temporal", label: "Temporal attention/convolution" }], correct: "temporal", why: "Temporal attention/convolution lets each frame look at other frames, so motion is smooth and consistent. Generating each frame independently produces flickery, incoherent video." },
    ],
  },
  comp: { type: "compression", name: "Compression Network", blurb: "Video ↔ latent", explain: "A VAE that compresses video into a small latent space (fewer frames, lower resolution) so diffusion is affordable - and expands it back later." },
  dec: { type: "visual_decoder", name: "Visual Decoder", blurb: "Latent → pixels", explain: "Converts the denoised latent representation back into actual video pixels." },
  out: { type: "output", name: "Video", blurb: "Video out", explain: "The final generated video clip." },
} as const;
const TEXT2VIDEO: SDProblem = {
  slug: "genai-text2video", title: "Text2Video", difficulty: "Hard",
  summary: "Generate video from text using a latent diffusion model with temporal layers.",
  slides: [
    { title: "What we're building", body: "Type a description, get a short video. Video is many frames, so we work in a compressed space to keep it affordable.", bullets: ["Input is text, output is a sequence of frames.", "Frames must flow smoothly (temporal consistency)."] },
    {
      title: "Concepts in this module",
      body: "The terms this design depends on, defined before we use them:",
      bullets: [
        "Frame: one still image; a video is many frames played in order.",
        "Latent space: a compressed numeric representation - smaller than raw pixels, so cheaper to work with.",
        "Diffusion: generate by denoising from random noise step by step.",
        "Temporal consistency: frames agree with each other so motion looks smooth, not flickery.",
      ],
    },
    { title: "Why latent diffusion", body: "Raw video is huge, so denoising every pixel of every frame is too expensive.", bullets: ["A compression network (VAE) shrinks video into a small latent space.", "Diffusion runs in that latent space; a decoder expands it back to pixels at the end."] },
    {
      title: "Keeping motion smooth",
      body: "A normal image model treats each frame on its own. For video we need frames to relate to each other:",
      bullets: [
        "Per-frame only: generate each frame independently - fast, but motion flickers and jumps.",
        "Temporal attention/convolution: each frame attends to other frames, so movement is smooth and coherent.",
      ],
      quiz: { prompt: "What keeps video frames smooth and coherent?", options: [{ id: "none", label: "Per-frame only" }, { id: "temporal", label: "Temporal attention/convolution" }], correct: "temporal", why: "Temporal layers let frames share information across time, producing consistent motion. Independent per-frame generation looks flickery." },
    },
    { title: "Evaluation", body: "How you'd measure it.", bullets: ["Frame quality: FID/Inception Score per frame.", "Temporal consistency: FVD (Frechet Video Distance).", "Text alignment: CLIP similarity averaged over frames."] },
    { title: "Now build it", body: "Assemble it.", bullets: ["Prompt → Text Encoder → Video Diffusion → Visual Decoder → Video.", "Compression Network feeds the latent space to the diffusion model.", "Configure temporal handling, then check."] },
  ],
  palette: [TV.prompt, TV.textenc, TV.comp, TV.diff, TV.dec, TV.out],
  required: ["client", "text_encoder", "compression", "video_diffusion", "visual_decoder", "output"],
  connections: [["client", "text_encoder"], ["text_encoder", "video_diffusion"], ["compression", "video_diffusion"], ["video_diffusion", "visual_decoder"], ["visual_decoder", "output"]],
  connectionWhy: { "client>text_encoder": "The prompt is encoded into meaning vectors.", "text_encoder>video_diffusion": "Text embeddings guide what the video shows.", "compression>video_diffusion": "The compression network provides the latent space diffusion runs in.", "video_diffusion>visual_decoder": "Denoised latents are sent to the decoder.", "visual_decoder>output": "The decoder turns latents into the final video." },
  missingWhy: { client: "No prompt to generate from.", text_encoder: "Without text encoding the model doesn't know what to show.", compression: "Without compression, diffusion on raw video is too expensive.", video_diffusion: "Without the diffusion model nothing generates frames.", visual_decoder: "Without the decoder latents never become video.", output: "Without output there's no video to return." },
  layout: { client: { x: 205, y: 20 }, text_encoder: { x: 205, y: 150 }, compression: { x: 30, y: 290 }, video_diffusion: { x: 205, y: 290 }, visual_decoder: { x: 205, y: 430 }, output: { x: 205, y: 560 } },
  edgeLabels: { "client>text_encoder": "prompt", "text_encoder>video_diffusion": "guidance", "compression>video_diffusion": "latent", "video_diffusion>visual_decoder": "latents", "visual_decoder>output": "video" },
};

export const GENAI_PROBLEMS: SDProblem[] = [
  SMART_COMPOSE,
  TRANSLATE,
  CHATGPT,
  IMAGE_CAPTION,
  RAG,
  FACE_GEN,
  HIRES,
  TEXT2IMAGE,
  HEADSHOT,
  TEXT2VIDEO,
];
