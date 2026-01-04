import { useState, ChangeEvent } from 'react';
import { Plus, Trash2, Layers, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { useConfigStore } from '@/stores/configStore';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import MultiSelect from '../ui/MultiSelect';
import Textarea from '../ui/Textarea';
import Card from '../ui/Card';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import { MiddlewareModel } from '@/types/dao-ai-types';
import { normalizeRefNameWhileTyping } from '@/utils/name-utils';
import { safeDelete } from '@/utils/safe-delete';

// Helper to generate default reference name from factory function
const generateDefaultRefName = (factoryFunction: string): string => {
  if (factoryFunction === 'custom') {
    return '';
  }
  
  // Extract the meaningful part from factory function name
  // e.g., "dao_ai.middleware.create_guardrail_middleware" -> "guardrail_middleware"
  const match = factoryFunction.match(/create_(.+)$/);
  if (match && match[1]) {
    return match[1];
  }
  
  // Fallback: use the last part of the function name
  const parts = factoryFunction.split('.');
  return parts[parts.length - 1] || 'middleware';
};

// Preconfigured middleware from dao_ai.middleware
const PRECONFIGURED_MIDDLEWARE = [
  {
    value: 'dao_ai.middleware.create_guardrail_middleware',
    label: 'Guardrail Middleware',
    description: 'LLM-based guardrail validation with retry logic',
    category: 'Guardrails',
  },
  {
    value: 'dao_ai.middleware.create_content_filter_middleware',
    label: 'Content Filter',
    description: 'Deterministic keyword-based content blocking',
    category: 'Guardrails',
  },
  {
    value: 'dao_ai.middleware.create_safety_guardrail_middleware',
    label: 'Safety Guardrail',
    description: 'Safety-focused response evaluation',
    category: 'Guardrails',
  },
  {
    value: 'dao_ai.middleware.create_user_id_validation_middleware',
    label: 'User ID Validation',
    description: 'Ensure user_id is present in context',
    category: 'Validation',
  },
  {
    value: 'dao_ai.middleware.create_thread_id_validation_middleware',
    label: 'Thread ID Validation',
    description: 'Ensure thread_id is present in context',
    category: 'Validation',
  },
  {
    value: 'dao_ai.middleware.create_custom_field_validation_middleware',
    label: 'Custom Field Validation',
    description: 'Validate custom required fields',
    category: 'Validation',
  },
  {
    value: 'dao_ai.middleware.create_filter_last_human_message_middleware',
    label: 'Filter Last Human Message',
    description: 'Keep only the last human message',
    category: 'Validation',
  },
  {
    value: 'dao_ai.middleware.create_summarization_middleware',
    label: 'Summarization',
    description: 'Summarize chat history when limits exceeded',
    category: 'Processing',
  },
  {
    value: 'dao_ai.middleware.create_human_in_the_loop_middleware',
    label: 'Human-in-the-Loop',
    description: 'Require human approval for tool execution',
    category: 'Human Approval',
  },
  {
    value: 'dao_ai.middleware.create_assert_middleware',
    label: 'Assert (DSPy)',
    description: 'Assert constraints with retry on failure',
    category: 'Assertions',
  },
  {
    value: 'dao_ai.middleware.create_suggest_middleware',
    label: 'Suggest (DSPy)',
    description: 'Provide suggestions when constraints fail',
    category: 'Assertions',
  },
  {
    value: 'dao_ai.middleware.create_refine_middleware',
    label: 'Refine (DSPy)',
    description: 'Iteratively refine outputs to meet constraints',
    category: 'Assertions',
  },
  {
    value: 'dao_ai.middleware.create_tool_call_limit_middleware',
    label: 'Tool Call Limit',
    description: 'Limit tool calls per thread or run',
    category: 'Limits',
  },
  {
    value: 'dao_ai.middleware.create_model_call_limit_middleware',
    label: 'Model Call Limit',
    description: 'Limit LLM API calls per thread or run',
    category: 'Limits',
  },
  {
    value: 'dao_ai.middleware.create_tool_retry_middleware',
    label: 'Tool Retry',
    description: 'Retry failed tool calls with exponential backoff',
    category: 'Retry',
  },
  {
    value: 'dao_ai.middleware.create_model_retry_middleware',
    label: 'Model Retry',
    description: 'Retry failed model calls with exponential backoff',
    category: 'Retry',
  },
  {
    value: 'dao_ai.middleware.create_context_editing_middleware',
    label: 'Context Editing',
    description: 'Clear older tool outputs when token limits reached',
    category: 'Processing',
  },
  {
    value: 'dao_ai.middleware.create_pii_middleware',
    label: 'PII Protection',
    description: 'Detect and handle personally identifiable information',
    category: 'Privacy',
  },
  {
    value: 'custom',
    label: 'Custom Factory...',
    description: 'Custom middleware factory function',
    category: 'Custom',
  },
];

// Group middleware by category
const MIDDLEWARE_CATEGORIES = Array.from(
  new Set(PRECONFIGURED_MIDDLEWARE.map(m => m.category))
);

interface CustomFieldEntry {
  id: string;
  name: string;
  description: string;
  required: boolean;
  exampleValue: string;
}

interface InterruptToolEntry {
  id: string;
  toolName: string;
  reviewPrompt: string;
  allowedDecisions: string[]; // approve, edit, reject
}

// Entry for tool selection with choice between configured tools or manual input
interface ToolSelectionEntry {
  id: string;
  isManual: boolean;
  toolRef: string;   // Key reference to configured tool
  toolName: string;  // Manual tool name string
}

/**
 * Parse a tool reference from middleware args.
 * Handles multiple formats:
 * 1. String with __REF__ prefix (internal reference)
 * 2. String with * prefix (imported YAML reference - not usually seen after parsing)
 * 3. Plain string (tool name)
 * 4. Object (resolved YAML alias - the full ToolModel)
 */
function parseToolReference(
  toolArg: any, 
  configuredTools: Record<string, any>,
  id: string = 'tool_0'
): ToolSelectionEntry {
  // Case 1: String with __REF__ prefix (internal)
  if (typeof toolArg === 'string' && toolArg.startsWith('__REF__')) {
    const refName = toolArg.substring(7);
    return {
      id,
      isManual: false,
      toolRef: refName,
      toolName: '',
    };
  }
  
  // Case 2: String with * prefix (rarely seen after YAML parsing, but handle it)
  if (typeof toolArg === 'string' && toolArg.startsWith('*')) {
    const refName = toolArg.substring(1);
    return {
      id,
      isManual: false,
      toolRef: refName,
      toolName: '',
    };
  }
  
  // Case 3: Plain string (tool name)
  if (typeof toolArg === 'string') {
    // Check if this string matches a configured tool key
    if (configuredTools[toolArg]) {
      return {
        id,
        isManual: false,
        toolRef: toolArg,
        toolName: '',
      };
    }
    // Check if this string matches a configured tool's name field
    const matchedEntry = Object.entries(configuredTools).find(
      ([, tool]) => tool?.name === toolArg
    );
    if (matchedEntry) {
      return {
        id,
        isManual: false,
        toolRef: matchedEntry[0],
        toolName: '',
      };
    }
    // Manual tool name
    return {
      id,
      isManual: true,
      toolRef: '',
      toolName: toolArg,
    };
  }
  
  // Case 4: Object (resolved YAML alias - this is a ToolModel)
  if (typeof toolArg === 'object' && toolArg !== null) {
    // Try to find which configured tool key matches this object
    const toolName = toolArg.name;
    
    // First, try exact object match
    const exactMatch = Object.entries(configuredTools).find(
      ([, tool]) => JSON.stringify(tool) === JSON.stringify(toolArg)
    );
    if (exactMatch) {
      return {
        id,
        isManual: false,
        toolRef: exactMatch[0],
        toolName: '',
      };
    }
    
    // Next, try matching by tool name
    if (toolName) {
      const nameMatch = Object.entries(configuredTools).find(
        ([, tool]) => tool?.name === toolName
      );
      if (nameMatch) {
        return {
          id,
          isManual: false,
          toolRef: nameMatch[0],
          toolName: '',
        };
      }
      // Fall back to using the tool name as manual entry
      return {
        id,
        isManual: true,
        toolRef: '',
        toolName: toolName,
      };
    }
  }
  
  // Fallback: treat as manual with string representation
  return {
    id,
    isManual: true,
    toolRef: '',
    toolName: String(toolArg),
  };
}

interface MiddlewareFormData {
  refName: string;
  selectedFactory: string;
  customFactory: string;
  
  // Guardrail parameters
  guardrailName: string;
  guardrailModel: string; // LLM ref key
  guardrailPrompt: string;
  guardrailRetries: number;
  
  // Content filter parameters
  bannedKeywords: string[]; // Array of keywords
  blockMessage: string;
  
  // Safety guardrail parameters
  safetyModel: string; // Optional LLM ref key
  
  // Custom field validation parameters
  customFields: CustomFieldEntry[];
  
  // Summarization parameters
  summaryModel: string; // LLM ref key
  summaryMaxTokens: number;
  summaryMaxTokensBefore: number;
  summaryMaxMessagesBefore: number;
  summaryUsesTokens: boolean; // true = tokens, false = messages
  
  // HITL parameters
  hitlInterruptTools: InterruptToolEntry[];
  
  // Assert/Suggest/Refine common params
  assertConstraint: string; // Python reference
  assertMaxRetries: number;
  assertOnFailure: 'error' | 'warn' | 'ignore';
  assertFallbackMessage: string;
  assertMiddlewareName: string;
  
  suggestConstraint: string;
  suggestMaxRetries: number;
  suggestModel: string; // Optional LLM ref
  suggestMiddlewareName: string;
  
  refineConstraint: string;
  refineMaxIterations: number;
  refineModel: string; // Optional LLM ref
  refineMiddlewareName: string;
  
  // Tool Call Limit parameters
  toolCallLimitTool: string; // Tool ref key, empty = global limit
  toolCallLimitThreadLimit: number | null;
  toolCallLimitRunLimit: number | null;
  toolCallLimitExitBehavior: 'continue' | 'error' | 'end';
  
  // Model Call Limit parameters
  modelCallLimitThreadLimit: number | null;
  modelCallLimitRunLimit: number | null;
  modelCallLimitExitBehavior: 'error' | 'end';
  
  // Tool Retry parameters
  toolRetryMaxRetries: number;
  toolRetryBackoffFactor: number;
  toolRetryInitialDelay: number;
  toolRetryMaxDelay: number | null;
  toolRetryJitter: boolean;
  toolRetryTools: string[]; // Array of tool ref keys
  toolRetryOnFailure: 'continue' | 'error';
  
  // Model Retry parameters
  modelRetryMaxRetries: number;
  modelRetryBackoffFactor: number;
  modelRetryInitialDelay: number;
  modelRetryMaxDelay: number | null;
  modelRetryJitter: boolean;
  modelRetryOnFailure: 'continue' | 'error';
  
  // Context Editing parameters
  contextEditingTrigger: number;
  contextEditingKeep: number;
  contextEditingClearAtLeast: number;
  contextEditingClearToolInputs: boolean;
  contextEditingExcludeTools: string[]; // Array of tool ref keys
  contextEditingPlaceholder: string;
  contextEditingTokenCountMethod: 'approximate' | 'model';
  
  // PII Middleware parameters
  piiType: string;
  piiStrategy: 'redact' | 'mask' | 'hash' | 'block';
  piiApplyToInput: boolean;
  piiApplyToOutput: boolean;
  piiApplyToToolResults: boolean;
  
  // Generic args (only for custom)
  genericArgs: Record<string, any>;
}

const defaultFormData: MiddlewareFormData = {
  refName: '',
  selectedFactory: '',
  customFactory: '',
  guardrailName: '',
  guardrailModel: '',
  guardrailPrompt: '',
  guardrailRetries: 3,
  bannedKeywords: [],
  blockMessage: 'I cannot provide that response. Please rephrase your request.',
  safetyModel: '',
  customFields: [],
  summaryModel: '',
  summaryMaxTokens: 2048,
  summaryMaxTokensBefore: 20480,
  summaryMaxMessagesBefore: 10,
  summaryUsesTokens: true,
  hitlInterruptTools: [],
  assertConstraint: '',
  assertMaxRetries: 3,
  assertOnFailure: 'error',
  assertFallbackMessage: 'Unable to generate a valid response.',
  assertMiddlewareName: '',
  suggestConstraint: '',
  suggestMaxRetries: 3,
  suggestModel: '',
  suggestMiddlewareName: '',
  refineConstraint: '',
  refineMaxIterations: 3,
  refineModel: '',
  refineMiddlewareName: '',
  
  // Tool Call Limit defaults
  toolCallLimitTool: '', // Empty = global limit
  toolCallLimitThreadLimit: null,
  toolCallLimitRunLimit: 10,
  toolCallLimitExitBehavior: 'continue',
  
  // Model Call Limit defaults
  modelCallLimitThreadLimit: null,
  modelCallLimitRunLimit: 50,
  modelCallLimitExitBehavior: 'end',
  
  // Tool Retry defaults
  toolRetryMaxRetries: 3,
  toolRetryBackoffFactor: 2.0,
  toolRetryInitialDelay: 1.0,
  toolRetryMaxDelay: null,
  toolRetryJitter: false,
  toolRetryTools: [] as string[],
  toolRetryOnFailure: 'continue',
  
  // Model Retry defaults
  modelRetryMaxRetries: 3,
  modelRetryBackoffFactor: 2.0,
  modelRetryInitialDelay: 1.0,
  modelRetryMaxDelay: null,
  modelRetryJitter: false,
  modelRetryOnFailure: 'continue',
  
  // Context Editing defaults
  contextEditingTrigger: 100000,
  contextEditingKeep: 3,
  contextEditingClearAtLeast: 0,
  contextEditingClearToolInputs: false,
  contextEditingExcludeTools: [] as string[],
  contextEditingPlaceholder: '[cleared]',
  contextEditingTokenCountMethod: 'approximate',
  
  // PII defaults
  piiType: 'email',
  piiStrategy: 'redact',
  piiApplyToInput: true,
  piiApplyToOutput: false,
  piiApplyToToolResults: false,
  
  genericArgs: {},
};

export default function MiddlewareSection() {
  const { config, addMiddleware, removeMiddleware, updateMiddleware } = useConfigStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMiddleware, setEditingMiddleware] = useState<string | null>(null);
  const [expandedMiddleware, setExpandedMiddleware] = useState<string | null>(null);
  const [formData, setFormData] = useState<MiddlewareFormData>(defaultFormData);

  const middleware = config.middleware || {};
  const llms = config.resources?.llms || {};
  const llmOptions = [
    { value: '', label: 'Select LLM...' },
    ...Object.keys(llms).map(key => ({ value: key, label: key })),
  ];
  
  // Tools for middleware that reference tools
  const tools = config.tools || {};

  const handleAdd = () => {
    setEditingMiddleware(null);
    setFormData(defaultFormData);
    setIsModalOpen(true);
  };

  const parseMiddlewareArgs = (mw: MiddlewareModel, configuredTools: Record<string, any>): Partial<MiddlewareFormData> => {
    const parsed: Partial<MiddlewareFormData> = {};
    const args = mw.args || {};
    
    // Guardrail middleware
    if (mw.name === 'dao_ai.middleware.create_guardrail_middleware') {
      parsed.guardrailName = args.name || '';
      parsed.guardrailModel = typeof args.model === 'string' && args.model.startsWith('*') 
        ? args.model.substring(1) 
        : '';
      parsed.guardrailPrompt = args.prompt || '';
      parsed.guardrailRetries = args.num_retries || 3;
    }
    
    // Content filter
    if (mw.name === 'dao_ai.middleware.create_content_filter_middleware') {
      parsed.bannedKeywords = Array.isArray(args.banned_keywords) ? args.banned_keywords : [];
      parsed.blockMessage = args.block_message || defaultFormData.blockMessage;
    }
    
    // Safety guardrail
    if (mw.name === 'dao_ai.middleware.create_safety_guardrail_middleware') {
      parsed.safetyModel = typeof args.safety_model === 'string' && args.safety_model.startsWith('*')
        ? args.safety_model.substring(1)
        : '';
    }
    
    // Custom field validation
    if (mw.name === 'dao_ai.middleware.create_custom_field_validation_middleware') {
      parsed.customFields = Array.isArray(args.fields) 
        ? args.fields.map((f: any, idx: number) => ({
            id: `field_${idx}`,
            name: f.name || '',
            description: f.description || '',
            required: f.required !== false,
            exampleValue: f.example_value || '',
          }))
        : [];
    }
    
    // Summarization
    if (mw.name === 'dao_ai.middleware.create_summarization_middleware') {
      const chatHistory = args.chat_history || {};
      const model = chatHistory.model || '';
      parsed.summaryModel = typeof model === 'string' && model.startsWith('*') 
        ? model.substring(1) 
        : '';
      parsed.summaryMaxTokens = chatHistory.max_tokens || 2048;
      parsed.summaryUsesTokens = !!chatHistory.max_tokens_before_summary;
      parsed.summaryMaxTokensBefore = chatHistory.max_tokens_before_summary || 20480;
      parsed.summaryMaxMessagesBefore = chatHistory.max_messages_before_summary || 10;
    }
    
    // HITL
    if (mw.name === 'dao_ai.middleware.create_human_in_the_loop_middleware') {
      const interruptOn = args.interrupt_on || {};
      parsed.hitlInterruptTools = Object.entries(interruptOn).map(([toolName, config]: [string, any], idx) => ({
        id: `tool_${idx}`,
        toolName,
        reviewPrompt: config.review_prompt || '',
        allowedDecisions: config.allowed_decisions || ['approve', 'edit', 'reject'],
      }));
    }
    
    // Assert
    if (mw.name === 'dao_ai.middleware.create_assert_middleware') {
      parsed.assertConstraint = args.constraint || '';
      parsed.assertMaxRetries = args.max_retries || 3;
      parsed.assertOnFailure = args.on_failure || 'error';
      parsed.assertFallbackMessage = args.fallback_message || defaultFormData.assertFallbackMessage;
      parsed.assertMiddlewareName = args.name || '';
    }
    
    // Suggest
    if (mw.name === 'dao_ai.middleware.create_suggest_middleware') {
      parsed.suggestConstraint = args.constraint || '';
      parsed.suggestMaxRetries = args.max_retries || 3;
      parsed.suggestModel = typeof args.suggestion_model === 'string' && args.suggestion_model.startsWith('*')
        ? args.suggestion_model.substring(1)
        : '';
      parsed.suggestMiddlewareName = args.name || '';
    }
    
    // Refine
    if (mw.name === 'dao_ai.middleware.create_refine_middleware') {
      parsed.refineConstraint = args.constraint || '';
      parsed.refineMaxIterations = args.max_iterations || 3;
      parsed.refineModel = typeof args.refine_model === 'string' && args.refine_model.startsWith('*')
        ? args.refine_model.substring(1)
        : '';
      parsed.refineMiddlewareName = args.name || '';
    }
    
    // Tool Call Limit
    if (mw.name === 'dao_ai.middleware.create_tool_call_limit_middleware') {
      if (args.tool) {
        const toolEntry = parseToolReference(args.tool, configuredTools);
        // Use toolRef if found, otherwise empty (global)
        parsed.toolCallLimitTool = toolEntry.toolRef || '';
      } else {
        parsed.toolCallLimitTool = '';
      }
      parsed.toolCallLimitThreadLimit = args.thread_limit ?? null;
      parsed.toolCallLimitRunLimit = args.run_limit ?? null;
      parsed.toolCallLimitExitBehavior = args.exit_behavior || 'continue';
    }
    
    // Model Call Limit
    if (mw.name === 'dao_ai.middleware.create_model_call_limit_middleware') {
      parsed.modelCallLimitThreadLimit = args.thread_limit ?? null;
      parsed.modelCallLimitRunLimit = args.run_limit ?? null;
      parsed.modelCallLimitExitBehavior = args.exit_behavior || 'end';
    }
    
    // Tool Retry
    if (mw.name === 'dao_ai.middleware.create_tool_retry_middleware') {
      parsed.toolRetryMaxRetries = args.max_retries || 3;
      parsed.toolRetryBackoffFactor = args.backoff_factor || 2.0;
      parsed.toolRetryInitialDelay = args.initial_delay || 1.0;
      parsed.toolRetryMaxDelay = args.max_delay ?? null;
      parsed.toolRetryJitter = args.jitter || false;
      parsed.toolRetryOnFailure = args.on_failure || 'continue';
      if (Array.isArray(args.tools)) {
        // Parse each tool reference and extract the toolRef key
        parsed.toolRetryTools = args.tools
          .map((t: any) => parseToolReference(t, configuredTools).toolRef)
          .filter(Boolean);
      } else {
        parsed.toolRetryTools = [];
      }
    }
    
    // Model Retry
    if (mw.name === 'dao_ai.middleware.create_model_retry_middleware') {
      parsed.modelRetryMaxRetries = args.max_retries || 3;
      parsed.modelRetryBackoffFactor = args.backoff_factor || 2.0;
      parsed.modelRetryInitialDelay = args.initial_delay || 1.0;
      parsed.modelRetryMaxDelay = args.max_delay ?? null;
      parsed.modelRetryJitter = args.jitter || false;
      parsed.modelRetryOnFailure = args.on_failure || 'continue';
    }
    
    // Context Editing
    if (mw.name === 'dao_ai.middleware.create_context_editing_middleware') {
      parsed.contextEditingTrigger = args.trigger || 100000;
      parsed.contextEditingKeep = args.keep || 3;
      parsed.contextEditingClearAtLeast = args.clear_at_least || 0;
      parsed.contextEditingClearToolInputs = args.clear_tool_inputs || false;
      parsed.contextEditingPlaceholder = args.placeholder || '[cleared]';
      parsed.contextEditingTokenCountMethod = args.token_count_method || 'approximate';
      if (Array.isArray(args.exclude_tools)) {
        // Parse each tool reference and extract the toolRef key
        parsed.contextEditingExcludeTools = args.exclude_tools
          .map((t: any) => parseToolReference(t, configuredTools).toolRef)
          .filter(Boolean);
      } else {
        parsed.contextEditingExcludeTools = [];
      }
    }
    
    // PII Middleware
    if (mw.name === 'dao_ai.middleware.create_pii_middleware') {
      parsed.piiType = args.pii_type || 'email';
      parsed.piiStrategy = args.strategy || 'redact';
      parsed.piiApplyToInput = args.apply_to_input !== false;
      parsed.piiApplyToOutput = args.apply_to_output || false;
      parsed.piiApplyToToolResults = args.apply_to_tool_results || false;
    }
    
    // Custom - generic args
    if (mw.name === 'custom' || !PRECONFIGURED_MIDDLEWARE.find(pm => pm.value === mw.name)) {
      parsed.genericArgs = args;
    }
    
    return parsed;
  };

  const handleEdit = (key: string) => {
    const mw = middleware[key];
    setEditingMiddleware(key);
    
    const preconfigured = PRECONFIGURED_MIDDLEWARE.find(pm => pm.value === mw.name && pm.value !== 'custom');
    const parsedArgs = parseMiddlewareArgs(mw, tools);
    
    setFormData({
      ...defaultFormData,
      ...parsedArgs,
      refName: key,
      selectedFactory: preconfigured ? mw.name : 'custom',
      customFactory: preconfigured ? '' : mw.name,
    });
    setIsModalOpen(true);
  };

  const buildMiddlewareArgs = (): Record<string, any> | undefined => {
    const factory = formData.selectedFactory;
    
    if (factory === 'dao_ai.middleware.create_guardrail_middleware') {
      return {
        name: formData.guardrailName,
        model: formData.guardrailModel ? `*${formData.guardrailModel}` : undefined,
        prompt: formData.guardrailPrompt,
        num_retries: formData.guardrailRetries,
      };
    }
    
    if (factory === 'dao_ai.middleware.create_content_filter_middleware') {
      return {
        banned_keywords: formData.bannedKeywords,
        block_message: formData.blockMessage,
      };
    }
    
    if (factory === 'dao_ai.middleware.create_safety_guardrail_middleware') {
      return formData.safetyModel ? { safety_model: `*${formData.safetyModel}` } : undefined;
    }
    
    if (factory === 'dao_ai.middleware.create_user_id_validation_middleware') {
      return undefined; // No args
    }
    
    if (factory === 'dao_ai.middleware.create_thread_id_validation_middleware') {
      return undefined; // No args
    }
    
    if (factory === 'dao_ai.middleware.create_custom_field_validation_middleware') {
      return {
        fields: formData.customFields.map(f => ({
          name: f.name,
          ...(f.description && { description: f.description }),
          required: f.required,
          ...(f.exampleValue && { example_value: f.exampleValue }),
        })),
      };
    }
    
    if (factory === 'dao_ai.middleware.create_filter_last_human_message_middleware') {
      return undefined; // No args
    }
    
    if (factory === 'dao_ai.middleware.create_summarization_middleware') {
      const chatHistory: any = {
        model: formData.summaryModel ? `*${formData.summaryModel}` : undefined,
        max_tokens: formData.summaryMaxTokens,
      };
      
      if (formData.summaryUsesTokens) {
        chatHistory.max_tokens_before_summary = formData.summaryMaxTokensBefore;
      } else {
        chatHistory.max_messages_before_summary = formData.summaryMaxMessagesBefore;
      }
      
      return { chat_history: chatHistory };
    }
    
    if (factory === 'dao_ai.middleware.create_human_in_the_loop_middleware') {
      const interruptOn: Record<string, any> = {};
      formData.hitlInterruptTools.forEach(tool => {
        interruptOn[tool.toolName] = {
          ...(tool.reviewPrompt && { review_prompt: tool.reviewPrompt }),
          allowed_decisions: tool.allowedDecisions,
        };
      });
      
      return {
        interrupt_on: interruptOn,
      };
    }
    
    if (factory === 'dao_ai.middleware.create_assert_middleware') {
      return {
        constraint: formData.assertConstraint,
        max_retries: formData.assertMaxRetries,
        on_failure: formData.assertOnFailure,
        fallback_message: formData.assertFallbackMessage,
        ...(formData.assertMiddlewareName && { name: formData.assertMiddlewareName }),
      };
    }
    
    if (factory === 'dao_ai.middleware.create_suggest_middleware') {
      return {
        constraint: formData.suggestConstraint,
        max_retries: formData.suggestMaxRetries,
        ...(formData.suggestModel && { suggestion_model: `*${formData.suggestModel}` }),
        ...(formData.suggestMiddlewareName && { name: formData.suggestMiddlewareName }),
      };
    }
    
    if (factory === 'dao_ai.middleware.create_refine_middleware') {
      return {
        constraint: formData.refineConstraint,
        max_iterations: formData.refineMaxIterations,
        ...(formData.refineModel && { refine_model: `*${formData.refineModel}` }),
        ...(formData.refineMiddlewareName && { name: formData.refineMiddlewareName }),
      };
    }
    
    // Tool Call Limit
    if (factory === 'dao_ai.middleware.create_tool_call_limit_middleware') {
      const result: Record<string, any> = {};
      
      // If a tool is selected, add it as a reference
      if (formData.toolCallLimitTool) {
        result.tool = `__REF__${formData.toolCallLimitTool}`;
      }
      
      if (formData.toolCallLimitThreadLimit !== null) {
        result.thread_limit = formData.toolCallLimitThreadLimit;
      }
      if (formData.toolCallLimitRunLimit !== null) {
        result.run_limit = formData.toolCallLimitRunLimit;
      }
      result.exit_behavior = formData.toolCallLimitExitBehavior;
      
      return Object.keys(result).length > 0 ? result : undefined;
    }
    
    // Model Call Limit
    if (factory === 'dao_ai.middleware.create_model_call_limit_middleware') {
      const result: Record<string, any> = {};
      
      if (formData.modelCallLimitThreadLimit !== null) {
        result.thread_limit = formData.modelCallLimitThreadLimit;
      }
      if (formData.modelCallLimitRunLimit !== null) {
        result.run_limit = formData.modelCallLimitRunLimit;
      }
      result.exit_behavior = formData.modelCallLimitExitBehavior;
      
      return Object.keys(result).length > 0 ? result : undefined;
    }
    
    // Tool Retry
    if (factory === 'dao_ai.middleware.create_tool_retry_middleware') {
      const result: Record<string, any> = {
        max_retries: formData.toolRetryMaxRetries,
        backoff_factor: formData.toolRetryBackoffFactor,
        initial_delay: formData.toolRetryInitialDelay,
        jitter: formData.toolRetryJitter,
        on_failure: formData.toolRetryOnFailure,
      };
      
      if (formData.toolRetryMaxDelay !== null) {
        result.max_delay = formData.toolRetryMaxDelay;
      }
      
      // Add tools as references
      if (formData.toolRetryTools.length > 0) {
        result.tools = formData.toolRetryTools.map(toolRef => `__REF__${toolRef}`);
      }
      
      return result;
    }
    
    // Model Retry
    if (factory === 'dao_ai.middleware.create_model_retry_middleware') {
      const result: Record<string, any> = {
        max_retries: formData.modelRetryMaxRetries,
        backoff_factor: formData.modelRetryBackoffFactor,
        initial_delay: formData.modelRetryInitialDelay,
        jitter: formData.modelRetryJitter,
        on_failure: formData.modelRetryOnFailure,
      };
      
      if (formData.modelRetryMaxDelay !== null) {
        result.max_delay = formData.modelRetryMaxDelay;
      }
      
      return result;
    }
    
    // Context Editing
    if (factory === 'dao_ai.middleware.create_context_editing_middleware') {
      const result: Record<string, any> = {
        trigger: formData.contextEditingTrigger,
        keep: formData.contextEditingKeep,
        clear_at_least: formData.contextEditingClearAtLeast,
        clear_tool_inputs: formData.contextEditingClearToolInputs,
        placeholder: formData.contextEditingPlaceholder,
        token_count_method: formData.contextEditingTokenCountMethod,
      };
      
      // Add excluded tools as references
      if (formData.contextEditingExcludeTools.length > 0) {
        result.exclude_tools = formData.contextEditingExcludeTools.map(toolRef => `__REF__${toolRef}`);
      }
      
      return result;
    }
    
    // PII Middleware
    if (factory === 'dao_ai.middleware.create_pii_middleware') {
      return {
        pii_type: formData.piiType,
        strategy: formData.piiStrategy,
        apply_to_input: formData.piiApplyToInput,
        apply_to_output: formData.piiApplyToOutput,
        apply_to_tool_results: formData.piiApplyToToolResults,
      };
    }
    
    // Custom - generic args
    return Object.keys(formData.genericArgs).length > 0 ? formData.genericArgs : undefined;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.refName) return;
    
    const factoryName = formData.selectedFactory === 'custom' 
      ? formData.customFactory 
      : formData.selectedFactory;
    
    if (!factoryName) return;

    const args = buildMiddlewareArgs();
    const middlewareData: MiddlewareModel = {
      name: factoryName,
      ...(args && { args }),
    };

    if (editingMiddleware && editingMiddleware !== formData.refName) {
      removeMiddleware(editingMiddleware);
      addMiddleware(formData.refName, middlewareData);
    } else if (editingMiddleware) {
      updateMiddleware(formData.refName, middlewareData);
    } else {
      addMiddleware(formData.refName, middlewareData);
    }
    
    setIsModalOpen(false);
  };

  const toggleExpanded = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedMiddleware(expandedMiddleware === key ? null : key);
  };

  const getMiddlewareInfo = (name: string) => {
    return PRECONFIGURED_MIDDLEWARE.find(pm => pm.value === name);
  };

  const getReferences = (_key: string): string[] => {
    // TODO: Implement proper reference tracking for middleware
    // For now, return empty array since safeDelete handles validation
    return [];
  };

  const selectedMiddlewareInfo = PRECONFIGURED_MIDDLEWARE.find(
    m => m.value === formData.selectedFactory
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Middleware</h2>
          <p className="text-slate-400 mt-1">
            Configure reusable middleware to customize agent behavior
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4" />
          Add Middleware
        </Button>
      </div>

      {/* Middleware List */}
      {Object.keys(middleware).length === 0 ? (
        <Card className="text-center py-12">
          <Layers className="w-12 h-12 mx-auto text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-slate-300 mb-2">No middleware configured</h3>
          <p className="text-slate-500 mb-4">
            Middleware allows you to customize agent behavior at different stages of execution.
          </p>
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4" />
            Add Your First Middleware
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Render middleware by known categories */}
          {MIDDLEWARE_CATEGORIES.map(category => {
            // Filter middleware by category
            const categoryMiddleware = Object.entries(middleware).filter(([, mw]) => {
              const info = getMiddlewareInfo(mw.name);
              return info?.category === category;
            });
            
            if (categoryMiddleware.length === 0) return null;
            
            return (
              <div key={category}>
                <div className="flex items-center space-x-3 mb-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                    {category}
                  </h3>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
                </div>
                
                <div className="space-y-2">
                  {categoryMiddleware.map(([key, mw]) => {
                    const info = getMiddlewareInfo(mw.name);
                    const refs = getReferences(key);
                    const isExpanded = expandedMiddleware === key;
                    
                    return (
                      <div
                        key={key}
                        className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 cursor-pointer hover:bg-slate-800/70 transition-colors"
                        onClick={() => handleEdit(key)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-start space-x-3 flex-1 min-w-0">
                            <Layers className="w-4 h-4 text-purple-400 flex-shrink-0 mt-1" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 flex-wrap">
                                <p className="font-medium text-slate-200 truncate">{key}</p>
                                {refs.length > 0 && (
                                  <Badge variant="warning">
                                    {refs.length} ref{refs.length !== 1 ? 's' : ''}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 truncate">
                                {info?.label || 'Custom Factory'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                            {mw.args && Object.keys(mw.args).length > 0 && (
                              <button
                                onClick={(e) => toggleExpanded(key, e)}
                                className="p-1.5 text-slate-400 hover:text-slate-300 transition-colors"
                                title={isExpanded ? "Collapse" : "Expand"}
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                handleEdit(key);
                              }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                safeDelete('Middleware', key, () => removeMiddleware(key));
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </Button>
                          </div>
                        </div>
                        
                        {isExpanded && mw.args && Object.keys(mw.args).length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-700">
                            <p className="text-xs font-medium text-slate-400 mb-2">Parameters:</p>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {Object.entries(mw.args).map(([argKey, argValue]) => (
                                <div key={argKey} className="flex items-start space-x-2 text-xs">
                                  <span className="text-slate-500 font-mono">{argKey}:</span>
                                  <span className="text-slate-300 font-mono flex-1 break-all">
                                    {typeof argValue === 'object' ? JSON.stringify(argValue) : String(argValue)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          
          {/* Render middleware that don't match any known category (custom/other) */}
          {(() => {
            const uncategorizedMiddleware = Object.entries(middleware).filter(([, mw]) => {
              const info = getMiddlewareInfo(mw.name);
              return !info || !info.category;
            });
            
            if (uncategorizedMiddleware.length === 0) return null;
            
            return (
              <div>
                <div className="flex items-center space-x-3 mb-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                    Other
                  </h3>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
                </div>
                
                <div className="space-y-2">
                  {uncategorizedMiddleware.map(([key, mw]) => {
                    const refs = getReferences(key);
                    const isExpanded = expandedMiddleware === key;
                    
                    // Extract a friendly label from the factory name
                    const factoryLabel = mw.name.split('.').pop()?.replace(/^create_/, '').replace(/_/g, ' ').replace(/middleware$/i, '').trim() || 'Custom Factory';
                    const displayLabel = factoryLabel.charAt(0).toUpperCase() + factoryLabel.slice(1);
                    
                    return (
                      <div
                        key={key}
                        className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 cursor-pointer hover:bg-slate-800/70 transition-colors"
                        onClick={() => handleEdit(key)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-start space-x-3 flex-1 min-w-0">
                            <Layers className="w-4 h-4 text-orange-400 flex-shrink-0 mt-1" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 flex-wrap">
                                <p className="font-medium text-slate-200 truncate">{key}</p>
                                <Badge variant="info">Custom</Badge>
                                {refs.length > 0 && (
                                  <Badge variant="warning">
                                    {refs.length} ref{refs.length !== 1 ? 's' : ''}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 truncate">
                                {displayLabel}
                              </p>
                              <p className="text-xs text-slate-600 truncate font-mono">
                                {mw.name}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                            {mw.args && Object.keys(mw.args).length > 0 && (
                              <button
                                onClick={(e) => toggleExpanded(key, e)}
                                className="p-1.5 text-slate-400 hover:text-slate-300 transition-colors"
                                title={isExpanded ? "Collapse" : "Expand"}
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                handleEdit(key);
                              }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                safeDelete('Middleware', key, () => removeMiddleware(key));
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </Button>
                          </div>
                        </div>
                        
                        {isExpanded && mw.args && Object.keys(mw.args).length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-700">
                            <p className="text-xs font-medium text-slate-400 mb-2">Parameters:</p>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {Object.entries(mw.args).map(([argKey, argValue]) => (
                                <div key={argKey} className="flex items-start space-x-2 text-xs">
                                  <span className="text-slate-500 font-mono">{argKey}:</span>
                                  <span className="text-slate-300 font-mono flex-1 break-all">
                                    {typeof argValue === 'object' ? JSON.stringify(argValue) : String(argValue)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Add/Edit Middleware Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMiddleware ? 'Edit Middleware' : 'Add Middleware'}
        description="Configure middleware to customize agent execution behavior"
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Reference Name"
            placeholder="e.g., my_guardrail_middleware"
            value={formData.refName}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setFormData({ ...formData, refName: normalizeRefNameWhileTyping(e.target.value) });
            }}
            hint="Unique identifier for this middleware (used in YAML anchors)"
            required
          />

          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-300">Middleware Type</label>
            
            {MIDDLEWARE_CATEGORIES.map(category => {
              const categoryMiddleware = PRECONFIGURED_MIDDLEWARE.filter(m => m.category === category);
              return (
                <div key={category} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="h-px flex-1 bg-gradient-to-r from-slate-700 to-transparent"></div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">
                      {category}
                    </h4>
                    <div className="h-px flex-1 bg-gradient-to-l from-slate-700 to-transparent"></div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {categoryMiddleware.map((mw) => (
                      <button
                        key={mw.value}
                        type="button"
                        onClick={() => {
                          // Generate default reference name if not editing existing middleware
                          const newRefName = editingMiddleware 
                            ? formData.refName 
                            : generateDefaultRefName(mw.value);
                          setFormData({ 
                            ...defaultFormData,
                            refName: newRefName,
                            selectedFactory: mw.value,
                          });
                        }}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          formData.selectedFactory === mw.value
                            ? 'bg-purple-500/20 border-purple-500/50 ring-1 ring-purple-500/30'
                            : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-white truncate">{mw.label}</p>
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{mw.description}</p>
                          </div>
                          {formData.selectedFactory === mw.value && (
                            <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {formData.selectedFactory === 'custom' && (
            <Input
              label="Custom Factory Function"
              placeholder="e.g., my_module.create_custom_middleware"
              value={formData.customFactory}
              onChange={(e: ChangeEvent<HTMLInputElement>) => 
                setFormData({ ...formData, customFactory: e.target.value })
              }
              hint="Fully qualified name of the factory function"
              required
            />
          )}

          {/* Parameter forms for each middleware type */}
          {selectedMiddlewareInfo && formData.selectedFactory !== 'custom' && (
            <div className="space-y-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
              <h3 className="text-sm font-medium text-slate-300">Parameters</h3>
              
              {/* Guardrail Middleware */}
              {formData.selectedFactory === 'dao_ai.middleware.create_guardrail_middleware' && (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Guardrail Name"
                    value={formData.guardrailName}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => 
                      setFormData({ ...formData, guardrailName: e.target.value })
                    }
                    placeholder="e.g., tone_check"
                    required
                    hint="Name identifying this guardrail"
                  />
                  <Select
                    label="Model"
                    options={llmOptions}
                    value={formData.guardrailModel}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => 
                      setFormData({ ...formData, guardrailModel: e.target.value })
                    }
                    required
                    hint="LLM to use for evaluation"
                  />
                  <div className="col-span-2">
                    <Textarea
                      label="Evaluation Prompt"
                      value={formData.guardrailPrompt}
                      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => 
                        setFormData({ ...formData, guardrailPrompt: e.target.value })
                      }
                      placeholder="e.g., Evaluate if the response is professional and helpful."
                      rows={3}
                      required
                      hint="Criteria for evaluating responses"
                    />
                  </div>
                  <Input
                    label="Max Retries"
                    type="number"
                    value={formData.guardrailRetries}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => 
                      setFormData({ ...formData, guardrailRetries: parseInt(e.target.value) || 3 })
                    }
                    hint="Maximum retry attempts"
                  />
                </div>
              )}
              
              {/* Content Filter */}
              {formData.selectedFactory === 'dao_ai.middleware.create_content_filter_middleware' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Banned Keywords</label>
                    <div className="space-y-2">
                      {formData.bannedKeywords.map((keyword, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                          <Input
                            value={keyword}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                              const newKeywords = [...formData.bannedKeywords];
                              newKeywords[idx] = e.target.value;
                              setFormData({ ...formData, bannedKeywords: newKeywords });
                            }}
                            placeholder="e.g., password"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => {
                              const newKeywords = formData.bannedKeywords.filter((_, i) => i !== idx);
                              setFormData({ ...formData, bannedKeywords: newKeywords });
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setFormData({ ...formData, bannedKeywords: [...formData.bannedKeywords, ''] });
                        }}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Keyword
                      </Button>
                    </div>
                  </div>
                  <Input
                    label="Block Message"
                    value={formData.blockMessage}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => 
                      setFormData({ ...formData, blockMessage: e.target.value })
                    }
                    placeholder="Message to return when content is blocked"
                  />
                </div>
              )}
              
              {/* Safety Guardrail */}
              {formData.selectedFactory === 'dao_ai.middleware.create_safety_guardrail_middleware' && (
                <Select
                  label="Safety Model (Optional)"
                  options={llmOptions}
                  value={formData.safetyModel}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => 
                    setFormData({ ...formData, safetyModel: e.target.value })
                  }
                  hint="LLM for safety evaluation (optional)"
                />
              )}
              
              {/* User ID / Thread ID Validation - No params */}
              {(formData.selectedFactory === 'dao_ai.middleware.create_user_id_validation_middleware' ||
                formData.selectedFactory === 'dao_ai.middleware.create_thread_id_validation_middleware' ||
                formData.selectedFactory === 'dao_ai.middleware.create_filter_last_human_message_middleware') && (
                <p className="text-sm text-slate-400">This middleware requires no parameters.</p>
              )}
              
              {/* Custom Field Validation */}
              {formData.selectedFactory === 'dao_ai.middleware.create_custom_field_validation_middleware' && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-300">Required Fields</label>
                  {formData.customFields.map((field, idx) => (
                    <div key={field.id} className="p-3 bg-slate-900/50 rounded-lg border border-slate-700 space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="Field Name"
                          value={field.name}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            const newFields = [...formData.customFields];
                            newFields[idx] = { ...field, name: e.target.value };
                            setFormData({ ...formData, customFields: newFields });
                          }}
                          placeholder="e.g., store_num"
                          required
                        />
                        <Input
                          label="Description"
                          value={field.description}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            const newFields = [...formData.customFields];
                            newFields[idx] = { ...field, description: e.target.value };
                            setFormData({ ...formData, customFields: newFields });
                          }}
                          placeholder="e.g., Store number"
                        />
                        <Input
                          label="Example Value (Optional)"
                          value={field.exampleValue}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            const newFields = [...formData.customFields];
                            newFields[idx] = { ...field, exampleValue: e.target.value };
                            setFormData({ ...formData, customFields: newFields });
                          }}
                          placeholder="e.g., 12345"
                        />
                        <div className="flex items-center space-x-4">
                          <label className="flex items-center space-x-2 text-sm text-slate-300">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => {
                                const newFields = [...formData.customFields];
                                newFields[idx] = { ...field, required: e.target.checked };
                                setFormData({ ...formData, customFields: newFields });
                              }}
                              className="rounded border-slate-600 bg-slate-700"
                            />
                            <span>Required</span>
                          </label>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => {
                              const newFields = formData.customFields.filter(f => f.id !== field.id);
                              setFormData({ ...formData, customFields: newFields });
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const newField: CustomFieldEntry = {
                        id: `field_${Date.now()}`,
                        name: '',
                        description: '',
                        required: true,
                        exampleValue: '',
                      };
                      setFormData({ ...formData, customFields: [...formData.customFields, newField] });
                    }}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Field
                  </Button>
                </div>
              )}
              
              {/* Summarization */}
              {formData.selectedFactory === 'dao_ai.middleware.create_summarization_middleware' && (
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Summary Model"
                    options={llmOptions}
                    value={formData.summaryModel}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => 
                      setFormData({ ...formData, summaryModel: e.target.value })
                    }
                    required
                    hint="LLM for chat history summarization"
                  />
                  <Input
                    label="Max Summary Tokens"
                    type="number"
                    value={formData.summaryMaxTokens}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => 
                      setFormData({ ...formData, summaryMaxTokens: parseInt(e.target.value) || 2048 })
                    }
                    hint="Max tokens for the summary"
                  />
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2">Trigger Threshold</label>
                    <div className="flex items-center space-x-4 mb-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          checked={formData.summaryUsesTokens}
                          onChange={() => setFormData({ ...formData, summaryUsesTokens: true })}
                          className="text-purple-500"
                        />
                        <span className="text-sm text-slate-300">By Tokens</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          checked={!formData.summaryUsesTokens}
                          onChange={() => setFormData({ ...formData, summaryUsesTokens: false })}
                          className="text-purple-500"
                        />
                        <span className="text-sm text-slate-300">By Messages</span>
                      </label>
                    </div>
                    {formData.summaryUsesTokens ? (
                      <Input
                        label="Max Tokens Before Summary"
                        type="number"
                        value={formData.summaryMaxTokensBefore}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => 
                          setFormData({ ...formData, summaryMaxTokensBefore: parseInt(e.target.value) || 20480 })
                        }
                        hint="Trigger when history exceeds this token count"
                      />
                    ) : (
                      <Input
                        label="Max Messages Before Summary"
                        type="number"
                        value={formData.summaryMaxMessagesBefore}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => 
                          setFormData({ ...formData, summaryMaxMessagesBefore: parseInt(e.target.value) || 10 })
                        }
                        hint="Trigger when history exceeds this message count"
                      />
                    )}
                  </div>
                </div>
              )}
              
              {/* Human-in-the-Loop */}
              {formData.selectedFactory === 'dao_ai.middleware.create_human_in_the_loop_middleware' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Interrupt Tools</label>
                    {formData.hitlInterruptTools.map((tool, idx) => (
                      <div key={tool.id} className="p-3 mb-2 bg-slate-900/50 rounded-lg border border-slate-700 space-y-2">
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            label="Tool Name"
                            value={tool.toolName}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                              const newTools = [...formData.hitlInterruptTools];
                              newTools[idx] = { ...tool, toolName: e.target.value };
                              setFormData({ ...formData, hitlInterruptTools: newTools });
                            }}
                            placeholder="e.g., search_tool"
                            required
                          />
                          <Input
                            label="Review Prompt (Optional)"
                            value={tool.reviewPrompt}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                              const newTools = [...formData.hitlInterruptTools];
                              newTools[idx] = { ...tool, reviewPrompt: e.target.value };
                              setFormData({ ...formData, hitlInterruptTools: newTools });
                            }}
                            placeholder="e.g., Approve search?"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            {['approve', 'edit', 'reject'].map((decision) => (
                              <label key={decision} className="flex items-center space-x-2 text-sm text-slate-300">
                                <input
                                  type="checkbox"
                                  checked={tool.allowedDecisions.includes(decision)}
                                  onChange={(e) => {
                                    const newTools = [...formData.hitlInterruptTools];
                                    const decisions = e.target.checked
                                      ? [...tool.allowedDecisions, decision]
                                      : tool.allowedDecisions.filter(d => d !== decision);
                                    newTools[idx] = { ...tool, allowedDecisions: decisions };
                                    setFormData({ ...formData, hitlInterruptTools: newTools });
                                  }}
                                  className="rounded border-slate-600 bg-slate-700"
                                />
                                <span className="capitalize">{decision}</span>
                              </label>
                            ))}
                          </div>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => {
                              const newTools = formData.hitlInterruptTools.filter(t => t.id !== tool.id);
                              setFormData({ ...formData, hitlInterruptTools: newTools });
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const newTool: InterruptToolEntry = {
                          id: `tool_${Date.now()}`,
                          toolName: '',
                          reviewPrompt: '',
                          allowedDecisions: ['approve', 'edit', 'reject'],
                        };
                        setFormData({ ...formData, hitlInterruptTools: [...formData.hitlInterruptTools, newTool] });
                      }}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Tool
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Assert Middleware */}
              {formData.selectedFactory === 'dao_ai.middleware.create_assert_middleware' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Input
                      label="Constraint"
                      value={formData.assertConstraint}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => 
                        setFormData({ ...formData, assertConstraint: e.target.value })
                      }
                      placeholder="e.g., my_module.MyConstraint"
                      required
                      hint="Python reference to constraint (class or callable)"
                    />
                  </div>
                  <Input
                    label="Max Retries"
                    type="number"
                    value={formData.assertMaxRetries}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => 
                      setFormData({ ...formData, assertMaxRetries: parseInt(e.target.value) || 3 })
                    }
                  />
                  <Select
                    label="On Failure"
                    options={[
                      { value: 'error', label: 'Error' },
                      { value: 'warn', label: 'Warn' },
                      { value: 'ignore', label: 'Ignore' },
                    ]}
                    value={formData.assertOnFailure}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => 
                      setFormData({ ...formData, assertOnFailure: e.target.value as 'error' | 'warn' | 'ignore' })
                    }
                  />
                  <div className="col-span-2">
                    <Input
                      label="Fallback Message"
                      value={formData.assertFallbackMessage}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => 
                        setFormData({ ...formData, assertFallbackMessage: e.target.value })
                      }
                      placeholder="Message on complete failure"
                    />
                  </div>
                  <Input
                    label="Middleware Name (Optional)"
                    value={formData.assertMiddlewareName}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => 
                      setFormData({ ...formData, assertMiddlewareName: e.target.value })
                    }
                    placeholder="Optional custom name"
                  />
                </div>
              )}
              
              {/* Suggest Middleware */}
              {formData.selectedFactory === 'dao_ai.middleware.create_suggest_middleware' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Input
                      label="Constraint"
                      value={formData.suggestConstraint}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => 
                        setFormData({ ...formData, suggestConstraint: e.target.value })
                      }
                      placeholder="e.g., my_module.MyConstraint"
                      required
                      hint="Python reference to constraint"
                    />
                  </div>
                  <Input
                    label="Max Retries"
                    type="number"
                    value={formData.suggestMaxRetries}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => 
                      setFormData({ ...formData, suggestMaxRetries: parseInt(e.target.value) || 3 })
                    }
                  />
                  <Select
                    label="Suggestion Model (Optional)"
                    options={llmOptions}
                    value={formData.suggestModel}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => 
                      setFormData({ ...formData, suggestModel: e.target.value })
                    }
                    hint="LLM for generating suggestions"
                  />
                  <Input
                    label="Middleware Name (Optional)"
                    value={formData.suggestMiddlewareName}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => 
                      setFormData({ ...formData, suggestMiddlewareName: e.target.value })
                    }
                    placeholder="Optional custom name"
                  />
                </div>
              )}
              
              {/* Refine Middleware */}
              {formData.selectedFactory === 'dao_ai.middleware.create_refine_middleware' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Input
                      label="Constraint"
                      value={formData.refineConstraint}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => 
                        setFormData({ ...formData, refineConstraint: e.target.value })
                      }
                      placeholder="e.g., my_module.MyConstraint"
                      required
                      hint="Python reference to constraint"
                    />
                  </div>
                  <Input
                    label="Max Iterations"
                    type="number"
                    value={formData.refineMaxIterations}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => 
                      setFormData({ ...formData, refineMaxIterations: parseInt(e.target.value) || 3 })
                    }
                  />
                  <Select
                    label="Refine Model (Optional)"
                    options={llmOptions}
                    value={formData.refineModel}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => 
                      setFormData({ ...formData, refineModel: e.target.value })
                    }
                    hint="LLM for refinement"
                  />
                  <Input
                    label="Middleware Name (Optional)"
                    value={formData.refineMiddlewareName}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => 
                      setFormData({ ...formData, refineMiddlewareName: e.target.value })
                    }
                    placeholder="Optional custom name"
                  />
                </div>
              )}
              
              {/* Tool Call Limit Middleware */}
              {formData.selectedFactory === 'dao_ai.middleware.create_tool_call_limit_middleware' && (
                <div className="space-y-4">
                  <Select
                    label="Tool to Limit"
                    options={[
                      { value: '', label: 'All Tools (Global Limit)' },
                      ...Object.entries(tools).map(([key, tool]) => ({
                        value: key,
                        label: `${key} (${tool.name})`,
                      })),
                    ]}
                    value={formData.toolCallLimitTool}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => 
                      setFormData({ ...formData, toolCallLimitTool: e.target.value })
                    }
                    hint="Select a specific tool or leave empty for global limit"
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Thread Limit"
                      type="number"
                      value={formData.toolCallLimitThreadLimit ?? ''}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => 
                        setFormData({ 
                          ...formData, 
                          toolCallLimitThreadLimit: e.target.value ? parseInt(e.target.value) : null 
                        })
                      }
                      placeholder="No limit"
                      hint="Max calls per thread (requires checkpointer)"
                    />
                    <Input
                      label="Run Limit"
                      type="number"
                      value={formData.toolCallLimitRunLimit ?? ''}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => 
                        setFormData({ 
                          ...formData, 
                          toolCallLimitRunLimit: e.target.value ? parseInt(e.target.value) : null 
                        })
                      }
                      placeholder="No limit"
                      hint="Max calls per single run"
                    />
                  </div>
                  
                  <Select
                    label="Exit Behavior"
                    options={[
                      { value: 'continue', label: 'Continue - Log and skip further calls' },
                      { value: 'error', label: 'Error - Raise exception on limit' },
                      { value: 'end', label: 'End - Gracefully terminate agent' },
                    ]}
                    value={formData.toolCallLimitExitBehavior}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => 
                      setFormData({ ...formData, toolCallLimitExitBehavior: e.target.value as 'continue' | 'error' | 'end' })
                    }
                    hint="What happens when limit is reached"
                  />
                </div>
              )}
              
              {/* Model Call Limit Middleware */}
              {formData.selectedFactory === 'dao_ai.middleware.create_model_call_limit_middleware' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Thread Limit"
                      type="number"
                      value={formData.modelCallLimitThreadLimit ?? ''}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => 
                        setFormData({ 
                          ...formData, 
                          modelCallLimitThreadLimit: e.target.value ? parseInt(e.target.value) : null 
                        })
                      }
                      placeholder="No limit"
                      hint="Max LLM calls per thread (requires checkpointer)"
                    />
                    <Input
                      label="Run Limit"
                      type="number"
                      value={formData.modelCallLimitRunLimit ?? ''}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => 
                        setFormData({ 
                          ...formData, 
                          modelCallLimitRunLimit: e.target.value ? parseInt(e.target.value) : null 
                        })
                      }
                      placeholder="No limit"
                      hint="Max LLM calls per single run"
                    />
                  </div>
                  
                  <Select
                    label="Exit Behavior"
                    options={[
                      { value: 'error', label: 'Error - Raise exception on limit' },
                      { value: 'end', label: 'End - Gracefully terminate agent' },
                    ]}
                    value={formData.modelCallLimitExitBehavior}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => 
                      setFormData({ ...formData, modelCallLimitExitBehavior: e.target.value as 'error' | 'end' })
                    }
                    hint="What happens when limit is reached"
                  />
                </div>
              )}
              
              {/* Tool Retry Middleware */}
              {formData.selectedFactory === 'dao_ai.middleware.create_tool_retry_middleware' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Input
                      label="Max Retries"
                      type="number"
                      value={formData.toolRetryMaxRetries}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => 
                        setFormData({ ...formData, toolRetryMaxRetries: parseInt(e.target.value) || 3 })
                      }
                      hint="Maximum retry attempts"
                    />
                    <Input
                      label="Backoff Factor"
                      type="number"
                      step="0.1"
                      value={formData.toolRetryBackoffFactor}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => 
                        setFormData({ ...formData, toolRetryBackoffFactor: parseFloat(e.target.value) || 2.0 })
                      }
                      hint="Exponential backoff multiplier"
                    />
                    <Input
                      label="Initial Delay (s)"
                      type="number"
                      step="0.1"
                      value={formData.toolRetryInitialDelay}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => 
                        setFormData({ ...formData, toolRetryInitialDelay: parseFloat(e.target.value) || 1.0 })
                      }
                      hint="First retry delay in seconds"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Max Delay (s)"
                      type="number"
                      step="0.1"
                      value={formData.toolRetryMaxDelay ?? ''}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => 
                        setFormData({ 
                          ...formData, 
                          toolRetryMaxDelay: e.target.value ? parseFloat(e.target.value) : null 
                        })
                      }
                      placeholder="No maximum"
                      hint="Cap on delay between retries"
                    />
                    <div className="flex items-end">
                      <label className="flex items-center space-x-2 text-sm text-slate-300 pb-2">
                        <input
                          type="checkbox"
                          checked={formData.toolRetryJitter}
                          onChange={(e) => setFormData({ ...formData, toolRetryJitter: e.target.checked })}
                          className="rounded border-slate-600 bg-slate-700"
                        />
                        <span>Add jitter to delays</span>
                      </label>
                    </div>
                  </div>
                  
                  <Select
                    label="On Failure"
                    options={[
                      { value: 'continue', label: 'Continue - Proceed with null result' },
                      { value: 'error', label: 'Error - Raise exception after retries' },
                    ]}
                    value={formData.toolRetryOnFailure}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => 
                      setFormData({ ...formData, toolRetryOnFailure: e.target.value as 'continue' | 'error' })
                    }
                    hint="What happens after all retries fail"
                  />
                  
                  <MultiSelect
                    label="Tools to Retry"
                    options={Object.entries(tools).map(([key, tool]) => ({
                      value: key,
                      label: `${key} (${tool.name})`,
                    }))}
                    value={formData.toolRetryTools}
                    onChange={(value) => setFormData({ ...formData, toolRetryTools: value })}
                    placeholder="All tools (leave empty)"
                    hint="Select specific tools to retry, or leave empty for all tools"
                  />
                </div>
              )}
              
              {/* Model Retry Middleware */}
              {formData.selectedFactory === 'dao_ai.middleware.create_model_retry_middleware' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Input
                      label="Max Retries"
                      type="number"
                      value={formData.modelRetryMaxRetries}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => 
                        setFormData({ ...formData, modelRetryMaxRetries: parseInt(e.target.value) || 3 })
                      }
                      hint="Maximum retry attempts"
                    />
                    <Input
                      label="Backoff Factor"
                      type="number"
                      step="0.1"
                      value={formData.modelRetryBackoffFactor}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => 
                        setFormData({ ...formData, modelRetryBackoffFactor: parseFloat(e.target.value) || 2.0 })
                      }
                      hint="Exponential backoff multiplier"
                    />
                    <Input
                      label="Initial Delay (s)"
                      type="number"
                      step="0.1"
                      value={formData.modelRetryInitialDelay}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => 
                        setFormData({ ...formData, modelRetryInitialDelay: parseFloat(e.target.value) || 1.0 })
                      }
                      hint="First retry delay in seconds"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Max Delay (s)"
                      type="number"
                      step="0.1"
                      value={formData.modelRetryMaxDelay ?? ''}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => 
                        setFormData({ 
                          ...formData, 
                          modelRetryMaxDelay: e.target.value ? parseFloat(e.target.value) : null 
                        })
                      }
                      placeholder="No maximum"
                      hint="Cap on delay between retries"
                    />
                    <div className="flex items-end">
                      <label className="flex items-center space-x-2 text-sm text-slate-300 pb-2">
                        <input
                          type="checkbox"
                          checked={formData.modelRetryJitter}
                          onChange={(e) => setFormData({ ...formData, modelRetryJitter: e.target.checked })}
                          className="rounded border-slate-600 bg-slate-700"
                        />
                        <span>Add jitter to delays</span>
                      </label>
                    </div>
                  </div>
                  
                  <Select
                    label="On Failure"
                    options={[
                      { value: 'continue', label: 'Continue - Return error message' },
                      { value: 'error', label: 'Error - Raise exception after retries' },
                    ]}
                    value={formData.modelRetryOnFailure}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => 
                      setFormData({ ...formData, modelRetryOnFailure: e.target.value as 'continue' | 'error' })
                    }
                    hint="What happens after all retries fail"
                  />
                </div>
              )}
              
              {/* Context Editing Middleware */}
              {formData.selectedFactory === 'dao_ai.middleware.create_context_editing_middleware' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Input
                      label="Trigger Threshold"
                      type="number"
                      value={formData.contextEditingTrigger}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => 
                        setFormData({ ...formData, contextEditingTrigger: parseInt(e.target.value) || 100000 })
                      }
                      hint="Token count that triggers clearing"
                    />
                    <Input
                      label="Keep Recent"
                      type="number"
                      value={formData.contextEditingKeep}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => 
                        setFormData({ ...formData, contextEditingKeep: parseInt(e.target.value) || 3 })
                      }
                      hint="Number of recent tool results to keep"
                    />
                    <Input
                      label="Clear At Least"
                      type="number"
                      value={formData.contextEditingClearAtLeast}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => 
                        setFormData({ ...formData, contextEditingClearAtLeast: parseInt(e.target.value) || 0 })
                      }
                      hint="Minimum tokens to reclaim"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Placeholder Text"
                      value={formData.contextEditingPlaceholder}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => 
                        setFormData({ ...formData, contextEditingPlaceholder: e.target.value })
                      }
                      placeholder="[cleared]"
                      hint="Text to replace cleared content"
                    />
                    <Select
                      label="Token Count Method"
                      options={[
                        { value: 'approximate', label: 'Approximate (faster)' },
                        { value: 'model', label: 'Model (accurate)' },
                      ]}
                      value={formData.contextEditingTokenCountMethod}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => 
                        setFormData({ ...formData, contextEditingTokenCountMethod: e.target.value as 'approximate' | 'model' })
                      }
                      hint="How to count tokens"
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <label className="flex items-center space-x-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={formData.contextEditingClearToolInputs}
                        onChange={(e) => setFormData({ ...formData, contextEditingClearToolInputs: e.target.checked })}
                        className="rounded border-slate-600 bg-slate-700"
                      />
                      <span>Also clear tool call arguments</span>
                    </label>
                  </div>
                  
                  <MultiSelect
                    label="Exclude Tools"
                    options={Object.entries(tools).map(([key, tool]) => ({
                      value: key,
                      label: `${key} (${tool.name})`,
                    }))}
                    value={formData.contextEditingExcludeTools}
                    onChange={(value) => setFormData({ ...formData, contextEditingExcludeTools: value })}
                    placeholder="None (clear all tool outputs)"
                    hint="Tool outputs that should never be cleared"
                  />
                </div>
              )}
              
              {/* PII Middleware */}
              {formData.selectedFactory === 'dao_ai.middleware.create_pii_middleware' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Select
                      label="PII Type"
                      options={[
                        { value: 'email', label: 'Email Addresses' },
                        { value: 'phone', label: 'Phone Numbers' },
                        { value: 'ssn', label: 'Social Security Numbers' },
                        { value: 'credit_card', label: 'Credit Card Numbers' },
                        { value: 'ip_address', label: 'IP Addresses' },
                        { value: 'custom', label: 'Custom (requires detector)' },
                      ]}
                      value={formData.piiType}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => 
                        setFormData({ ...formData, piiType: e.target.value })
                      }
                      required
                      hint="Type of PII to detect"
                    />
                    <Select
                      label="Strategy"
                      options={[
                        { value: 'redact', label: 'Redact - Replace with [REDACTED]' },
                        { value: 'mask', label: 'Mask - Partial masking (e.g., ****1234)' },
                        { value: 'hash', label: 'Hash - Replace with hash value' },
                        { value: 'block', label: 'Block - Reject the request entirely' },
                      ]}
                      value={formData.piiStrategy}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => 
                        setFormData({ ...formData, piiStrategy: e.target.value as 'redact' | 'mask' | 'hash' | 'block' })
                      }
                      hint="How to handle detected PII"
                    />
                  </div>
                  
                  <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                    <label className="block text-sm font-medium text-slate-300 mb-3">Apply To</label>
                    <div className="flex items-center space-x-6">
                      <label className="flex items-center space-x-2 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={formData.piiApplyToInput}
                          onChange={(e) => setFormData({ ...formData, piiApplyToInput: e.target.checked })}
                          className="rounded border-slate-600 bg-slate-700"
                        />
                        <span>User Input</span>
                      </label>
                      <label className="flex items-center space-x-2 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={formData.piiApplyToOutput}
                          onChange={(e) => setFormData({ ...formData, piiApplyToOutput: e.target.checked })}
                          className="rounded border-slate-600 bg-slate-700"
                        />
                        <span>Agent Output</span>
                      </label>
                      <label className="flex items-center space-x-2 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={formData.piiApplyToToolResults}
                          onChange={(e) => setFormData({ ...formData, piiApplyToToolResults: e.target.checked })}
                          className="rounded border-slate-600 bg-slate-700"
                        />
                        <span>Tool Results</span>
                      </label>
                    </div>
                  </div>
                  
                  {formData.piiType === 'custom' && (
                    <p className="text-xs text-amber-400 bg-amber-900/20 p-2 rounded-lg border border-amber-700/30">
                      ⚠️ Custom PII types require a Python detector function. Configure this through custom middleware or programmatically.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Generic arguments for custom middleware */}
          {formData.selectedFactory === 'custom' && (
            <div className="space-y-3 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-300">Arguments</label>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const newKey = `arg_${Object.keys(formData.genericArgs).length + 1}`;
                    setFormData({ ...formData, genericArgs: { ...formData.genericArgs, [newKey]: '' } });
                  }}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Argument
                </Button>
              </div>
              
              {Object.keys(formData.genericArgs).length === 0 ? (
                <p className="text-xs text-slate-500">
                  No arguments. Click "Add Argument" to pass parameters to the factory function.
                </p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(formData.genericArgs).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-3 gap-2">
                      <Input
                        placeholder="Key"
                        value={key}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          const newKey = e.target.value;
                          if (newKey !== key) {
                            const newArgs = { ...formData.genericArgs };
                            newArgs[newKey] = newArgs[key];
                            delete newArgs[key];
                            setFormData({ ...formData, genericArgs: newArgs });
                          }
                        }}
                      />
                      <Input
                        placeholder="Value"
                        value={typeof value === 'string' ? value : JSON.stringify(value)}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => 
                          setFormData({ 
                            ...formData, 
                            genericArgs: { ...formData.genericArgs, [key]: e.target.value } 
                          })
                        }
                        className="col-span-2"
                      />
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          const newArgs = { ...formData.genericArgs };
                          delete newArgs[key];
                          setFormData({ ...formData, genericArgs: newArgs });
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingMiddleware ? 'Save Changes' : 'Add Middleware'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
