# 08 — Pacotes Plugáveis

> Esse arquivo especifica cada pacote plugável da Forge. Todos os 8 pacotes entram na v1 — é muito trabalho, mas ter eles prontos transforma radicalmente a oferta comercial da Ethos. Cada pacote tem: o que faz, dependências, API backend, hooks/componentes React, configuração, considerações de segurança.

---

## Filosofia dos pacotes plugáveis

### Por que plugáveis e não tudo no template starter

**Se tudo viesse no starter,** todo projeto carregaria dependências que talvez não usasse: SDK do WhatsApp, SDK do Mercado Pago, LangChain, OpenAI, Twilio. Bundle inflado, build lento, surface de segurança maior.

**Como pacotes plugáveis,** projeto novo começa minimalista. Cliente pediu chatbot? `pnpm add @ethos/ai-chat` e pronto. Cliente pediu pagamentos? `pnpm add @ethos/payments`. Cada pacote é instalado sob demanda.

### Padrão arquitetural comum a todos

Todo pacote plugável segue a mesma estrutura:

```
packages/[nome]/
├── src/
│   ├── backend/              # Module NestJS
│   │   ├── [nome].module.ts
│   │   ├── [nome].service.ts
│   │   ├── [nome].controller.ts (opcional)
│   │   └── ...
│   ├── react/                # Hooks + componentes
│   │   ├── use-[nome].ts
│   │   ├── [Componente].tsx
│   │   └── ...
│   ├── shared/               # Types + schemas Zod compartilhados
│   │   ├── types.ts
│   │   └── schemas.ts
│   └── index.ts              # Barrel export (backend + react)
├── package.json
├── tsconfig.json
└── README.md
```

### Como instalar e configurar

Padrão de uso em projeto cliente:

**Backend (NestJS):**

```typescript
// apps/api/src/app.module.ts
import { AiChatModule } from "@ethos/ai-chat/backend";

@Module({
  imports: [
    AiChatModule.forRoot({
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      defaultModel: "claude-sonnet-4-5",
    }),
  ],
})
export class AppModule {}
```

**Frontend (Next.js):**

```typescript
// apps/web/src/components/chat-section.tsx
import { ChatWidget } from "@ethos/ai-chat/react";

export function ChatSection() {
  return <ChatWidget systemPrompt="Você é um assistente do Pet Shop..." />;
}
```

---

## 1. `@ethos/ai-chat` — Chat com Claude e Tools

### O que faz

Módulo de chat conversacional com Claude (Anthropic), suporte a tool calling (a IA pode chamar funções do sistema), histórico persistente, streaming de respostas, e widget React drop-in.

### Casos de uso típicos

- Atendimento automatizado dentro do sistema do cliente
- Assistente de busca: "encontre os 5 maiores clientes desse mês"
- Geração de relatórios em linguagem natural
- Onboarding interativo de novos usuários

### Dependências

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.30.0",
    "@nestjs/common": "^10.0.0",
    "react": "^18.0.0",
    "@tanstack/react-query": "^5.0.0",
    "zod": "^3.22.0"
  }
}
```

### Schema Prisma adicionado

```prisma
model ChatSession {
  id        String   @id @default(cuid())
  tenantId  String
  userId    String
  title     String?
  metadata  Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  messages  ChatMessage[]

  @@index([tenantId, userId])
}

model ChatMessage {
  id          String   @id @default(cuid())
  sessionId   String
  role        ChatRole
  content     String   @db.Text
  toolCalls   Json?
  toolResults Json?
  tokens      Int?
  createdAt   DateTime @default(now())

  session     ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
}

enum ChatRole {
  user
  assistant
  system
  tool
}
```

### Backend: API

```typescript
// AiChatModule.forRoot config
type AiChatConfig = {
  anthropicApiKey: string;
  defaultModel?: "claude-sonnet-4-5" | "claude-haiku-4-5";
  maxTokens?: number;
  defaultSystemPrompt?: string;
  rateLimit?: { messagesPerMinute: number; messagesPerDay: number };
};

// Service principal
class AiChatService {
  async sendMessage(input: {
    sessionId?: string;
    message: string;
    tools?: Tool[];
    model?: string;
    stream?: boolean;
  }): Promise<ChatResponse | AsyncIterable<ChatChunk>>;

  async listSessions(userId: string): Promise<ChatSession[]>;
  async getSession(sessionId: string): Promise<ChatSession & { messages: ChatMessage[] }>;
  async deleteSession(sessionId: string): Promise<void>;
}
```

### Tool calling

Devs registram tools que a IA pode chamar:

```typescript
// apps/api/src/modules/chat/chat.config.ts
import { defineTool } from "@ethos/ai-chat/backend";

