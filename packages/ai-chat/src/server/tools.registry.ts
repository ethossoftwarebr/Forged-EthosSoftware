import { Injectable, Logger } from '@nestjs/common';
import {
  z,
  type ZodTypeAny,
  ZodObject,
  ZodString,
  ZodNumber,
  ZodBoolean,
  ZodArray,
  ZodEnum,
  ZodOptional,
  ZodDefault,
  ZodNullable,
} from 'zod';

import type { ToolDef } from '../shared';

/**
 * Token DI pro array de tools (default `[]` no forRoot, override via forFeature).
 */
export const AI_CHAT_TOOLS_TOKEN = Symbol('AI_CHAT_TOOLS_TOKEN');

/**
 * JSON Schema (draft-7-ish, suficiente pra Anthropic Tool API) gerado a partir
 * dum `ZodType`. Não é completo — só cobre object/string/number/boolean/array/
 * enum/optional/default/nullable. Tools demo (#W2.6) usam só esse subset.
 *
 * Decisão (RETURN doc): não temos `zod-to-json-schema` em deps. Geramos manual.
 * Se tools complexos forem necessários, devs podem passar JSON Schema bruto
 * via wrapper no `inputSchema` — issue futura.
 */
export interface JsonSchema {
  type?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: unknown[];
  default?: unknown;
  nullable?: boolean;
  additionalProperties?: boolean;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
}

function zodToJsonSchema(schema: ZodTypeAny): JsonSchema {
  const def = (schema as { _def: { description?: string } })._def;
  const description = def?.description;

  if (schema instanceof ZodOptional) {
    return zodToJsonSchema((schema as ZodOptional<ZodTypeAny>)._def.innerType);
  }
  if (schema instanceof ZodDefault) {
    const inner = zodToJsonSchema((schema as ZodDefault<ZodTypeAny>)._def.innerType);
    return {
      ...inner,
      default: (schema as ZodDefault<ZodTypeAny>)._def.defaultValue(),
    };
  }
  if (schema instanceof ZodNullable) {
    const inner = zodToJsonSchema((schema as ZodNullable<ZodTypeAny>)._def.innerType);
    return { ...inner, nullable: true };
  }
  if (schema instanceof ZodString) {
    const checks =
      (schema._def as { checks?: Array<{ kind: string; value?: number }> }).checks ?? [];
    const out: JsonSchema = { type: 'string' };
    for (const c of checks) {
      if (c.kind === 'min' && typeof c.value === 'number') out.minLength = c.value;
      if (c.kind === 'max' && typeof c.value === 'number') out.maxLength = c.value;
    }
    if (description) out.description = description;
    return out;
  }
  if (schema instanceof ZodNumber) {
    const checks =
      (schema._def as { checks?: Array<{ kind: string; value?: number }> }).checks ?? [];
    const out: JsonSchema = { type: 'number' };
    for (const c of checks) {
      if (c.kind === 'min' && typeof c.value === 'number') out.minimum = c.value;
      if (c.kind === 'max' && typeof c.value === 'number') out.maximum = c.value;
      if (c.kind === 'int') out.type = 'integer';
    }
    if (description) out.description = description;
    return out;
  }
  if (schema instanceof ZodBoolean) {
    return description ? { type: 'boolean', description } : { type: 'boolean' };
  }
  if (schema instanceof ZodEnum) {
    const values = (schema._def as { values: readonly string[] }).values;
    return description
      ? { type: 'string', enum: [...values], description }
      : { type: 'string', enum: [...values] };
  }
  if (schema instanceof ZodArray) {
    const items = zodToJsonSchema((schema._def as { type: ZodTypeAny }).type);
    return description ? { type: 'array', items, description } : { type: 'array', items };
  }
  if (schema instanceof ZodObject) {
    const shape = (schema as ZodObject<z.ZodRawShape>).shape;
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];
    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToJsonSchema(value as ZodTypeAny);
      // Required se NÃO é optional/default no nível mais externo
      if (!(value instanceof ZodOptional) && !(value instanceof ZodDefault)) {
        required.push(key);
      }
    }
    const out: JsonSchema = {
      type: 'object',
      properties,
      additionalProperties: false,
    };
    if (required.length > 0) out.required = required;
    if (description) out.description = description;
    return out;
  }

  // Fallback genérico — Anthropic tolera schemas mínimos
  return description ? { type: 'object', description } : { type: 'object' };
}

/**
 * Formato esperado pela API Anthropic Tool Use (input_schema = JSON Schema).
 */
/**
 * Tool spec compatível com Anthropic API. `input_schema.type` é literalmente
 * `'object'` (exigido pelo SDK v0.30).
 */
export interface AnthropicToolSpec {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties?: Record<string, JsonSchema>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

/**
 * Registry de tools — populado via DI no AiChatModule. Devs registram tools
 * via `AiChatModule.forFeature([searchProductsTool, createTicketTool])`.
 *
 * Não é `@Global` — escopo de cada feature module. Service injeta direto.
 */
@Injectable()
export class ToolsRegistry {
  private readonly logger = new Logger(ToolsRegistry.name);
  private readonly tools = new Map<string, ToolDef>();

  constructor(tools: ToolDef[] = []) {
    for (const tool of tools) {
      if (this.tools.has(tool.name)) {
        this.logger.warn(`Tool "${tool.name}" already registered — last write wins`);
      }
      this.tools.set(tool.name, tool);
    }
  }

  get(name: string): ToolDef | undefined {
    return this.tools.get(name);
  }

  /** Lista as tools no formato esperado pela API Anthropic. */
  list(): AnthropicToolSpec[] {
    return Array.from(this.tools.values()).map((t) => {
      const schema = zodToJsonSchema(t.inputSchema as ZodTypeAny);
      // Anthropic exige `type: 'object'` literal — se o zod não é um object
      // top-level, embrulhamos num wrapper trivial.
      const wrapped: AnthropicToolSpec['input_schema'] =
        schema.type === 'object'
          ? {
              type: 'object',
              properties: schema.properties ?? {},
              ...(schema.required ? { required: schema.required } : {}),
              additionalProperties: schema.additionalProperties ?? false,
            }
          : { type: 'object', properties: {}, additionalProperties: false };
      return {
        name: t.name,
        description: t.description,
        input_schema: wrapped,
      };
    });
  }

  /** Retorna `true` se o registry tem ao menos uma tool. */
  hasTools(): boolean {
    return this.tools.size > 0;
  }

  /**
   * Executa uma tool por nome, validando o input via zod antes de chamar o handler.
   * Erros de validação ou execução são propagados — o service trata.
   */
  async executeTool(name: string, input: unknown): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" not found in registry`);
    }
    const parsed = tool.inputSchema.parse(input);
    return tool.handler(parsed);
  }
}
