/**
 * VariableAssignerNodeConfig 类型定义与配置常量
 */

import {
  AssignmentValueType,
  AssignmentMode,
  SourceDataType,
  TransformOperation,
} from "@/types";

// 值类型配置
export const VALUE_TYPES: { value: AssignmentValueType; label: string; color: string }[] = [
  { value: "string", label: "字符串", color: "green" },
  { value: "number", label: "数字", color: "blue" },
  { value: "boolean", label: "布尔", color: "cyan" },
  { value: "object", label: "对象", color: "purple" },
  { value: "array", label: "数组", color: "orange" },
];

// 操作模式配置
export const MODE_OPTIONS: { value: AssignmentMode; label: string; description: string }[] = [
  { value: "set", label: "设置固定值", description: "手动输入常量值" },
  { value: "assign", label: "变量赋值", description: "直接引用其他变量" },
  { value: "transform", label: "变量运算", description: "对变量进行操作后赋值" },
];

// 按源类型分类的变换操作
export const TRANSFORM_OPERATIONS: Record<SourceDataType, {
  value: TransformOperation;
  label: string;
  description: string;
  resultType: string;
  params?: string[];
}[]> = {
  array: [
    { value: "get_first", label: "取首项", description: "获取数组第一个元素", resultType: "element" },
    { value: "get_last", label: "取末项", description: "获取数组最后一个元素", resultType: "element" },
    { value: "get_index", label: "取指定位置", description: "获取指定索引的元素", resultType: "element", params: ["arrayIndex"] },
    { value: "length", label: "获取长度", description: "返回数组元素个数", resultType: "number" },
    { value: "slice", label: "截取片段", description: "截取数组的一部分", resultType: "array", params: ["sliceStart", "sliceEnd"] },
    { value: "reverse", label: "反转", description: "反转数组顺序", resultType: "array" },
    { value: "unique", label: "去重", description: "移除重复元素", resultType: "array" },
    { value: "join", label: "连接成字符串", description: "用分隔符连接元素", resultType: "string", params: ["joinSeparator"] },
    { value: "append", label: "追加元素", description: "向数组添加元素", resultType: "array", params: ["appendValue"] },
    { value: "remove_first", label: "移除首项", description: "删除第一个元素", resultType: "array" },
    { value: "remove_last", label: "移除末项", description: "删除最后一个元素", resultType: "array" },
  ],
  string: [
    { value: "length", label: "获取长度", description: "返回字符串长度", resultType: "number" },
    { value: "trim", label: "去除空白", description: "去除首尾空白字符", resultType: "string" },
    { value: "uppercase", label: "转大写", description: "转换为大写字母", resultType: "string" },
    { value: "lowercase", label: "转小写", description: "转换为小写字母", resultType: "string" },
    { value: "regex_replace", label: "正则替换", description: "按正则表达式替换", resultType: "string", params: ["regexPattern", "regexFlags", "regexReplace"] },
    { value: "regex_extract", label: "正则提取", description: "按正则表达式提取", resultType: "string", params: ["regexPattern", "regexFlags", "regexGroup"] },
  ],
  number: [
    { value: "add", label: "加法", description: "加上一个数", resultType: "number", params: ["arithmeticValue"] },
    { value: "subtract", label: "减法", description: "减去一个数", resultType: "number", params: ["arithmeticValue"] },
    { value: "multiply", label: "乘法", description: "乘以一个数", resultType: "number", params: ["arithmeticValue"] },
    { value: "divide", label: "除法", description: "除以一个数", resultType: "number", params: ["arithmeticValue"] },
    { value: "round", label: "四舍五入", description: "四舍五入取整", resultType: "number" },
    { value: "floor", label: "向下取整", description: "向下取整", resultType: "number" },
    { value: "ceil", label: "向上取整", description: "向上取整", resultType: "number" },
    { value: "abs", label: "绝对值", description: "取绝对值", resultType: "number" },
  ],
  object: [
    { value: "get_field", label: "提取字段", description: "提取对象的某个字段", resultType: "dynamic", params: ["fieldPath"] },
    { value: "keys", label: "获取所有键", description: "返回对象的所有键名", resultType: "array" },
    { value: "values", label: "获取所有值", description: "返回对象的所有值", resultType: "array" },
  ],
  boolean: [
    { value: "not", label: "取反", description: "布尔值取反", resultType: "boolean" },
  ],
  unknown: [],
};

// 操作标签颜色
export const OPERATION_COLORS: Record<string, string> = {
  get_first: "geekblue",
  get_last: "geekblue",
  get_index: "geekblue",
  length: "volcano",
  slice: "orange",
  reverse: "lime",
  unique: "lime",
  join: "purple",
  append: "gold",
  remove_first: "error",
  remove_last: "error",
  trim: "cyan",
  uppercase: "blue",
  lowercase: "blue",
  regex_replace: "magenta",
  regex_extract: "purple",
  add: "cyan",
  subtract: "cyan",
  multiply: "cyan",
  divide: "cyan",
  round: "blue",
  floor: "blue",
  ceil: "blue",
  abs: "blue",
  get_field: "geekblue",
  keys: "orange",
  values: "orange",
  not: "red",
};