export const chatTools = [
  defineTool({
    name: "search_clients",
    description: "Busca clientes por nome ou email",
    schema: z.object({
      query: z.string().describe("Texto pra buscar"),
      limit: z.number().default(10),
    }),
    handler: async ({ query, limit }, ctx) => {
      const clients = await ctx.prisma.client.findMany({
        where: {
          tenantId: ctx.tenantId,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
        take: limit,
      });
      return { clients };
    },
  }),

  defineTool({
    name: "get_revenue",
    description: "Retorna receita do período",
    schema: z.object({
      from: z.string().datetime(),
      to: z.string().datetime(),
    }),
    handler: async ({ from, to }, ctx) => {
      const total = await ctx.prisma.order.aggregate({
        _sum: { total: true },
        where: { tenantId: ctx.tenantId, createdAt: { gte: new Date(from), lte: new Date(to) } },
      });
      return { revenue: total._sum.total };
    },
  }),
];
```

A `ctx` recebida no handler tem `tenantId`, `userId`, `prisma`, e qualquer service injetado. Multi-tenancy automático.

### Endpoints expostos

```
POST   /chat/sessions              # Cria sessão nova
GET    /chat/sessions              # Lista sessões do user
GET    /chat/sessions/:id          # Detalhes de sessão (com mensagens)
DELETE /chat/sessions/:id          # Apaga sessão

POST   /chat/sessions/:id/messages # Envia mensagem (streaming SSE ou JSON)
```

### React: Hooks

```tsx
import { useChatSession, useSendMessage } from "@ethos/ai-chat/react";

function MyChat() {
  const { messages, isLoading } = useChatSession(sessionId);
  const sendMessage = useSendMessage(sessionId);

  return (
    <>
      {messages.map((m) => <Message key={m.id} {...m} />)}
      <Input onSubmit={(text) => sendMessage.mutate({ message: text })} />
    </>
  );
}
```

### React: Componente drop-in

```tsx
import { ChatWidget } from "@ethos/ai-chat/react";

<ChatWidget
  systemPrompt="Você é um assistente do Pet Shop. Ajude clientes a encontrar produtos e agendar serviços."
  tools={["search_clients", "search_products", "create_appointment"]}
  position="bottom-right"
  defaultOpen={false}
  greeting="Olá! Como posso ajudar você hoje?"
  suggestions={[
    "Mostre meus pedidos recentes",
    "Quero agendar um banho",
    "Busque rações premium",
  ]}
/>
```

### Considerações de segurança

- **Sanitização de input:** todo input do user passa por sanitizer (remove HTML, limita tamanho).
- **Tool authorization:** cada tool valida permissões (role do user) antes de executar.
- **Tenant isolation:** ctx do tool já tem `tenantId` injetado, queries filtram automaticamente.
- **Rate limiting:** padrão 30 mensagens/minuto/user, 500/dia/user. Configurável.
- **Token limits:** cada sessão tem max de tokens (default 100k tokens cumulativos), evita gastos descontrolados.
- **Logs:** toda chamada de tool é logada com input/output pra auditoria.
- **No PII em logs:** sanitizer remove emails/CPFs antes de logar.

---

## 2. `@ethos/ai-rag` — RAG sobre Dados do Tenant

### O que faz

Indexação e busca semântica sobre documentos e dados do tenant. Permite IA responder perguntas baseadas em conteúdo específico (manuais, FAQs, contratos, base de conhecimento).

### Casos de uso típicos

- "Pergunte ao manual" — chatbot que responde a partir de manuais técnicos do produto
- Busca semântica em base de FAQs
- Análise de contratos: "quais cláusulas falam sobre rescisão?"
- Onboarding: novo funcionário pergunta dúvidas, IA responde com base nos docs internos

### Dependências

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.30.0",
    "openai": "^4.0.0",
    "langchain": "^0.3.0",
    "pdf-parse": "^1.1.0",
    "mammoth": "^1.6.0"
  }
}
```

### Por que pgvector e não Pinecone/Weaviate

`pgvector` é uma extension do Postgres. Vantagens:

- Sem infra extra (mesmo banco do projeto)
- Sem custo adicional além do Postgres
- Backup junto do resto dos dados
- Multi-tenancy via mesma estratégia (filtro por `tenantId`)

Trade-off: pra bases com >10M de embeddings, Pinecone/Weaviate escalam melhor. Pra 99% dos clientes da Ethos (até 1M de docs), pgvector é mais que suficiente.

### Schema Prisma

```prisma
// Habilita pgvector na primeira migration
// CREATE EXTENSION IF NOT EXISTS vector;

model Document {
  id         String   @id @default(cuid())
  tenantId   String
  title      String
  source     String   // "upload", "url", "api"
  sourceUrl  String?
  fileType   String?  // "pdf", "docx", "txt", "html"
  metadata   Json?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  chunks     DocumentChunk[]

  @@index([tenantId])
}

model DocumentChunk {
  id          String   @id @default(cuid())
  documentId  String
  tenantId    String
  content     String   @db.Text
  embedding   Unsupported("vector(1536)")
  metadata    Json?
  position    Int

  document    Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([documentId])
}
```

### Backend: API

```typescript
class AiRagService {
  // Ingestão
  async ingestDocument(input: {
    title: string;
    source: "upload" | "url" | "text";
    content?: string;       // texto direto
    file?: Buffer;          // upload de arquivo
    url?: string;           // URL pra fazer fetch e parsear
    metadata?: Record<string, any>;
  }): Promise<Document>;

  async deleteDocument(documentId: string): Promise<void>;

  // Busca
  async search(input: {
    query: string;
    limit?: number;
    threshold?: number;     // similaridade mínima (0-1)
    filter?: Record<string, any>;  // filtra por metadata
  }): Promise<SearchResult[]>;

  // Pergunta com resposta gerada
  async ask(input: {
    question: string;
    contextLimit?: number;  // top-N chunks como contexto
    model?: string;
  }): Promise<{ answer: string; sources: SearchResult[] }>;
}
```

### Pipeline de ingestão

```
Upload de PDF
      ↓
[Parse com pdf-parse] → texto
      ↓
[Chunking com LangChain RecursiveCharacterTextSplitter]
   (chunks de ~1000 tokens com 200 de overlap)
      ↓
[Embedding via OpenAI text-embedding-3-small]
   (1536 dimensions, ~$0.02/1M tokens)
      ↓
[Save no pgvector com tenantId, documentId, position]
```

### Endpoints expostos

```
POST   /rag/documents              # Upload de documento
GET    /rag/documents              # Lista
DELETE /rag/documents/:id          # Remove

POST   /rag/search                 # Busca semântica (retorna chunks)
POST   /rag/ask                    # Pergunta + resposta gerada
```

### React: Hooks

```tsx
import { useRagAsk, useIngestDocument } from "@ethos/ai-rag/react";

function FaqBot() {
  const ask = useRagAsk();

  const handleAsk = async (question: string) => {
    const result = await ask.mutateAsync({ question });
    // result.answer = resposta gerada
    // result.sources = chunks usados como contexto (com links pra fontes)
  };
}
```

### React: Componente drop-in

```tsx
<RagAssistant
  placeholder="Pergunte qualquer coisa sobre o manual..."
  onAsk={(q) => trackQuestion(q)}
  showSources={true}
/>
```

### Considerações de segurança

- **Tenant isolation rigoroso:** queries de busca filtram por `tenantId` no DocumentChunk.
- **Input sanitization:** queries do user limitadas em tamanho (max 1000 chars).
- **Limite de docs por tenant:** padrão 1000 documentos / 1M chunks. Configurável.
- **Hash de duplicatas:** mesmo documento não é indexado 2x.
- **Permissões granulares:** docs podem ter `metadata.allowedRoles` pra restringir busca a roles específicos.

---

## 3. `@ethos/ocr` — OCR e Extração de Documentos

### O que faz

Extração estruturada de dados a partir de imagens e PDFs usando Claude Vision. Casos: notas fiscais, RG, CNH, comprovantes, formulários manuscritos, recibos.

### Casos de uso típicos

- Cadastro de cliente via foto do RG (auto-preenchimento)
- Lançamento de notas fiscais via foto/PDF
- Validação de comprovantes de endereço/renda
- Captura de cartões de visita

### Por que Claude Vision e não Tesseract/AWS Textract

- **Claude Vision** entende contexto, não só extrai texto. Você pede "extraia os dados desse RG e retorne nome, CPF, data de nascimento, RG" e ele entrega estruturado.
- **Tesseract** é OCR puro — você recebe texto bagunçado e tem que parsear. Funciona pra docs muito padronizados.
- **AWS Textract** é bom mas tem custo ~3x maior e requer infra AWS.

A Forge usa Claude Vision como padrão. Tesseract fica disponível pra casos high-volume onde custo importa.

### Dependências

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.30.0",
    "sharp": "^0.33.0",
    "pdf2pic": "^3.0.0"
  }
}
```

### Backend: API

```typescript
class OcrService {
  async extract<T extends z.ZodSchema>(input: {
    image?: Buffer;          // imagem direta
    pdf?: Buffer;            // PDF (converte pra imagem internamente)
    schema: T;               // schema Zod do que extrair
    instructions?: string;   // hint adicional pro modelo
    model?: "claude-sonnet-4-5" | "claude-haiku-4-5";
  }): Promise<{ data: z.infer<T>; confidence: number }>;

