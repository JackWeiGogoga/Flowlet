import React, { useMemo, useState } from "react";
import { Select } from "antd";
import type { SelectProps } from "antd";

type SelectOptions = NonNullable<SelectProps["options"]>;
type SelectOption = SelectOptions[number];
type SelectSearchConfig = Exclude<
  NonNullable<SelectProps["showSearch"]>,
  boolean
>;
type SelectFilterOption = NonNullable<SelectSearchConfig["filterOption"]>;

interface EnumValuePickerProps {
  options: SelectOptions;
  onSelect: (value: string, option?: SelectOption) => void;
  value?: string;
  placeholder?: string;
  size?: "small" | "middle";
  disabled?: boolean;
  className?: string;
  allowClear?: boolean;
}

export const EnumValuePicker: React.FC<EnumValuePickerProps> = ({
  options,
  onSelect,
  value,
  placeholder = "枚举值",
  size = "small",
  disabled = false,
  className,
  allowClear = true,
}) => {
  const [internalValue, setInternalValue] = useState<string | undefined>();
  const hasOptions = (options?.length || 0) > 0;
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
      options={options}
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
      notFoundContent="暂无枚举"
      className={className}
    />
  );
};
