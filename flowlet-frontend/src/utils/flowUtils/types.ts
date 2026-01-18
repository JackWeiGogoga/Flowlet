/**
 * flowUtils 模块类型定义
 */

import type { DataStructureResponse, FieldDefinition } from "@/services/dataStructureService";

/**
 * 转换节点映射配置类型
 */
export interface TransformMapping {
  id?: string;
  target: string;
  source?: string;
  expression?: string;
}

export interface GenericTypeArg {
  isArray?: boolean;
  elementType?: string;
  collectionType?: "list" | "set" | "map" | "";
  keyType?: string;
  valueType?: string;
}

export type GenericTypeArgs = Record<string, GenericTypeArg>;

export interface OutputSchemaConfigPayload {
  enableOutputSchema?: boolean;
  outputStructureId?: string;
  genericTypeArgs?: GenericTypeArgs;
  outputCollectionType?: "list" | "set" | "map" | "";
}

export interface StructureIndex {
  byId: Map<string, DataStructureResponse>;
  byName: Map<string, DataStructureResponse>;
  byFullName: Map<string, DataStructureResponse>;
}

export interface SchemaField {
  path: string;
  type: string;
  description?: string;
  typeRef?: string;
  itemTypeRef?: string;
}

export interface ResolveContext {
  index: StructureIndex;
  genericTypeArgs?: GenericTypeArgs;
  genericParamNames: Set<string>;
  visited: Set<string>;
}

export interface ResolvedType {
  kind: "primitive" | "object" | "array";
  type: string;
  fields?: FieldDefinition[];
  item?: ResolvedType;
  structId?: string;
  genericRef?: string;
}