  // Helpers pra docs comuns
  async extractRg(image: Buffer): Promise<RgData>;
  async extractCnh(image: Buffer): Promise<CnhData>;
  async extractCpf(image: Buffer): Promise<CpfData>;
  async extractInvoice(file: Buffer): Promise<InvoiceData>; // nota fiscal
  async extractReceipt(image: Buffer): Promise<ReceiptData>;
  async extractBusinessCard(image: Buffer): Promise<BusinessCardData>;
}
```

### Exemplo de uso custom

```typescript
const proofOfAddressSchema = z.object({
  documentType: z.enum(["energy_bill", "water_bill", "phone_bill", "bank_statement"]),
  issuerName: z.string(),
  customerName: z.string(),
  customerAddress: z.string(),
  issueDate: z.string(),
  dueDate: z.string().optional(),
});

const result = await ocr.extract({
  pdf: pdfBuffer,
  schema: proofOfAddressSchema,
  instructions: "Esse é um comprovante de endereço brasileiro. Extraia o tipo, o emissor, o nome e endereço do cliente, data de emissão e vencimento.",
});

console.log(result.data.customerAddress);
// "Rua das Flores, 123 - Centro - Goiânia/GO - 74000-000"
```

### Endpoints expostos

```
POST /ocr/extract              # Endpoint genérico (recebe schema)
POST /ocr/extract/rg
POST /ocr/extract/cnh
POST /ocr/extract/invoice
POST /ocr/extract/receipt
POST /ocr/extract/business-card
```

Todos aceitam multipart com arquivo.

### React: Hooks e componentes

```tsx
import { useOcr } from "@ethos/ocr/react";

