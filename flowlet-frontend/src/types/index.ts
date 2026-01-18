/**
 * 节点类型枚举
 */
export enum NodeType {
  START = "start",
  END = "end",
  API = "api",
  KAFKA = "kafka",
  CODE = "code",
  CONDITION = "condition",
  TRANSFORM = "transform",
  SUBFLOW = "subflow",
  FOR_EACH = "foreach",
  LLM = "llm",
  VECTOR_STORE = "vector_store",
  VARIABLE_ASSIGNER = "variable_assigner",
  JSON_PARSER = "json_parser",
  SIMHASH = "simhash",
  KEYWORD_MATCH = "keyword_match",
  NOTE = "note",
}

export type KeywordMatchMode = "NORMAL" | "PINYIN" | "COMBO";
export type KeywordActionLevel =
  | "DELETE"
  | "REVIEW_BEFORE_PUBLISH"
  | "PUBLISH_BEFORE_REVIEW"
  | "TAG_ONLY";

export interface KeywordLibrary {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  enabled: boolean;
  createdBy?: string;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface KeywordTerm {
  id: string;
  libraryId: string;
  term: string;
  matchMode: KeywordMatchMode;
  enabled: boolean;
  groupIds?: string[];
  createdBy?: string;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface KeywordGroup {
  id: string;
  libraryId: string;
  name: string;
  description?: string;
  enabled: boolean;
  actionLevel: KeywordActionLevel;
  priority?: number;
  termIds: string[];
  createdBy?: string;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 输入变量类型
 */
export enum VariableType {
  TEXT = "text",
  PARAGRAPH = "paragraph",
  SELECT = "select",
  NUMBER = "number",
  STRUCTURE = "structure",
}

/**
 * 输入变量定义
 */
export interface InputVariable {
  name: string;
  label: string;
  type: VariableType;
  required: boolean;
  defaultValue?: string | number | Record<string, unknown> | unknown[];
  description?: string;
  maxLength?: number;
  // 下拉选项
  options?: Array<{ label: string; value: string }>;
  // 数字类型的最小最大值
  min?: number;
  max?: number;
  // 引用的数据结构（可为 id 或 fullName）
  structureRef?: string;
}

/**
 * 输出变量定义
 */
export interface OutputVariable {
  name: string;
  label: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  description?: string;
}

export interface CodeOutputVariable {
  name: string;
  label?: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  description?: string;
}

/**
 * 节点输出变量配置（每种节点类型的默认输出）
 */
export const NODE_OUTPUT_VARIABLES: Record<NodeType, OutputVariable[]> = {
  [NodeType.START]: [],
  [NodeType.END]: [],
  [NodeType.API]: [
    {
      name: "statusCode",
      label: "状态码",
      type: "number",
      description: "HTTP 响应状态码",
    },
    {
      name: "body",
      label: "响应体",
      type: "object",
      description: "HTTP 响应内容",
    },
    {
      name: "headers",
      label: "响应头",
      type: "object",
      description: "HTTP 响应头",
    },
    {
      name: "callbackKey",
      label: "回调Key",
      type: "string",
      description: "用于回调匹配的唯一标识（等待回调时）",
    },
    {
      name: "callbackData",
      label: "回调数据",
      type: "object",
      description: "回调返回的数据（等待回调时）",
    },
  ],
  [NodeType.KAFKA]: [
    {
      name: "topic",
      label: "Topic",
      type: "string",
      description: "发送的 Topic",
    },
    {
      name: "messageKey",
      label: "消息Key",
      type: "string",
      description: "消息的 Key",
    },
    {
      name: "callbackKey",
      label: "回调Key",
      type: "string",
      description: "用于回调匹配的唯一标识",
    },
    {
      name: "callbackData",
      label: "回调数据",
      type: "object",
      description: "回调返回的数据（等待回调时）",
    },
  ],
  [NodeType.CODE]: [
    {
      name: "result",
      label: "执行结果",
      type: "object",
      description: "代码节点返回的结构化数据",
    },
    {
      name: "stdout",
      label: "标准输出",
      type: "string",
      description: "代码执行的标准输出",
    },
    {
      name: "stderr",
      label: "错误输出",
      type: "string",
      description: "代码执行的错误输出",
    },
    {
      name: "durationMs",
      label: "耗时",
      type: "number",
      description: "代码执行耗时（毫秒）",
    },
  ],
  [NodeType.CONDITION]: [
    {
      name: "result",
      label: "判断结果",
      type: "boolean",
      description: "条件表达式的结果",
    },
  ],
  [NodeType.TRANSFORM]: [
    {
      name: "data",
      label: "转换结果",
      type: "object",
      description: "数据转换后的结果",
    },
  ],
  [NodeType.SUBFLOW]: [
    // 动态输出变量会根据选中的子流程结束节点配置自动生成
    // 以下是元数据字段（以下划线开头），用于调试
    {
      name: "_status",
      label: "执行状态",
      type: "string",
      description: "子流程执行状态（调试用）",
    },
    {
      name: "_executionId",
      label: "执行ID",
      type: "string",
      description: "子流程执行实例ID（调试用）",
    },
  ],
  [NodeType.FOR_EACH]: [
    {
      name: "mode",
      label: "执行模式",
      type: "string",
      description: "串行或并行",
    },
    {
      name: "total",
      label: "总数量",
      type: "number",
      description: "迭代的元素数量",
    },
    {
      name: "successCount",
      label: "成功数量",
      type: "number",
      description: "成功执行的数量",
    },
    {
      name: "failedCount",
      label: "失败数量",
      type: "number",
      description: "失败执行的数量",
    },
    {
      name: "results",
      label: "结果明细",
      type: "array",
      description: "每项执行输出（包含 index/item/output/error）",
    },
  ],
  [NodeType.LLM]: [
    {
      name: "text",
      label: "输出文本",
      type: "string",
      description: "大模型返回的文本内容",
    },
    {
      name: "model",
      label: "模型",
      type: "string",
      description: "实际调用的模型",
    },
    {
      name: "usage",
      label: "用量",
      type: "object",
      description: "模型返回的 token 使用统计",
    },
    {
      name: "response",
      label: "原始响应",
      type: "object",
      description: "模型返回的原始结构",
    },
  ],
  [NodeType.VECTOR_STORE]: [
    {
      name: "operation",
      label: "操作类型",
      type: "string",
      description: "向量存储操作类型",
    },
    {
      name: "count",
      label: "影响数量",
      type: "number",
      description: "写入/删除的数量",
    },
    {
      name: "matches",
      label: "相似结果",
      type: "array",
      description: "相似度检索结果列表",
    },
    {
      name: "matchedIds",
      label: "命中ID",
      type: "array",
      description: "满足相似度阈值的内容ID列表",
    },
    {
      name: "raw",
      label: "原始响应",
      type: "object",
      description: "向量存储返回的原始响应",
    },
  ],
  [NodeType.SIMHASH]: [
    {
      name: "simhash",
      label: "Simhash",
      type: "string",
      description: "64 位 Simhash（hex）",
    },
    {
      name: "stored",
      label: "已保存",
      type: "boolean",
      description: "是否写入存储（仅计算模式为 false）",
    },
    {
      name: "matchedContentIds",
      label: "匹配内容ID",
      type: "array",
      description: "海明距离小于阈值的内容ID列表",
    },
    {
      name: "matches",
      label: "匹配明细",
      type: "array",
      description: "匹配详情（contentId/flowId/distance/simhash）",
    },
  ],
  [NodeType.KEYWORD_MATCH]: [
    {
      name: "hit",
      label: "是否命中",
      type: "boolean",
      description: "是否命中关键词",
    },
    {
      name: "actionLevel",
      label: "处置等级",
      type: "string",
      description: "命中的最高处置等级",
    },
    {
      name: "matchedTerms",
      label: "命中关键词",
      type: "array",
      description: "命中的关键词列表",
    },
    {
      name: "matchedGroups",
      label: "命中规则组",
      type: "array",
      description: "命中的规则组明细",
    },
  ],
  [NodeType.VARIABLE_ASSIGNER]: [], // 赋值节点不产生输出，它只修改全流程变量
  [NodeType.JSON_PARSER]: [], // JSON 解析器节点的输出字段是动态配置的
  [NodeType.NOTE]: [], // 备注节点不参与流程执行，仅用于画布说明
};

/**
 * JSON 解析器输出字段定义
 */
export interface JsonParserOutputField {
  /** 字段路径，如 data.user.name */
  path: string;
  /** 字段类型 */
  type: "string" | "number" | "boolean" | "object" | "array";
  /** 字段描述 */
  description?: string;
  /** 子字段（用于 object 类型） */
  children?: JsonParserOutputField[];
}

/**
 * JSON 解析器节点配置
 */
export interface JsonParserNodeConfig extends NodeConfig {
  /** JSON 数据来源表达式，如 {{nodes.api-1.body}} */
  sourceExpression: string;
  /** 解析方式 */
  parseMode?: "structure" | "sample";
  /** 关联的数据结构 ID */
  dataStructureId?: string;
  /** 示例 JSON 字符串（用于解析输出字段） */
  sampleJson?: string;
  /** 输出字段配置 */
  outputFields: JsonParserOutputField[];
}

/**
 * 开始节点配置
 */
export interface StartNodeConfig extends NodeConfig {
  variables: InputVariable[];
}

/**
 * 输出变量配置（用于 End 节点）
 */
export interface OutputVariableConfig {
  /** 输出变量名称 */
  name: string;
  /** 显示标签 */
  label: string;
  /** 变量类型 */
  type: "string" | "number" | "boolean" | "object" | "array";
  /** 结构体引用（对象类型） */
  typeRef?: string;
  /** 列表元素引用（数组类型） */
  itemTypeRef?: string;
  /** 变量来源表达式，如 {{nodes.api-1.body.data}} */
  expression: string;
  /** 枚举类型标识（常量值时用于区分重复值） */
  enumKey?: string;
  /** 枚举原始值（常量值时用于回显/切换显示值） */
  enumValue?: string;
  /** 枚举输出策略（使用值或显示值） */
  enumValueType?: "value" | "label";
  /** 描述 */
  description?: string;
}

/**
 * 结束节点配置
 */
export interface EndNodeConfig extends NodeConfig {
  /** 输出变量列表 */
  outputVariables: OutputVariableConfig[];
}

/**
 * 流程状态枚举
 */
export enum FlowStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
  DISABLED = "disabled",
}

/**
 * 执行状态枚举
 */
export enum ExecutionStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  WAITING = "waiting",
  PAUSED = "paused",
  WAITING_CALLBACK = "waiting_callback",
}

/**
 * 节点配置基础接口
 */
export interface NodeConfig {
  [key: string]: unknown;
}

/**
 * API 节点配置
 */
export interface ApiNodeConfig extends NodeConfig {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  bodyTemplate?: string;
  timeout?: number;
}

/**
 * 代码节点配置
 */
export interface CodeNodeConfig extends NodeConfig {
  language: "python";
  code: string;
  inputs?: Array<{ key: string; value: string; id?: string }>;
  timeoutMs?: number;
  memoryMb?: number;
  allowNetwork?: boolean;
  outputStructureId?: string;
  genericTypeArgs?: Record<
    string,
    { isArray?: boolean; elementType?: string }
  >;
  outputAlias?: string;
  outputMode?: "custom" | "auto" | "schema";
  customOutputs?: CodeOutputVariable[];
}

/**
 * Kafka 认证类型
 */
export enum KafkaAuthType {
  NONE = "none",
  SASL_PLAIN = "sasl_plain",
  SASL_SCRAM = "sasl_scram",
}

/**
 * 回调方式类型
 */
export enum CallbackType {
  HTTP = "http",
  KAFKA = "kafka",
}

/**
 * Kafka 节点配置
 */
export interface KafkaNodeConfig extends NodeConfig {
  // 连接配置
  brokers: string;
  authType?: KafkaAuthType;
  username?: string;
  password?: string;

