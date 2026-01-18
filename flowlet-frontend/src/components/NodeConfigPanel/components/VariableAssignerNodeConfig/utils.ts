/**
 * VariableAssignerNodeConfig 辅助函数
 * 类型推断、类型解析等工具函数
 */

import {
  AssignmentMode,
  AssignmentValueType,
  SourceDataType,
  TransformOperation,
  SelectableVariable,
} from "@/types";
import { TRANSFORM_OPERATIONS } from "./constants";

/**
 * 源变量的类型信息
 */
export interface SourceTypeInfo {
  baseType: SourceDataType;
  fullType: string;
  elementType?: string;
}

/**
 * 从泛型类型中提取元素类型
 * 支持格式：List<ContentVO>, Array<String>, ContentVO[], array<number> 等
 */
export function extractElementType(fullType: string): string | undefined {
  if (!fullType) return undefined;
  
  // 匹配 List<X>, ArrayList<X>, Array<X>, Set<X> 等 Java/通用泛型格式
  const genericMatch = fullType.match(/^(?:List|ArrayList|Set|HashSet|LinkedList|Array|Collection)<(.+)>$/i);
  if (genericMatch) {
    return genericMatch[1].trim();
  }
  
  // 匹配 X[] 数组格式
  const arrayMatch = fullType.match(/^(.+)\[\]$/);
  if (arrayMatch) {
    return arrayMatch[1].trim();
  }
  
  // 匹配 array<X> 格式
  const arrayGenericMatch = fullType.match(/^array<(.+)>$/i);
  if (arrayGenericMatch) {
    return arrayGenericMatch[1].trim();
  }
  
  return undefined;
}

/**
 * 解析类型引用，将 struct:xxx 转换为结构名称
 */
export function resolveTypeRef(
  typeRef: string | undefined,
  dataStructures: { id: string; name: string; fullName?: string }[]
): string | undefined {
  if (!typeRef) return undefined;
  
  // 如果是 struct:xxx 格式，解析出结构名称
  if (typeRef.startsWith("struct:")) {
    const structId = typeRef.slice("struct:".length);
    const structure = dataStructures.find(s => s.id === structId);
    if (structure) {
      return structure.name || structure.fullName || structId;
    }
    return undefined; // 找不到结构，返回 undefined
  }
  
  // 如果是 generic:xxx 格式，暂时返回 object
  if (typeRef.startsWith("generic:")) {
    return "object";
  }
  
  // 其他情况直接返回
  return typeRef;
}

/**
 * 推断源变量的类型信息
 */
export function inferSourceTypeInfo(
  expression: string,
  allVariables: SelectableVariable[],
  dataStructures: { id: string; name: string; fullName?: string }[] = []
): SourceTypeInfo {
  const defaultResult: SourceTypeInfo = { baseType: "unknown", fullType: "unknown" };
  
  if (!expression) return defaultResult;
  
  // 从表达式中提取变量 key
  const match = expression.match(/\{\{(.+?)\}\}/);
  if (!match) return defaultResult;
  
  const key = match[1];
  const variable = allVariables.find(v => v.key === key);
  
  if (!variable) return defaultResult;
  
  const fullType = variable.type || "unknown";
  
  // 基础类型映射
  const typeMap: Record<string, SourceDataType> = {
    string: "string",
    number: "number",
    integer: "number",
    float: "number",
    double: "number",
    boolean: "boolean",
    object: "object",
    array: "array",
  };
  
  // 判断是否为数组类型
  const lowerType = fullType.toLowerCase();
  const isArrayType = 
    lowerType === "array" ||
    lowerType.startsWith("list<") ||
    lowerType.startsWith("arraylist<") ||
    lowerType.startsWith("set<") ||
    lowerType.startsWith("collection<") ||
    lowerType.startsWith("array<") ||
    fullType.endsWith("[]");
  
  let baseType: SourceDataType;
  if (isArrayType) {
    baseType = "array";
  } else {
    baseType = typeMap[lowerType] || "unknown";
  }
  
  // 提取元素类型
  let elementType: string | undefined;
  if (baseType === "array") {
    // 先尝试从 fullType 中提取（如 List<ContentVO>）
    elementType = extractElementType(fullType);
    
    // 如果没有提取到，尝试从 itemTypeRef 解析
    if (!elementType && variable.itemTypeRef) {
      elementType = resolveTypeRef(variable.itemTypeRef, dataStructures);
    }
    
    // 如果 elementType 仍然是 struct:xxx 格式，解析它
    if (elementType?.startsWith("struct:")) {
      elementType = resolveTypeRef(elementType, dataStructures);
    }
  }
  
  return { baseType, fullType, elementType };
}

/**
 * 计算结果类型
 */
export function computeResultType(
  mode: AssignmentMode,
  valueType?: AssignmentValueType,
  sourceType?: SourceDataType,
  operation?: TransformOperation,
  elementType?: string,
  sourceFullType?: string
): string {
  if (mode === "set") {
    return valueType || "unknown";
  }
  
  if (mode === "assign") {
    // 对于赋值模式，优先返回完整类型
    return sourceFullType || sourceType || "unknown";
  }
  
  if (mode === "transform" && operation && sourceType) {
    const ops = TRANSFORM_OPERATIONS[sourceType] || [];
    const op = ops.find(o => o.value === operation);
    if (op) {
      if (op.resultType === "element") {
        // 元素提取操作：返回数组的元素类型
        return elementType || "object";
      }
      if (op.resultType === "dynamic") {
        return "unknown"; // 动态类型（如 get_field）
      }
      return op.resultType;
    }
  }
  
  return "unknown";
}