function ClientFormWithOcr() {
  const ocr = useOcr();
  const form = useForm();

  const handleRgUpload = async (file: File) => {
    const result = await ocr.mutateAsync({
      type: "rg",
      file,
    });

    // Auto-preenche o form
    form.setValue("name", result.data.fullName);
    form.setValue("cpf", result.data.cpf);
    form.setValue("birthDate", result.data.birthDate);
  };

  return (
    <FormBuilder
      fields={[
        { name: "name", label: "Nome", type: "text" },
        { name: "cpf", label: "CPF", type: "cpf" },
        { name: "birthDate", label: "Data de nascimento", type: "date" },
      ]}
      additionalActions={
        <FileUpload
          accept="image/*,application/pdf"
          onUpload={handleRgUpload}
          buttonLabel="Preencher por RG"
        />
      }
    />
  );
}
```

### Considerações de segurança

- **PII em logs:** dados extraídos NÃO são logados em texto plano.
- **Storage temporário:** imagens são processadas e descartadas imediatamente. Não persistem em disco da API.
- **Encryption em trânsito:** uploads via HTTPS obrigatório.
- **Limite de tamanho:** max 20MB por arquivo.
- **Rate limit:** padrão 50 extrações/hora/tenant.
- **LGPD:** se cliente solicitar exclusão de dados, dados extraídos seguem o mesmo fluxo (right to erasure).

---

## 4. `@ethos/whatsapp` — WhatsApp Business

### O que faz

Integração com WhatsApp via Z-API (provider brasileiro econômico) ou WhatsApp Business API oficial (Meta). Suporta envio/recebimento de mensagens, mídia, templates, e webhook pra automações.

### Casos de uso típicos

- Notificações automáticas: "seu pedido foi enviado", "consulta confirmada amanhã"
- Atendimento: chatbot via WhatsApp integrado com `@ethos/ai-chat`
- Pesquisas de satisfação automatizadas
- Envio de boletos/faturas
- Marketing (com opt-in adequado)

### Z-API vs WhatsApp Business API (WABA)

| Aspecto | Z-API | WABA (Meta) |
|---------|-------|-------------|
| Custo inicial | Baixo (~R$ 99/mês) | Médio (setup + verificação) |
| Custo por msg | Sem custo extra | Variável por conversa |
| Aprovação | Imediata | 1-2 semanas (Meta verifica) |
| Templates | Não obrigatório | Obrigatório pra mensagens iniciadas pelo negócio |
| Estabilidade | Boa, mas não-oficial | Oficial, garantida por Meta |
| Volume | Médio (recomendado <1k/dia) | Sem limite prático |

A Forge suporta os dois. Cliente escolhe baseado em necessidade. Por padrão, Z-API pra projetos simples, WABA pra projetos enterprise.

### Dependências

```json
{
  "dependencies": {
    "axios": "^1.7.0",
    "@nestjs/bull": "^10.0.0"
  }
}
```

### Schema Prisma

```prisma
model WhatsappContact {
  id        String   @id @default(cuid())
  tenantId  String
  phone     String
  name      String?
  optIn     Boolean  @default(false)
  optInAt   DateTime?
  blocked   Boolean  @default(false)
  metadata  Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  conversations WhatsappConversation[]

  @@unique([tenantId, phone])
  @@index([tenantId])
}

model WhatsappConversation {
  id          String   @id @default(cuid())
  tenantId    String
  contactId   String
  status      ConversationStatus @default(open)
  assignedTo  String?
  lastMessageAt DateTime?
  createdAt   DateTime @default(now())

  contact     WhatsappContact @relation(fields: [contactId], references: [id])
  messages    WhatsappMessage[]

  @@index([tenantId])
  @@index([contactId])
}

model WhatsappMessage {
  id              String   @id @default(cuid())
  conversationId  String
  direction       MessageDirection
  type            MessageType
  content         String?  @db.Text
  mediaUrl        String?
  status          MessageStatus
  externalId      String?  // ID no provider
  metadata        Json?
  createdAt       DateTime @default(now())

  conversation    WhatsappConversation @relation(fields: [conversationId], references: [id])

  @@index([conversationId])
  @@index([externalId])
}

enum ConversationStatus { open closed pending }
enum MessageDirection { inbound outbound }
enum MessageType { text image audio video document location contact template }
enum MessageStatus { queued sent delivered read failed }
```

### Backend: API

```typescript
class WhatsappService {
  async sendText(input: {
    to: string;              // E.164 (+5562...)
    message: string;
    contactId?: string;      // pra associar a contato existente
  }): Promise<WhatsappMessage>;

  async sendMedia(input: {
    to: string;
    type: "image" | "audio" | "video" | "document";
    url: string;
    caption?: string;
    filename?: string;       // pra documents
  }): Promise<WhatsappMessage>;

  async sendTemplate(input: {
    to: string;
    templateName: string;
    variables: Record<string, string>;
  }): Promise<WhatsappMessage>;

  async sendInteractive(input: {
    to: string;
    body: string;
    buttons: Array<{ id: string; title: string }>;
  }): Promise<WhatsappMessage>;

  // Recebimento via webhook
  async handleIncoming(payload: any): Promise<void>;

  // Sessões
  async listConversations(tenantId: string, filter?: ConversationFilter): Promise<WhatsappConversation[]>;
  async getConversation(id: string): Promise<WhatsappConversation & { messages: WhatsappMessage[] }>;
  async closeConversation(id: string): Promise<void>;
  async assignConversation(id: string, userId: string): Promise<void>;
}
```

### Webhook handler

Recebe mensagens entrantes do provider (Z-API ou Meta). Padrão:

```typescript
@Controller("webhooks/whatsapp")
export class WhatsappWebhookController {
  constructor(private whatsapp: WhatsappService) {}

  @Post()
  async handle(@Body() payload: any, @Headers() headers: any) {
    // Valida assinatura do webhook
    this.whatsapp.validateWebhookSignature(payload, headers);

    // Processa em background (BullMQ)
    await this.whatsappQueue.add("process-incoming", payload);

    return { ok: true };
  }
}
```

### Integração com @ethos/ai-chat

Plugin pronto pra responder via IA:

```typescript
// apps/api/src/modules/whatsapp/whatsapp-bot.service.ts
@Injectable()
export class WhatsappBotService {
  constructor(
    private whatsapp: WhatsappService,
    private aiChat: AiChatService,
  ) {}

  @OnEvent("whatsapp.message.received")
  async handleIncoming(message: WhatsappMessage) {
    if (message.direction !== "inbound") return;

    const session = await this.aiChat.getOrCreateSession({
      tenantId: message.tenantId,
      externalId: `whatsapp:${message.conversationId}`,
    });

    const response = await this.aiChat.sendMessage({
      sessionId: session.id,
      message: message.content,
      tools: ["search_clients", "create_appointment", "..."],
    });

    await this.whatsapp.sendText({
      to: message.from,
      message: response.content,
    });
  }
}
```

### React: Painel de conversas

```tsx
import { ConversationsList, ConversationView } from "@ethos/whatsapp/react";

