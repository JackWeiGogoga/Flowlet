import React, { useMemo, useState } from "react";
import { Select, Empty } from "antd";
import type { SelectProps } from "antd";

type SelectOptions = NonNullable<SelectProps["options"]>;
type SelectOption = SelectOptions[number];
type SelectSearchConfig = Exclude<
  NonNullable<SelectProps["showSearch"]>,
  boolean
>;
type SelectFilterOption = NonNullable<SelectSearchConfig["filterOption"]>;

interface ValuePickerProps {
  /** 枚举选项（分组格式） */
  enumOptions?: SelectOptions;
  /** 常量选项（分组格式） */
  constantOptions?: SelectOptions;
  /** 选择回调 */
  onSelect: (value: string, option?: SelectOption) => void;
  /** 受控值 */
  value?: string;
  /** 占位符 */
  placeholder?: string;
  /** 尺寸 */
  size?: "small" | "middle";
  /** 是否禁用 */
  disabled?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 是否允许清除 */
  allowClear?: boolean;
}

/**
 * 统一的值选择器组件
 * 合并枚举和常量选项到一个下拉框中，按类型分组显示
 */
export const ValuePicker: React.FC<ValuePickerProps> = ({
  enumOptions = [],
  constantOptions = [],
  onSelect,
  value,
  placeholder = "选择值",
  size = "small",
  disabled = false,
  className,
  allowClear = true,
}) => {
  const [internalValue, setInternalValue] = useState<string | undefined>();

  // 合并选项，按来源分组
  const mergedOptions = useMemo<SelectOptions>(() => {
    const result: SelectOptions = [];

    // 添加常量分组
    if (constantOptions && constantOptions.length > 0) {
      result.push(...constantOptions);
    }

    // 添加枚举分组（重新标记以区分来源）
    if (enumOptions && enumOptions.length > 0) {
      // 枚举选项已经是分组格式，直接添加
      const enumGroups = enumOptions.map((group) => {
        // 确保 group 是分组格式（有 options 属性）
        if ("options" in group && Array.isArray(group.options)) {
          return {
            ...group,
            label: `📋 ${group.label}`,
            options: group.options.map((opt) => ({
              ...opt,
              data: {
                ...(typeof opt === "object" && opt !== null && "data" in opt
                  ? (opt.data as Record<string, unknown>)
                  : {}),
                type: "enum" as const,
              },
            })),
          };
        }
        return group;
      });
      result.push(...enumGroups);
    }

    return result;
  }, [enumOptions, constantOptions]);

  const hasOptions = mergedOptions.length > 0;
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  const filterOption: SelectFilterOption = useMemo(() => {
    return (input, option) => {
      const data = (option as { data?: { searchText?: string } })?.data;
      const text = data?.searchText || "";
      return text.toLowerCase().includes(input.toLowerCase());
    };
  }, []);

  return (
    <Select
      value={currentValue}
      size={size}
      placeholder={placeholder}
      options={mergedOptions}
      disabled={disabled || !hasOptions}
      allowClear={allowClear}
      onChange={(nextValue, option) => {
        if (typeof nextValue === "string") {
          onSelect(nextValue, option as SelectOption);
        }
        if (!isControlled) {
          setInternalValue(undefined);
        }
      }}
      showSearch={{ filterOption }}
      popupMatchSelectWidth={false}
      notFoundContent={
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无可选值"
          style={{ margin: "8px 0" }}
        />
      }
      className={className}
    />
  );
};