  // 消息配置
  topic: string;
  keyExpression?: string;
  messageTemplate: string;

  // 回调配置
  waitForCallback?: boolean;
  callbackTimeout?: number;
  callbackType?: CallbackType;
  // HTTP 回调配置
  httpCallbackUrl?: string;
  // Kafka 回调配置
  callbackTopic?: string;
  callbackKeyField?: string;
}

/**
 * 条件节点配置
 */
export interface ConditionNodeConfig extends NodeConfig {
  expression: string;
  trueOutput?: string;
  falseOutput?: string;
}

/**
 * 转换节点配置
 */
export interface TransformNodeConfig extends NodeConfig {
  mappings: Array<{
    source: string;
    target: string;
    expression?: string;
    regexMode?: "none" | "replace" | "extract" | "match";
    regexPattern?: string;
    regexFlags?: string;
    regexReplace?: string;
    regexGroup?: string;
  }>;
}

/**
 * 子流程输入映射
 */
export interface SubflowInputMapping {
  /** 子流程输入变量名 */
  targetVariable: string;
  /** 来源表达式，如 {{input.userId}} 或 {{nodes.api-1.body.id}} */
  sourceExpression: string;
}

/**
 * 子流程节点配置
 */
export interface SubflowNodeConfig extends NodeConfig {
  /** 子流程 ID */
  subflowId: string;
  /** 子流程名称（用于显示） */
  subflowName?: string;
  /** 输入参数映射 */
  inputMappings: SubflowInputMapping[];
  /** 执行失败时是否继续父流程 */
  continueOnError?: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
}

/**
 * ForEach 节点配置
 */
export interface ForEachNodeConfig extends NodeConfig {
  /** 迭代数据来源表达式 */
  itemsExpression: string;
  /** 迭代模式 */
  mode?: "serial" | "parallel";
  /** 当前项变量名 */
  itemVariable?: string;
  /** 索引变量名 */
  indexVariable?: string;
  /** 子流程 ID */
  subflowId: string;
  /** 子流程名称 */
  subflowName?: string;
  /** 输入参数映射 */
  inputMappings: SubflowInputMapping[];
  /** 执行失败时是否继续 */
  continueOnError?: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
}

/**
 * 大模型节点配置
 */
export interface LlmNodeConfig extends NodeConfig {
  providerType: "STANDARD" | "CUSTOM";
  providerKey?: string;
  providerId?: string;
  model?: string;
  systemPrompt?: string;
  userPrompt?: string;
  outputJsonEnabled?: boolean;
  outputJsonFields?: string[];
  outputJsonSample?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  timeoutMs?: number;
}

/**
 * Simhash 节点配置
 */
export interface SimhashNodeConfig extends NodeConfig {
  mode: "store" | "search" | "compute";
  textExpression: string;
  contentIdExpression?: string;
  contentType?: string;
  targetFlowIds?: string[];
  maxDistance?: number | string;
}

/**
 * 关键词匹配节点配置
 */
export interface KeywordMatchNodeConfig extends NodeConfig {
  libraryId: string;
  textExpression: string;
}

/**
 * 向量存储节点操作类型
 */
export type VectorStoreOperation = "upsert" | "delete" | "search";

/**
 * 向量存储节点配置
 */
export interface VectorStoreNodeConfig extends NodeConfig {
  providerId?: string;
  operation?: VectorStoreOperation;
  collection?: string;
  documents?: string;
  ids?: string;
  queryVector?: string;
  topK?: number;
  filter?: string;
  scoreThreshold?: string;
  excludeId?: string;
  includeMetadata?: boolean;
}

/**
 * 赋值操作模式
 */
export type AssignmentMode = "set" | "assign" | "transform";

/**
 * 值类型（用于设置固定值模式）
 */
export type AssignmentValueType = "string" | "number" | "boolean" | "object" | "array";

/**
 * 源数据类型
 */
export type SourceDataType = "string" | "number" | "boolean" | "object" | "array" | "unknown";

/**
 * 变换操作类型
 */
export type TransformOperation =
  // 数组操作
  | "get_first"
  | "get_last"
  | "get_index"
  | "length"
  | "slice"
  | "reverse"
  | "unique"
  | "join"
  | "append"
  | "remove_first"
  | "remove_last"
  // 字符串操作
  | "regex_replace"
  | "regex_extract"
  | "trim"
  | "uppercase"
  | "lowercase"
  // 数字操作
  | "add"
  | "subtract"
  | "multiply"
  | "divide"
  | "round"
  | "floor"
  | "ceil"
  | "abs"
  // 对象操作
  | "get_field"
  | "keys"
  | "values"
  // 布尔操作
  | "not";

/**
 * 操作参数
 */
export interface OperationParams {
  // 数组操作参数
  arrayIndex?: number;
  sliceStart?: number;
  sliceEnd?: number;
  joinSeparator?: string;
  appendValue?: string; // 表达式或 JSON
  // 数字运算参数
  arithmeticValue?: number;
  arithmeticUseVariable?: boolean;
  arithmeticExpression?: string;
  // 正则操作参数
  regexPattern?: string;
  regexFlags?: string;
  regexReplace?: string;
  regexGroup?: number;
  // 对象操作参数
  fieldPath?: string;
}

/**
 * 单个赋值配置（新版）
 */
export interface AssignmentItem {
  /** 唯一ID */
  id: string;
  /** 目标变量名 */
  variableName: string;
  /** 操作模式 */
  mode: AssignmentMode;