function InboxPage() {
  const [selectedId, setSelectedId] = useState<string>();

  return (
    <div className="grid grid-cols-[300px_1fr] h-screen">
      <ConversationsList
        onSelect={setSelectedId}
        selectedId={selectedId}
        filters={{ status: "open" }}
      />
      {selectedId && <ConversationView conversationId={selectedId} />}
    </div>
  );
}
```

### Considerações de segurança

- **Validação de webhook:** assinatura HMAC obrigatória pra todos os providers.
- **Opt-in mandatório:** mensagens iniciadas pelo negócio só pra contatos com `optIn=true`. Audit log do consentimento.
- **Block list:** contatos podem ser bloqueados (pelo user ou automaticamente após reportar spam).
- **Rate limit:** padrão Z-API permite ~80 msg/min. Forge respeita e enfileira via BullMQ.
- **Mídia:** uploads passam por antivírus básico antes de armazenar.
- **LGPD:** contatos podem solicitar exclusão. Forge oferece endpoint `DELETE /whatsapp/contacts/:id` que limpa histórico.

---

## 5. `@ethos/google` — Calendar, Drive, Sheets

### O que faz

Integração com Google Workspace via OAuth 2.0. Suporta Google Calendar (criar/listar eventos), Google Drive (upload/listar arquivos), Google Sheets (ler/escrever planilhas).

### Casos de uso típicos

- Sistema de agendamento que sincroniza com Google Calendar do profissional
- Upload de documentos do sistema direto pra Drive do cliente
- Export de relatórios pra Sheets pro cliente analisar
- Backup automático de dados em Drive

### Dependências

```json
{
  "dependencies": {
    "googleapis": "^140.0.0",
    "google-auth-library": "^9.0.0"
  }
}
```

### Schema Prisma

```prisma
model GoogleConnection {
  id           String   @id @default(cuid())
  tenantId     String
  userId       String
  scopes       String[] // ["calendar", "drive.file", "spreadsheets"]
  accessToken  String   @db.Text  // /// @encrypted
  refreshToken String   @db.Text  // /// @encrypted
  expiresAt    DateTime
  email        String   // email da conta Google
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([tenantId, userId])
  @@index([tenantId])
}
```

### Backend: API

```typescript
class GoogleService {
  // OAuth flow
  generateAuthUrl(input: { scopes: GoogleScope[]; state: string }): string;
  async handleCallback(code: string, userId: string, tenantId: string): Promise<GoogleConnection>;
  async disconnect(userId: string, tenantId: string): Promise<void>;
  async refreshTokenIfNeeded(connectionId: string): Promise<GoogleConnection>;

  // Calendar
  calendar: GoogleCalendarApi;

  // Drive
  drive: GoogleDriveApi;

  // Sheets
  sheets: GoogleSheetsApi;
}

class GoogleCalendarApi {
  async listCalendars(userId: string): Promise<Calendar[]>;
  async listEvents(input: { calendarId: string; from: Date; to: Date }): Promise<CalendarEvent[]>;
  async createEvent(input: CreateEventInput): Promise<CalendarEvent>;
  async updateEvent(eventId: string, input: UpdateEventInput): Promise<CalendarEvent>;
  async deleteEvent(eventId: string): Promise<void>;
  async watchCalendar(input: { calendarId: string; webhookUrl: string }): Promise<WatchResponse>;
}

class GoogleDriveApi {
  async listFiles(input: { folderId?: string; query?: string }): Promise<DriveFile[]>;
  async uploadFile(input: { name: string; content: Buffer; mimeType: string; folderId?: string }): Promise<DriveFile>;
  async downloadFile(fileId: string): Promise<Buffer>;
  async deleteFile(fileId: string): Promise<void>;
  async createFolder(input: { name: string; parentId?: string }): Promise<DriveFile>;
  async shareFile(input: { fileId: string; email: string; role: "reader" | "writer" | "commenter" }): Promise<void>;
}

class GoogleSheetsApi {
  async createSpreadsheet(input: { title: string; sheets: string[] }): Promise<Spreadsheet>;
  async readRange(input: { spreadsheetId: string; range: string }): Promise<any[][]>;
  async writeRange(input: { spreadsheetId: string; range: string; values: any[][] }): Promise<void>;
  async appendRows(input: { spreadsheetId: string; range: string; values: any[][] }): Promise<void>;
  async clearRange(input: { spreadsheetId: string; range: string }): Promise<void>;
}
```

### Endpoints expostos

```
GET    /google/auth                  # Inicia OAuth
GET    /google/callback              # Callback do OAuth
DELETE /google/connection            # Desconecta

GET    /google/calendar/events
POST   /google/calendar/events
PATCH  /google/calendar/events/:id
DELETE /google/calendar/events/:id

GET    /google/drive/files
POST   /google/drive/upload
GET    /google/drive/files/:id/download
DELETE /google/drive/files/:id

POST   /google/sheets
GET    /google/sheets/:id/values/:range
PUT    /google/sheets/:id/values/:range
```

### React: Hooks

```tsx
import { useGoogleConnection, useCalendarEvents } from "@ethos/google/react";

