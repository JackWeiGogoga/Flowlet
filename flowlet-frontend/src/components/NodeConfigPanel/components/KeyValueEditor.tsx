import React, { useId } from "react";
import { Button, Tooltip } from "antd";
import { createStyles } from "antd-style";
import { AiOutlinePlus, AiOutlineDelete } from "react-icons/ai";
import { VariableInput } from "@/components/VariableInput";
import { EnumValuePicker } from "@/components/EnumValuePicker";
import { useProjectStore } from "@/store/projectStore";
import { useEnumOptions } from "@/hooks/useEnumOptions";

const useStyles = createStyles(({ css }) => ({
  editor: css`
    border: 1px solid #e8e8e8;
    border-radius: 6px;
    overflow: hidden;
  `,

  header: css`
    display: flex;
    background: #fafafa;
    border-bottom: 1px solid #e8e8e8;
    font-size: 12px;
    font-weight: 500;
    color: #666;
  `,

  col: css`
    padding: 8px 12px;
  `,

  keyCol: css`
    flex: 1;
    border-right: 1px solid #e8e8e8;
  `,

  valueCol: css`
    flex: 1;
  `,

  actionCol: css`
    width: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
  `,

  body: css`
    max-height: 200px;
    overflow-y: auto;
  `,

  row: css`
    display: flex;
    border-bottom: 1px solid #f0f0f0;

    &:last-child {
      border-bottom: none;
    }
  `,

  rowCol: css`
    padding: 4px 8px;
  `,

  rowKeyCol: css`
    border-right: 1px solid #f0f0f0;

    .variable-input {
      border: none;
      background: transparent;
      box-shadow: none;

      &:focus,
      &:hover {
        border: none;
        box-shadow: none;
      }
    }

    .ant-input {
      border: none;
      background: transparent;
      padding: 4px 0;
      font-size: 12px;

      &:focus {
        box-shadow: none;
      }

      &::placeholder {
        color: #bfbfbf;
        font-size: 12px;
      }
    }
  `,

  rowValueCol: css`
    display: flex;
    align-items: center;
    gap: 6px;

    .variable-input {
      border: none;
      background: transparent;
      box-shadow: none;

      &:focus,
      &:hover {
        border: none;
        box-shadow: none;
      }
    }

    .ant-input {
      border: none;
      background: transparent;
      padding: 4px 0;
      font-size: 12px;

      &:focus {
        box-shadow: none;
      }

      &::placeholder {
        color: #bfbfbf;
        font-size: 12px;
      }
    }
  `,

  enumPicker: css`
    width: 130px;
    flex-shrink: 0;
  `,

  addRowBtn: css`
    margin: 8px;
    font-size: 12px;
  `,
}));

export interface KeyValuePair {
  key: string;
  value: string;
  id: string;
}

export interface KeyValueEditorProps {
  value?: KeyValuePair[] | Record<string, string> | null;
  onChange?: (value: KeyValuePair[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  disabled?: boolean;
}

/**
 * 键值对编辑器组件
 * 用于编辑 Headers、Params、Form Data 等键值对数据
 * 支持变量插入
 */
export const KeyValueEditor: React.FC<KeyValueEditorProps> = ({
  value = [],
  onChange,
  keyPlaceholder = "键入 '/' 键快速插入变量",
  valuePlaceholder = "键入 '/' 键快速插入变量",
  disabled = false,
}) => {
  const { styles, cx } = useStyles();
  const { currentProject } = useProjectStore();
  const { options: enumOptions } = useEnumOptions(currentProject?.id);
  const idPrefix = useId();

  // 生成唯一 ID
  const generateId = (suffix: string | number) => `kv_${idPrefix}_${suffix}`;

  // 确保至少有一行空数据用于输入
  const ensureEmptyRow = (pairs: KeyValuePair[]): KeyValuePair[] => {
    const hasEmptyRow = pairs.some((p) => !p.key && !p.value);
    if (!hasEmptyRow) {
      return [
        ...pairs,
        { key: "", value: "", id: generateId(`empty_${pairs.length}`) },
      ];
    }
    return pairs;
  };

  const normalizePairs = (
    input: KeyValueEditorProps["value"]
  ): KeyValuePair[] => {
    if (!input) return [];
    if (Array.isArray(input)) {
      return input.map((item, index) => ({
        key: item?.key ?? "",
        value: item?.value ?? "",
        id: item?.id ?? generateId(index),
      }));
    }
    if (typeof input === "object") {
      return Object.entries(input).map(([key, value]) => ({
        key,
        value: value ?? "",
        id: generateId(key),
      }));
    }
    return [];
  };

  const pairs = ensureEmptyRow(normalizePairs(value));

  // 更新某一行的数据
  const handleUpdate = (
    id: string,
    field: "key" | "value",
    newValue: string
  ) => {
    const newPairs = pairs.map((p) =>
      p.id === id ? { ...p, [field]: newValue } : p
    );
    // 过滤掉完全为空的行（保留最后一行空行用于输入）
    const filtered = newPairs.filter(
      (p, i) => p.key || p.value || i === newPairs.length - 1
    );
    onChange?.(ensureEmptyRow(filtered));
  };

  // 删除某一行
  const handleDelete = (id: string) => {
    const newPairs = pairs.filter((p) => p.id !== id);
    onChange?.(ensureEmptyRow(newPairs));
  };

  // 添加新行
  const handleAdd = () => {
    onChange?.([
      ...pairs,
      { key: "", value: "", id: generateId(`new_${pairs.length}`) },
    ]);
  };

  return (
    <div className={styles.editor}>
      <div className={styles.header}>
        <div className={cx(styles.col, styles.keyCol)}>键</div>
        <div className={cx(styles.col, styles.valueCol)}>值</div>
        <div className={cx(styles.col, styles.actionCol)}></div>
      </div>
      <div className={styles.body}>
        {pairs.map((pair, index) => (
          <div key={pair.id} className={styles.row}>
            <div className={cx(styles.rowCol, styles.keyCol, styles.rowKeyCol)}>
              <VariableInput
                value={pair.key}
                onChange={(val) => handleUpdate(pair.id, "key", val)}
                placeholder={keyPlaceholder}
                disabled={disabled}
              />
            </div>
            <div
              className={cx(styles.rowCol, styles.valueCol, styles.rowValueCol)}
            >
              <VariableInput
                value={pair.value}
                onChange={(val) => handleUpdate(pair.id, "value", val)}
                placeholder={valuePlaceholder}
                disabled={disabled}
              />
              <EnumValuePicker
                options={enumOptions}
                onSelect={(selectedValue) =>
                  handleUpdate(pair.id, "value", selectedValue)
                }
                className={styles.enumPicker}
                placeholder="枚举值"
                disabled={disabled || !enumOptions || enumOptions.length === 0}
              />
            </div>
            <div className={cx(styles.rowCol, styles.actionCol)}>
              {(pair.key || pair.value || index < pairs.length - 1) && (
                <Tooltip title="删除">
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<AiOutlineDelete />}
                    onClick={() => handleDelete(pair.id)}
                    disabled={disabled}
                  />
                </Tooltip>
              )}
            </div>
          </div>
        ))}
      </div>
      <Button
        type="dashed"
        size="small"
        icon={<AiOutlinePlus />}
        onClick={handleAdd}
        disabled={disabled}
        className={styles.addRowBtn}
      >
        添加
      </Button>
    </div>
  );
};

export default KeyValueEditor;