  // === 模式 1: set（设置固定值）===
  /** 值类型 */
  valueType?: AssignmentValueType;
  /** 固定值 */
  value?: string | number | boolean | object | unknown[];

  // === 模式 2 & 3: assign / transform ===
  /** 数据来源表达式 */
  sourceExpression?: string;
  /** 源数据类型（自动检测或手动指定） */
  sourceType?: SourceDataType;
  /** 源数据完整类型（包含泛型信息，如 List<ContentVO>） */
  sourceFullType?: string;
  /** 数组元素类型（从泛型中提取，如 ContentVO） */
  elementType?: string;

  // === 模式 3: transform（变量运算）===
  /** 变换操作类型 */
  operation?: TransformOperation;
  /** 操作参数 */
  operationParams?: OperationParams;

  /** 结果类型（自动推断） */
  resultType?: string;

  // === 兼容旧版字段（向后兼容）===
  /** @deprecated 使用 mode + valueType 代替 */
  variableType?: AssignmentVariableType;
  /** @deprecated 使用 value 代替 */
  setValue?: string | number | object | unknown[];
  /** @deprecated 使用 operationParams 代替 */
  arithmeticValue?: number;
  /** @deprecated 使用 operationParams 代替 */
  arithmeticUseVariable?: boolean;
  /** @deprecated 使用 operationParams 代替 */
  arithmeticExpression?: string;
  /** @deprecated 使用 operationParams 代替 */
  regexPattern?: string;
  /** @deprecated 使用 operationParams 代替 */
  regexFlags?: string;
  /** @deprecated 使用 operationParams 代替 */
  regexReplace?: string;
  /** @deprecated 使用 operationParams 代替 */
  regexGroup?: number;
  /** @deprecated 使用 operationParams 代替 */
  arrayIndex?: number;
  /** @deprecated 使用 operationParams 代替 */
  sliceStart?: number;
  /** @deprecated 使用 operationParams 代替 */
  sliceEnd?: number;
  /** @deprecated 使用 operationParams 代替 */
  joinSeparator?: string;
}

// 保留旧类型定义用于向后兼容
/** @deprecated */
export type AssignmentVariableType = "string" | "number" | "object" | "array";
/** @deprecated */
export type StringOperation = "overwrite" | "clear" | "set" | "regex_replace" | "regex_extract";
/** @deprecated */
export type NumberOperation = "overwrite" | "clear" | "set" | "add" | "subtract" | "multiply" | "divide" | "length";
/** @deprecated */
export type ObjectOperation = "overwrite" | "clear" | "set";
/** @deprecated */
export type ArrayOperation = "overwrite" | "clear" | "append" | "extend" | "remove_first" | "remove_last";
/** @deprecated */
export type AssignmentOperation = StringOperation | NumberOperation | ObjectOperation | ArrayOperation;

/**
 * 赋值节点配置
 */
export interface VariableAssignerConfig extends NodeConfig {
  /** 赋值项列表 */
  assignments: AssignmentItem[];
}

/**
 * 流程依赖关系
 */
export interface FlowDependency {
  id: string;
  flowId: string;
  dependentFlowId: string;
  nodeId: string;
  createdAt: string;
}

/**
 * 流程图节点数据
 */
export interface FlowNodeData extends Record<string, unknown> {
  label: string;
  nodeType: NodeType;
  config?: NodeConfig;
  description?: string;
  /** 节点别名，用于变量引用，更易读 */
  alias?: string;
  /** 调试输出数据，用于下游节点的字段选择器 */
  debugOutput?: Record<string, unknown>;
}

/**
 * 流程定义
 */
export interface FlowDefinition {
  id: string;
  name: string;
  description?: string;
  graphData: string;
  inputSchema?: string;
  status: FlowStatus;
  version: number;
  isReusable?: boolean;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 流程定义版本
 */
export interface FlowDefinitionVersion {
  id: string;
  flowId: string;
  version: number;
  name: string;
  description?: string;
  graphData: string;
  inputSchema?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
}

/**
 * 流程图数据
 */
export interface FlowGraphData {
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: FlowNodeData;
    measured?: { width?: number; height?: number };
    selected?: boolean;
    dragging?: boolean;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
    label?: string;
    type?: string;
    animated?: boolean;
  }>;
}

/**
 * 流程定义请求
 */
export interface FlowDefinitionRequest {
  name: string;
  description?: string;
  graphData: FlowGraphData;
  inputSchema?: string;
}

/**
 * 流程执行实例
 */
export interface FlowExecution {
  id: string;
  flowId: string;
  flowName?: string;
  flowVersion: number;
  status: ExecutionStatus;
  inputData?: string;
  outputData?: string;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}

/**
 * 节点执行记录
 */
export interface NodeExecution {
  id: string;
  executionId: string;
  nodeId: string;
  nodeName: string;
  nodeType: NodeType;
  status: ExecutionStatus;
  inputData?: string;
  outputData?: string;
  errorMessage?: string;
  executionData?: string; // 执行过程数据（等待回调时的请求/响应信息）
  startedAt: string;
  completedAt?: string;
}

/**
 * API 响应
 */
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

/**
 * AI 流程会话
 */
export interface AiFlowSession {
  id: string;
  projectId: string;
  flowId?: string | null;
  providerType: "STANDARD" | "CUSTOM";
  providerKey?: string | null;
  providerId?: string | null;
  model?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * AI 会话消息
 */
export interface AiFlowMessageRecord {
  id: string;
  role: "user" | "assistant";
  content: string;
  patchJson?: string | null;
  createdAt: string;
}

export interface AiFlowSessionDetail {
  session: AiFlowSession;
  currentDsl?: string | null;
  messages: AiFlowMessageRecord[];
}

export interface AiFlowMessageResponse {
  sessionId: string;
  messageId: string;
  role: "assistant";
  content: string;
  patchJson?: string | null;
  currentDsl?: string | null;
  createdAt: string;
}

/**
 * 分页响应
 */
export interface PageResponse<T> {
  records: T[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

/**
 * 执行请求
 */
export interface ProcessRequest {
  flowId: string;
  inputs?: Record<string, unknown>;
  flowVersion?: number;
}

/**
 * 可选择的变量项
 * 用于变量选择器中展示
 */
export interface SelectableVariable {
  /** 变量唯一标识（用于存储，如 nodes.kafka-123.topic） */
  key: string;
  /** 显示名称（如 topic） */
  name: string;
  /** 变量标签说明 */
  label: string;
  /** 变量类型 */
  type: string;
  /** 结构体引用（对象类型） */
  typeRef?: string;
  /** 列表元素引用（数组类型） */
  itemTypeRef?: string;
  /** 变量描述 */
  description?: string;
  /** 来源分组（如 用户输入、Kafka节点、上下文变量） */
  group: string;
  /** 来源节点 ID（可选，用于调试） */
  sourceNodeId?: string;
}

/**
 * 变量分组
 */
export interface VariableGroup {
  /** 分组名称 */
  name: string;
  /** 分组内的变量列表 */
  variables: SelectableVariable[];
}

/**
 * 节点调试请求
 */
export interface NodeDebugRequest {
  /** 节点数据 */
  node: {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: FlowNodeData;
  };
  /** 模拟的输入数据 */
  mockInputs?: Record<string, unknown>;
  /** 超时时间（毫秒） */
  timeout?: number;
}

/**
 * 节点调试结果
 */
export interface NodeDebugResult {
  /** 是否成功 */
  success: boolean;
  /** 错误消息 */
  errorMessage?: string;
  /** 输出数据 */
  output?: Record<string, unknown>;
  /** 执行耗时（毫秒） */
  duration: number;
  /** 请求详情 */
  requestDetails?: Record<string, unknown>;
  /** 原始响应 */
  rawResponse?: unknown;
}