function CalendarSync() {
  const { isConnected, connect, disconnect } = useGoogleConnection();
  const { events } = useCalendarEvents({ from: today, to: nextWeek });

  if (!isConnected) {
    return <Button onClick={connect}>Conectar Google</Button>;
  }

  return <CalendarView events={events} />;
}
```

### Considerações de segurança

- **Tokens encriptados:** access e refresh tokens persistidos com encryption (Prisma extension `withEncryption`).
- **Scopes mínimos:** só pede os scopes que precisa. `drive.file` (acesso só a arquivos criados pelo app) ao invés de `drive` (todo o Drive) sempre que possível.
- **Refresh automático:** access tokens expirados são renovados automaticamente.
- **Revogação:** desconectar revoga tokens no lado Google também (não só apaga do DB).
- **State em OAuth:** previne CSRF.

---

## 6. `@ethos/n8n` — Workflows e Automações

### O que faz

Wrapper sobre n8n self-hosted (ou n8n.cloud). Permite triggar workflows do sistema, expor webhooks pra workflows externos, e gerenciar workflows via API.

### Casos de uso típicos

- Cliente cria pedido → workflow no n8n: cria nota fiscal no Bling + manda email + posta no Slack
- Monitor automático: "todo dia 8h, gera relatório de vendas e manda no email"
- Integrações sem código: "quando entrar lead pelo formulário, cria contato no HubSpot"

### Por que n8n e não Zapier/Make

- **Self-hosted:** roda no Railway junto com o resto. Sem custo por execução.
- **Open source:** licença generosa (Sustainable Use License).
- **Visual:** UX similar a Zapier, drag-and-drop.
- **Code nodes:** quando precisa de lógica custom, JS/Python disponível.
- **Centenas de integrações nativas:** Stripe, Bling, Mercado Pago, Slack, Telegram, etc.

Trade-off: n8n self-hosted requer manutenção. Pra clientes que querem zero ops, oferece n8n.cloud (pago).

### Dependências

```json
{
  "dependencies": {
    "axios": "^1.7.0"
  }
}
```

### Backend: API

```typescript
class N8nService {
  // Trigger
  async triggerWorkflow(input: {
    workflowId: string;
    payload: Record<string, any>;
  }): Promise<{ executionId: string; status: string }>;

  async getExecution(executionId: string): Promise<Execution>;
  async listExecutions(workflowId: string): Promise<Execution[]>;

  // Gerenciamento
  async listWorkflows(): Promise<Workflow[]>;
  async getWorkflow(id: string): Promise<Workflow>;
  async activateWorkflow(id: string): Promise<void>;
  async deactivateWorkflow(id: string): Promise<void>;

  // Webhook helpers
  generateWebhookUrl(workflowId: string): string;
  async expose Webhook(input: ExposeWebhookInput): Promise<{ url: string }>;
}
```

### Padrão de uso: triggar workflow após evento

```typescript
@Injectable()
export class OrderService extends BaseOrderService {
  constructor(prisma: PrismaService, private n8n: N8nService) {
    super(prisma);
  }

  async create(data: CreateOrderDto, userId: string) {
    const order = await super.create({ data });

    // Triggar workflow assíncrono
    await this.n8n.triggerWorkflow({
      workflowId: "order-created-flow",
      payload: { order, userId },
    });

    return order;
  }
}
```

### Eventos automáticos

Forge emite eventos NestJS pra eventos do sistema. `@ethos/n8n` pode escutar e triggar workflows configuráveis:

```typescript
// configuração no projeto cliente
n8n.on("client.created", "workflow-id-1");
n8n.on("order.completed", "workflow-id-2");
n8n.on("payment.received", "workflow-id-3");
```

### React: Componente de configuração

```tsx
import { N8nWorkflowSelect, N8nExecutionsList } from "@ethos/n8n/react";

function AutomationsPage() {
  return (
    <>
      <Card>
        <h3>Workflows ativos</h3>
        <N8nWorkflowSelect onChange={configure} />
      </Card>

      <Card>
        <h3>Histórico de execuções</h3>
        <N8nExecutionsList />
      </Card>
    </>
  );
}
```

### Considerações de segurança

- **API key do n8n:** persistida em env var. Não exposta no frontend.
- **Webhook signing:** todo webhook do n8n pra Forge é assinado HMAC.
- **Tenant isolation:** cada projeto tem seu próprio n8n (instância separada) ou usa namespacing por tag.
- **Rate limiting:** n8n configura rate limits no nível dele. Forge não tenta override.

---

## 7. `@ethos/payments` — Pagamentos Unificados

### O que faz

Camada unificada sobre Mercado Pago, Stripe, PagSeguro. API única, escolhe provider em runtime. Suporta cartão, Pix, boleto, recorrência, split.

### Casos de uso típicos

- E-commerce com checkout multi-provider
- SaaS com assinatura recorrente
- Marketplace com split de pagamento
- Cobrança avulsa via Pix

### Dependências

```json
{
  "dependencies": {
    "mercadopago": "^2.0.0",
    "stripe": "^17.0.0",
    "@pagseguro/standard-checkout": "^1.0.0"
  }
}
```

### Schema Prisma

```prisma
model PaymentCustomer {
  id             String   @id @default(cuid())
  tenantId       String
  email          String
  name           String?
  document       String?  // /// @encrypted CPF/CNPJ
  externalIds    Json     // { mercadopago: "...", stripe: "...", pagseguro: "..." }
  metadata       Json?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  payments       Payment[]
  subscriptions  Subscription[]

  @@unique([tenantId, email])
  @@index([tenantId])
}

model Payment {
  id              String   @id @default(cuid())
  tenantId        String
  customerId      String?
  provider        PaymentProvider
  externalId      String   // ID no provider
  amount          Int      // em centavos
  currency        String   @default("BRL")
  status          PaymentStatus
  method          PaymentMethod
  description     String?
  metadata        Json?
  paidAt          DateTime?
  expiresAt       DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  customer        PaymentCustomer? @relation(fields: [customerId], references: [id])

  @@index([tenantId])
  @@index([externalId])
}

