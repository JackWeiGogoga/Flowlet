/**
 * 数据结构索引与查询工具
 * 用于在运行时快速查找和索引数据结构定义
 */

import type { DataStructureResponse, FieldDefinition } from "@/services/dataStructureService";
import type {
  StructureIndex,
  ResolveContext,
  ResolvedType,
  SchemaField,
  GenericTypeArgs,
} from "./types";

const BASE_TYPES = new Set([
  "string",
  "number",
  "boolean",
  "object",
  "array",
  "list",
]);

export const isListType = (typeName?: string): boolean =>
  typeName === "array" || typeName === "list";

/**
 * 构建数据结构索引，支持通过 id、name、fullName 快速查找
 */
export const buildStructureIndex = (
  structures: DataStructureResponse[] = []
): StructureIndex => {
  const byId = new Map<string, DataStructureResponse>();
  const byName = new Map<string, DataStructureResponse>();
  const byFullName = new Map<string, DataStructureResponse>();

  structures.forEach((structure) => {
    if (structure.id) {
      byId.set(structure.id, structure);
    }
    if (structure.name) {
      byName.set(structure.name, structure);
    }
    if (structure.fullName) {
      byFullName.set(structure.fullName, structure);
    }
  });

  return { byId, byName, byFullName };
};

/**
 * 通过引用字符串获取数据结构定义
 * 支持 "struct:" 前缀、id、fullName、name 等多种格式
 */
export const getStructureByRef = (
  ref: string | undefined,
  index: StructureIndex
): DataStructureResponse | undefined => {
  if (!ref) return undefined;

  if (ref.startsWith("struct:")) {
    return index.byId.get(ref.slice("struct:".length));
  }

  return (
    index.byId.get(ref) ||
    index.byFullName.get(ref) ||
    index.byName.get(ref)
  );
};

/**
 * 解析类型字符串为 ResolvedType
 */
export const resolveTypeString = (
  typeName: string | undefined,
  context: ResolveContext
): ResolvedType => {
  if (!typeName) {
    return { kind: "primitive", type: "dynamic" };
  }

  if (typeName.startsWith("generic:")) {
    return { kind: "object", type: "object", genericRef: typeName };
  }

  if (BASE_TYPES.has(typeName)) {
    if (typeName === "object") {
      return { kind: "object", type: "object" };
    }
    if (isListType(typeName)) {
      return { kind: "array", type: "array" };
    }
    return { kind: "primitive", type: typeName };
  }

  const structure = getStructureByRef(typeName, context.index);
  if (structure) {
    if (context.visited.has(structure.id)) {
      return { kind: "object", type: "object" };
    }
    return {
      kind: "object",
      type: "object",
      fields: structure.fields || [],
      structId: structure.id,
    };
  }

  return { kind: "primitive", type: "dynamic" };
};

/**
 * 解析泛型参数类型
 */
export const resolveGenericParamType = (
  paramName: string,
  context: ResolveContext
): ResolvedType => {
  const arg = context.genericTypeArgs?.[paramName];
  if (!arg) {
    return { kind: "primitive", type: "dynamic" };
  }

  const collectionType = arg.collectionType;
  const isListLike = collectionType === "list" || collectionType === "set";
  const isMap = collectionType === "map";

  const elementType = arg.elementType;
  const resolvedElement = resolveTypeString(elementType, context);
  const resolvedMapValue = resolveTypeString(arg.valueType, context);

  if (isMap) {
    return { kind: "object", type: "object" };
  }

  if (isListLike || arg.isArray) {
    return { kind: "array", type: "array", item: resolvedElement };
  }

  if (arg.valueType) {
    return resolvedMapValue;
  }

  return resolvedElement;
};

/**
 * 解析字段类型
 */
export const resolveFieldType = (
  field: FieldDefinition,
  context: ResolveContext
): ResolvedType => {
  const referencedStructure =
    getStructureByRef(field.refStructure || field.refType, context.index) ||
    undefined;
  if (referencedStructure) {
    if (context.visited.has(referencedStructure.id)) {
      return { kind: "object", type: "object" };
    }
    return {
      kind: "object",
      type: "object",
      fields: referencedStructure.fields || [],
      structId: referencedStructure.id,
    };
  }

  if (context.genericParamNames.has(field.type)) {
    return resolveGenericParamType(field.type, context);
  }

  if (field.type === "object") {
    return { kind: "object", type: "object", fields: field.children || [] };
  }

  if (isListType(field.type)) {
    let itemResolved: ResolvedType | undefined;
    if (field.itemType) {
      if (context.genericParamNames.has(field.itemType)) {
        itemResolved = resolveGenericParamType(field.itemType, context);
      } else if (field.itemType === "object") {
        itemResolved = {
          kind: "object",
          type: "object",
          fields: field.children || [],
        };
      } else {
        itemResolved = resolveTypeString(field.itemType, context);
      }
    }

    if (!itemResolved) {
      itemResolved = { kind: "primitive", type: "dynamic" };
    }

    return { kind: "array", type: "array", item: itemResolved };
  }

  return resolveTypeString(field.type, context);
};

/**
 * 将数据结构的字段展平为 SchemaField 数组
 */
export const flattenStructureFields = (
  fields: FieldDefinition[],
  context: ResolveContext,
  parentPath = ""
): SchemaField[] => {
  const result: SchemaField[] = [];

  fields.forEach((field) => {
    const fieldName = field.name?.trim();
    if (!fieldName) {
      return;
    }

    const path = parentPath ? `${parentPath}.${fieldName}` : fieldName;
    const resolved = resolveFieldType(field, context);
    result.push({
      path,
      type: resolved.type,
      description: field.description,
      typeRef: resolved.structId
        ? `struct:${resolved.structId}`
        : resolved.genericRef,
      itemTypeRef: resolved.item?.structId
        ? `struct:${resolved.item.structId}`
        : resolved.item?.genericRef ||
          (resolved.item?.kind === "primitive" && resolved.item.type !== "dynamic"
            ? resolved.item.type
            : undefined),
    });

    if (resolved.kind === "object" && resolved.fields?.length) {
      const nextVisited = new Set(context.visited);
      if (resolved.structId) {
        nextVisited.add(resolved.structId);
      }
      result.push(
        ...flattenStructureFields(
          resolved.fields,
          { ...context, visited: nextVisited },
          path
        )
      );
    } else if (
      resolved.kind === "array" &&
      resolved.item?.kind === "object" &&
      resolved.item.fields?.length
    ) {
      const nextVisited = new Set(context.visited);
      if (resolved.item.structId) {
        nextVisited.add(resolved.item.structId);
      }
      result.push(
        ...flattenStructureFields(
          resolved.item.fields,
          { ...context, visited: nextVisited },
          path
        )
      );
    }
  });

  return result;
};

/**
 * 通过结构引用获取展平后的字段列表
 */
export const getStructureFieldsByRef = (
  structureRef: string | undefined,
  index: StructureIndex | null,
  genericTypeArgs?: GenericTypeArgs
): SchemaField[] => {
  if (!structureRef || !index) {
    return [];
  }

  if (structureRef.startsWith("generic:")) {
    return [];
  }

  const structure = getStructureByRef(structureRef, index);
  if (!structure) {
    return [];
  }

  const genericParamNames = new Set(
    (structure.typeParameters || [])
      .map((param) => param.name)
      .filter((name): name is string => Boolean(name))
  );

  const context: ResolveContext = {
    index,
    genericTypeArgs,
    genericParamNames,
    visited: new Set([structure.id]),
  };

  return flattenStructureFields(structure.fields || [], context);
};