model Subscription {
  id              String   @id @default(cuid())
  tenantId        String
  customerId      String
  provider        PaymentProvider
  externalId      String
  planId          String
  status          SubscriptionStatus
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  cancelAt        DateTime?
  metadata        Json?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  customer        PaymentCustomer @relation(fields: [customerId], references: [id])

  @@index([tenantId])
  @@index([externalId])
}

enum PaymentProvider { mercadopago stripe pagseguro }
enum PaymentStatus { pending paid failed refunded canceled }
enum PaymentMethod { credit_card debit_card pix boleto bank_transfer }
enum SubscriptionStatus { active past_due canceled paused }
```

### Backend: API unificada

```typescript
class PaymentsService {
  // One-shot payment
  async createPayment(input: {
    provider?: PaymentProvider;  // se omitido, usa default
    amount: number;              // em centavos
    method: PaymentMethod;
    customerId?: string;
    description?: string;
    metadata?: Record<string, any>;

    // Específicos por método
    cardToken?: string;          // pra cartão
    cardInstallments?: number;
    pixExpiresAt?: Date;         // pra pix
    boletoExpiresAt?: Date;
    splits?: PaymentSplit[];     // pra marketplace
  }): Promise<Payment>;

  async getPayment(id: string): Promise<Payment>;
  async refundPayment(id: string, amount?: number): Promise<Payment>;
  async cancelPayment(id: string): Promise<Payment>;

  // Customers
  async createCustomer(input: CreateCustomerInput): Promise<PaymentCustomer>;
  async updateCustomer(id: string, input: UpdateCustomerInput): Promise<PaymentCustomer>;

  // Subscriptions
  async createSubscription(input: CreateSubscriptionInput): Promise<Subscription>;
  async cancelSubscription(id: string, immediate?: boolean): Promise<Subscription>;
  async pauseSubscription(id: string): Promise<Subscription>;
  async resumeSubscription(id: string): Promise<Subscription>;

  // Webhook handling (cada provider)
  async handleWebhook(provider: PaymentProvider, payload: any, signature: string): Promise<void>;
}
```

### Configuração do provider default por tenant

```typescript
// projeto cliente
PaymentsModule.forRoot({
  defaultProvider: "mercadopago",
  providers: {
    mercadopago: { accessToken: process.env.MP_ACCESS_TOKEN },
    stripe: { secretKey: process.env.STRIPE_SECRET_KEY },
    pagseguro: { token: process.env.PAGSEGURO_TOKEN },
  },
});
```

### Adapters internos

`@ethos/payments` tem adapters separados pra cada provider que normalizam diferenças:

```
src/backend/adapters/
├── mercadopago.adapter.ts
├── stripe.adapter.ts
└── pagseguro.adapter.ts
```

Cada adapter implementa interface `PaymentProvider`:

```typescript
interface PaymentProvider {
  createPayment(input: NormalizedPaymentInput): Promise<NormalizedPayment>;
  getPayment(externalId: string): Promise<NormalizedPayment>;
  refund(externalId: string, amount?: number): Promise<NormalizedPayment>;
  // ...
}
```

### React: Componente de checkout

```tsx
import { Checkout } from "@ethos/payments/react";

function CheckoutPage() {
  return (
    <Checkout
      amount={15990}             // R$ 159,90 em centavos
      methods={["credit_card", "pix", "boleto"]}
      provider="mercadopago"
      customer={{
        email: user.email,
        name: user.name,
      }}
      onSuccess={(payment) => router.push(`/orders/${payment.metadata.orderId}/success`)}
      onError={(err) => toast.error(err.message)}
    />
  );
}
```

### Considerações de segurança

- **PCI compliance:** dados de cartão NUNCA passam pelo backend da Forge. Frontend gera token via SDK do provider, backend só recebe o token.
- **Idempotency:** todo create-payment aceita `idempotencyKey` pra evitar duplicação.
- **Webhook signing:** validação de assinatura obrigatória pra todos os providers.
- **PII encryption:** CPF/CNPJ persistido com encryption.
- **Audit log:** toda transação financeira é logada com user, timestamp, valor.
- **Reconciliação:** job diário compara payments no DB com o que o provider reporta. Discrepâncias geram alerta.

---

## 8. `@ethos/erp-bridge` — Integrações com ERPs

### O que faz

Camada unificada pra integração com ERPs nacionais: Bling, Tiny, Omie. Sincroniza produtos, pedidos, notas fiscais, estoque.

### Casos de uso típicos

- E-commerce com produtos sincronizados do Bling
- Sistema de vendas que emite NFe via Tiny automaticamente
- Painel de gestão consumindo dados do Omie como fonte de verdade

### Dependências

```json
{
  "dependencies": {
    "axios": "^1.7.0"
  }
}
```

### Adapters

`@ethos/erp-bridge` segue mesmo padrão de `@ethos/payments`: interface unificada + adapters por ERP.

```typescript
interface ErpAdapter {
  // Produtos
  listProducts(filters?: ProductFilter): Promise<Product[]>;
  getProduct(id: string): Promise<Product>;
  createProduct(input: CreateProductInput): Promise<Product>;
  updateProduct(id: string, input: UpdateProductInput): Promise<Product>;
  deleteProduct(id: string): Promise<void>;

  // Estoque
  getStock(productId: string): Promise<StockInfo>;
  updateStock(productId: string, quantity: number): Promise<StockInfo>;

  // Pedidos
  listOrders(filters?: OrderFilter): Promise<Order[]>;
  getOrder(id: string): Promise<Order>;
  createOrder(input: CreateOrderInput): Promise<Order>;
  updateOrderStatus(id: string, status: OrderStatus): Promise<Order>;

  // Notas fiscais
  emitInvoice(orderId: string): Promise<Invoice>;
  getInvoice(id: string): Promise<Invoice>;
  cancelInvoice(id: string, reason: string): Promise<Invoice>;

  // Webhooks
  handleWebhook(payload: any, signature: string): Promise<WebhookEvent>;
}
```

### Backend: Service

```typescript
class ErpBridgeService {
  // Operações via adapter ativo
  products: ErpProductsApi;
  orders: ErpOrdersApi;
  invoices: ErpInvoicesApi;
  stock: ErpStockApi;

  // Sincronização
  async syncProducts(): Promise<SyncReport>;
  async syncOrders(input: { from: Date; to: Date }): Promise<SyncReport>;
  async syncStock(): Promise<SyncReport>;

  // Configuração
  async setActiveAdapter(provider: ErpProvider, credentials: any): Promise<void>;
  async listConfigured(): Promise<ErpConfig[]>;
}
```

### Configuração do ERP por tenant

```typescript
ErpBridgeModule.forRoot({
  defaultProvider: "bling",
  providers: {
    bling: { apiKey: process.env.BLING_API_KEY },
    tiny: { token: process.env.TINY_TOKEN },
    omie: { appKey: process.env.OMIE_APP_KEY, appSecret: process.env.OMIE_APP_SECRET },
  },
});
```

### Estratégia de sincronização

Dois modelos suportados:

1. **Pull (a Forge consulta o ERP):** ideal pra sync inicial e reconciliação. Job em cron (a cada 1h por exemplo) puxa atualizações.

2. **Push (ERP notifica via webhook):** ideal pra real-time. Bling, Tiny e Omie têm webhooks. Forge expõe endpoints pra receber.

Recomendado: webhook + sync diário pra reconciliação.

### Mapeamento de campos

Cada ERP tem seus próprios campos. O adapter normaliza pra schema padrão Forge. Tabela de mapeamento documentada em cada adapter:

```typescript
// bling.adapter.ts
function mapProductFromBling(bling: BlingProduct): Product {
  return {
    id: bling.id.toString(),
    sku: bling.codigo,
    name: bling.descricao,
    price: parseFloat(bling.preco) * 100, // converte pra centavos
    stock: bling.estoque?.saldoVirtualTotal ?? 0,
    category: bling.categoria?.descricao,
    metadata: { source: "bling", originalData: bling },
  };
}
```

### React: Componentes

```tsx
import { ErpStatus, ErpSyncButton } from "@ethos/erp-bridge/react";

function IntegrationsPage() {
  return (
    <>
      <ErpStatus />  {/* Mostra ERP ativo, última sync, status */}

      <ErpSyncButton type="products">Sincronizar produtos</ErpSyncButton>
      <ErpSyncButton type="orders">Sincronizar pedidos</ErpSyncButton>
    </>
  );
}
```

### Considerações de segurança

- **Credenciais encriptadas:** API keys persistidas com encryption.
- **Rate limiting respeitoso:** cada adapter respeita rate limits do ERP (Bling 3 req/s, Tiny 60 req/min, Omie 4 req/s).
- **Retry com backoff:** falhas transitórias são retryadas exponencialmente.
- **Reconciliação:** job diário compara dados locais com ERP, gera relatório de discrepâncias.
- **Audit log:** toda operação no ERP é logada (criação, update, exclusão).

---

## Resumo dos pacotes

| Pacote | Foco | Complexidade |
|--------|------|--------------|
| `@ethos/ai-chat` | Chat com Claude + tools | Média |
| `@ethos/ai-rag` | RAG sobre docs do tenant | Média-alta |
| `@ethos/ocr` | Extração de docs via Vision | Baixa-média |
| `@ethos/whatsapp` | WhatsApp via Z-API/WABA | Alta |
| `@ethos/google` | Calendar/Drive/Sheets | Média |
| `@ethos/n8n` | Wrapper de workflows | Baixa |
| `@ethos/payments` | MP/Stripe/PagSeguro unificados | Alta |
| `@ethos/erp-bridge` | Bling/Tiny/Omie unificados | Alta |

---

## Ordem de construção sugerida

Ver detalhes em **`11-ROADMAP-CONSTRUCAO.md`**. Resumo:

1. `@ethos/ai-chat` (mais usado, valida padrão de pacote)
2. `@ethos/ocr` (pequeno, complementar ao ai-chat)
3. `@ethos/google` (média, OAuth resolve padrão de auth com terceiros)
4. `@ethos/n8n` (simples wrapper)
5. `@ethos/whatsapp` (alta demanda)
6. `@ethos/ai-rag` (depende de pgvector, mais infra)
7. `@ethos/payments` (crítico, segurança rigorosa)
8. `@ethos/erp-bridge` (mais complexo, três providers)

---

## Padrão de versionamento dos pacotes

Cada pacote tem versão própria, sincronizada com versão global da Forge na v1. Após v1.0:

- Bug fixes: patch (`1.0.1`, `1.0.2`)
- Features novas backwards-compatible: minor (`1.1.0`, `1.2.0`)
- Breaking changes: major (`2.0.0`)

Mudanças breaking precisam de CHANGELOG detalhado e migration guide.

---

## Como adicionar pacote novo no futuro

Quando aparecer demanda recorrente por nova integração (ex: `@ethos/sms`, `@ethos/storage-s3`, `@ethos/email-marketing`), seguir checklist:

1. Criar pasta `packages/[nome]/` com estrutura padrão
2. Implementar interface backend + frontend seguindo padrão dos outros
3. Documentar em README do pacote
4. Adicionar entrada nesse `08-PACOTES-PLUGAVEIS.md`
5. Criar testes
6. Validar em projeto real antes de marcar como estável
