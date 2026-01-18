import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { Dropdown, Empty } from "antd";
import { useDebouncedCallback } from "use-debounce";
import { SelectableVariable } from "@/types";
import { useFlowStore, FlowNode } from "@/store/flowStore";
import { useProjectStore } from "@/store/projectStore";
import { nodeTypeIcons, nodeTypeSymbols } from "@/constants/nodeIcons";
import { buildAvailableVariables } from "@/utils/flowUtils";
import { useEnumOptions } from "@/hooks/useEnumOptions";
import { EnumValuePicker } from "@/components/EnumValuePicker";
import { useStyles } from "./VariableInput.style";
import type { ConstantDefinitionResponse } from "@/services/constantService";

interface VariableInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  currentNodeId?: string;
  multiline?: boolean;
  disabled?: boolean;
  className?: string;
  showEnumPicker?: boolean;
}

interface VariableDisplayInfo {
  symbol: string;
  groupName: string;
  varName: string;
}

const formatTypeLabel = (type?: string) => {
  if (!type) return "";
  if (type === "array" || type === "list") {
    return "List";
  }
  return type;
};

/**
 * 解析变量 key 并返回显示信息
 */
const parseVariableKey = (
  key: string,
  nodes: FlowNode[],
  constants: ConstantDefinitionResponse[]
): VariableDisplayInfo | null => {
  if (key.startsWith("input.")) {
    return {
      symbol: nodeTypeSymbols.input,
      groupName: "开始",
      varName: key.substring(6),
    };
  }

  if (key.startsWith("context.")) {
    return {
      symbol: nodeTypeSymbols.context,
      groupName: "上下文",
      varName: key.substring(8),
    };
  }

  if (key.startsWith("const.")) {
    const name = key.substring(6);
    const constant =
      constants.find((item) => item.name === name && item.flowId) ||
      constants.find((item) => item.name === name);
    return {
      symbol: nodeTypeSymbols.const || "🔒",
      groupName: constant?.flowId ? "流程常量" : "项目常量",
      varName: name,
    };
  }

  if (key.startsWith("nodes.")) {
    const parts = key.split(".");
    if (parts.length >= 3) {
      const nodeId = parts[1];
      const varName = parts.slice(2).join(".");
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        return {
          symbol: nodeTypeSymbols[node.data.nodeType] || "📦",
          groupName: node.data.label,
          varName,
        };
      }
    }
  }

  // 🎯 检查是否为输出别名（不以 input./context./nodes. 开头的变量）
  // 别名格式: alias.field 或 alias
  const parts = key.split(".");
  const aliasName = parts[0];

  // 检查是否有节点使用了这个别名
  const aliasNode = nodes.find((n) => n.data.config?.outputAlias === aliasName);

  if (aliasNode) {
    const varName = parts.length > 1 ? parts.slice(1).join(".") : aliasName;
    return {
      symbol: nodeTypeSymbols.alias,
      groupName: `🏷️ ${aliasName}`,
      varName,
    };
  }

  // 如果没有匹配任何已知格式，返回 null
  return null;
};

// 创建变量标签的 HTML
const createVariableTagHTML = (
  key: string,
  displayInfo: VariableDisplayInfo | null
): string => {
  const label = displayInfo
    ? `${displayInfo.symbol} ${displayInfo.groupName} / ${displayInfo.varName}`
    : key;

  return `<span class="variable-tag-inline" contenteditable="false" data-variable-key="${key}">${label}</span>`;
};

/**
 * 在当前光标位置插入文本（替代 document.execCommand("insertText")）
 */
const insertTextAtSelection = (text: string): void => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  range.deleteContents();
  const textNode = document.createTextNode(text);
  range.insertNode(textNode);

  // 将光标移动到插入的文本之后
  range.setStartAfter(textNode);
  range.setEndAfter(textNode);
  selection.removeAllRanges();
  selection.addRange(range);
};

/**
 * 在当前光标位置插入 HTML（替代 document.execCommand("insertHTML")）
 */
const insertHTMLAtSelection = (html: string): void => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  range.deleteContents();

  // 创建临时容器解析 HTML
  const temp = document.createElement("div");
  temp.innerHTML = html;

  // 插入所有子节点
  const fragment = document.createDocumentFragment();
  let lastNode: Node | null = null;
  while (temp.firstChild) {
    lastNode = temp.firstChild;
    fragment.appendChild(lastNode);
  }
  range.insertNode(fragment);

  // 将光标移动到插入内容之后
  if (lastNode) {
    range.setStartAfter(lastNode);
    range.setEndAfter(lastNode);
    selection.removeAllRanges();
    selection.addRange(range);
  }
};

/**
 * 向前删除指定数量的字符（替代多次 document.execCommand("delete")）
 */
const deleteCharsBeforeCursor = (count: number): void => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || count <= 0) return;

  const range = selection.getRangeAt(0);

  // 获取光标所在的文本节点和偏移量
  let container = range.startContainer;
  let offset = range.startOffset;

  let remaining = count;

  while (remaining > 0 && container) {
    if (container.nodeType === Node.TEXT_NODE) {
      const textNode = container as Text;
      const charsToDelete = Math.min(remaining, offset);

      if (charsToDelete > 0) {
        textNode.deleteData(offset - charsToDelete, charsToDelete);
        offset -= charsToDelete;
        remaining -= charsToDelete;
      }

      if (remaining > 0) {
        // 需要继续向前删除，移动到前一个节点
        const prevNode = getPreviousTextNode(textNode);
        if (prevNode) {
          container = prevNode;
          offset = prevNode.length;
        } else {
          break;
        }
      }
    } else {
      // 如果不是文本节点，尝试移动到前一个文本节点
      const textNode = getLastTextNode(container);
      if (textNode) {
        container = textNode;
        offset = textNode.length;
      } else {
        break;
      }
    }
  }

  // 更新选区位置
  range.setStart(container, offset);
  range.setEnd(container, offset);
  selection.removeAllRanges();
  selection.addRange(range);
};

/**
 * 获取前一个文本节点
 */
const getPreviousTextNode = (node: Node): Text | null => {
  let current: Node | null = node;

  while (current) {
    if (current.previousSibling) {
      current = current.previousSibling;
      const lastText = getLastTextNode(current);
      if (lastText) return lastText;
    } else {
      current = current.parentNode;
      if (!current || current.nodeType === Node.DOCUMENT_NODE) return null;
    }
  }
  return null;
};

/**
 * 获取节点内的最后一个文本节点
 */
const getLastTextNode = (node: Node): Text | null => {
  if (node.nodeType === Node.TEXT_NODE) return node as Text;
  if (node.childNodes.length > 0) {
    for (let i = node.childNodes.length - 1; i >= 0; i--) {
      const result = getLastTextNode(node.childNodes[i]);
      if (result) return result;
    }
  }
  return null;
};

// 将原始值转换为 HTML（包含变量标签）
const valueToHTML = (
  value: string,
  nodes: FlowNode[],
  constants: ConstantDefinitionResponse[]
): string => {
  if (!value) return "";

  let html = "";
  const regex = /\{\{([^}]+)\}\}/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(value)) !== null) {
    // 添加变量前的纯文本
    if (match.index > lastIndex) {
      html += escapeHTML(value.substring(lastIndex, match.index));
    }
    // 添加变量标签
    const varKey = match[1];
    const displayInfo = parseVariableKey(varKey, nodes, constants);
    html += createVariableTagHTML(varKey, displayInfo);
    lastIndex = regex.lastIndex;
  }

  // 添加最后的纯文本
  if (lastIndex < value.length) {
    html += escapeHTML(value.substring(lastIndex));
  }

  return html;
};

// 从 HTML 提取原始值
const htmlToValue = (element: HTMLElement): string => {
  let value = "";

  element.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      value += node.textContent || "";
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.classList.contains("variable-tag-inline")) {
        const varKey = el.getAttribute("data-variable-key");
        if (varKey) {
          value += `{{${varKey}}}`;
        }
      } else {
        // 递归处理其他元素（如 br）
        if (el.tagName === "BR") {
          value += "\n";
        } else {
          value += htmlToValue(el);
        }
      }
    }
  });

  return value;
};

const escapeHTML = (text: string): string => {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
};

const VariableInput: React.FC<VariableInputProps> = ({
  value = "",
  onChange,
  placeholder,
  currentNodeId,
  multiline = false,
  disabled = false,
  className = "",
  showEnumPicker = true,
}) => {
  const { styles, cx } = useStyles();
  const {
    nodes,
    edges,
    selectedNode,
    reusableFlows,
    dataStructures,
    constants,
  } = useFlowStore();
  const { currentProject } = useProjectStore();
  const { options: enumOptions } = useEnumOptions(currentProject?.id);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedTagKey, setSelectedTagKey] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const isComposingRef = useRef(false);
  // 记录最后一次通过 onChange 发出的值，用于区分内部变化和外部变化
  const lastEmittedValueRef = useRef<string>(value);
  const isInitializedRef = useRef(false);
  // 记录当前编辑器的实时值（未防抖）
  const pendingValueRef = useRef<string>(value);

  const effectiveNodeId = currentNodeId || selectedNode?.id;

  // 防抖处理的 onChange，减少频繁的状态更新
  const debouncedOnChange = useDebouncedCallback(
    (newValue: string) => {
      lastEmittedValueRef.current = newValue;
      onChange?.(newValue);
    },
    150, // 150ms 延迟，在流畅性和响应性之间取得平衡
    { leading: false, trailing: true }
  );

  const variableGroups = useMemo(
    () =>
      buildAvailableVariables(
        effectiveNodeId,
        nodes as FlowNode[],
        edges,
        reusableFlows,
        dataStructures,
        constants
      ),
    [effectiveNodeId, nodes, edges, reusableFlows, dataStructures, constants]
  );

  const filteredGroups = useMemo(() => {
    if (!searchText) return variableGroups;

    const lowerSearch = searchText.toLowerCase();
    return variableGroups
      .map((group) => ({
        ...group,
        variables: group.variables.filter(
          (v) =>
            v.name.toLowerCase().includes(lowerSearch) ||
            v.label.toLowerCase().includes(lowerSearch) ||
            v.group.toLowerCase().includes(lowerSearch)
        ),
      }))
      .filter((group) => group.variables.length > 0);
  }, [variableGroups, searchText]);

  // 初始化和外部值变化时更新编辑器内容
  useEffect(() => {
    if (!editorRef.current) return;

    const currentEditorValue = htmlToValue(editorRef.current);

    // 首次挂载时初始化编辑器内容
    if (!isInitializedRef.current) {
      const html = valueToHTML(value, nodes as FlowNode[], constants);
      editorRef.current.innerHTML = html || "";
      lastEmittedValueRef.current = value;
      pendingValueRef.current = value;
      isInitializedRef.current = true;
      return;
    }

    // 如果外部传入的值与最后一次发出的值相同，说明是自己触发的更新，跳过
    if (value === lastEmittedValueRef.current) {
      return;
    }

    // 如果外部传入的值与待发送的值相同（防抖中），也跳过
    if (value === pendingValueRef.current) {
      return;
    }

    // 只有当外部传入的值与编辑器当前内容不同时才更新
    // 这样可以防止在多个输入框场景下互相干扰
    if (value !== currentEditorValue) {
      const html = valueToHTML(value, nodes as FlowNode[], constants);
      editorRef.current.innerHTML = html || "";
      lastEmittedValueRef.current = value;
      pendingValueRef.current = value;
    }
  }, [value, nodes, constants]);

  // 获取光标前的文本
  const getTextBeforeCursor = useCallback((): string => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return "";

    const range = selection.getRangeAt(0);
    const preRange = range.cloneRange();
    preRange.selectNodeContents(editorRef.current!);
    preRange.setEnd(range.startContainer, range.startOffset);

    const fragment = preRange.cloneContents();
    const div = document.createElement("div");
    div.appendChild(fragment);

    return htmlToValue(div);
  }, []);

  // 处理输入 - 使用防抖减少频繁的状态更新
  const handleInput = useCallback(() => {
    if (isComposingRef.current) return;

    const editor = editorRef.current;
    if (!editor) return;

    const newValue = htmlToValue(editor);
    // 保存当前值用于防抖比较
    pendingValueRef.current = newValue;
    // 使用防抖发出值变化
    debouncedOnChange(newValue);

    // 检测 {{ 触发下拉（这个需要即时响应，不需要防抖）
    const textBeforeCursor = getTextBeforeCursor();
    const lastOpenBrace = textBeforeCursor.lastIndexOf("{{");
    const lastCloseBrace = textBeforeCursor.lastIndexOf("}}");

    if (lastOpenBrace > lastCloseBrace) {
      const searchStr = textBeforeCursor.substring(lastOpenBrace + 2);
      setSearchText(searchStr);
      setDropdownOpen(true);
    } else {
      setDropdownOpen(false);
      setSearchText("");
    }
  }, [debouncedOnChange, getTextBeforeCursor]);

  const handleBlur = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const newValue = htmlToValue(editor);
    pendingValueRef.current = newValue;
    debouncedOnChange(newValue);
    debouncedOnChange.flush();
  }, [debouncedOnChange]);

  // 删除选中的标签
  const deleteSelectedTag = useCallback(() => {
    if (!selectedTagKey || !editorRef.current) return;

    const tag = editorRef.current.querySelector(
      `.variable-tag-inline[data-variable-key="${selectedTagKey}"]`
    );
    if (tag) {
      tag.remove();
      const newValue = htmlToValue(editorRef.current);
      lastEmittedValueRef.current = newValue;
      onChange?.(newValue);
      setSelectedTagKey(null);
    }
  }, [selectedTagKey, onChange]);

  // 处理粘贴事件 - 只粘贴纯文本
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      if (text) {
        insertTextAtSelection(text);
        // 粘贴后同步值
        const editor = editorRef.current;
        if (editor) {
          const newValue = htmlToValue(editor);
          lastEmittedValueRef.current = newValue;
          onChange?.(newValue);
        }
      }
    },
    [onChange]
  );

  // 处理键盘事件
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && dropdownOpen) {
        setDropdownOpen(false);
        e.preventDefault();
      }

      // 如果有选中的标签，按 Delete 或 Backspace 删除
      if (selectedTagKey && (e.key === "Delete" || e.key === "Backspace")) {
        e.preventDefault();
        deleteSelectedTag();
        return;
      }

      // 阻止回车（除非是多行模式）
      if (e.key === "Enter" && !multiline) {
        e.preventDefault();
      }
    },
    [dropdownOpen, multiline, selectedTagKey, deleteSelectedTag]
  );

  // 处理标签点击
  const handleEditorClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    // 点击标签时选中它
    if (target.classList.contains("variable-tag-inline")) {
      e.preventDefault();
      const key = target.getAttribute("data-variable-key");
      setSelectedTagKey(key);

      // 移除其他标签的选中状态
      editorRef.current
        ?.querySelectorAll(".variable-tag-inline")
        .forEach((el) => {
          el.classList.remove("selected");
        });
      target.classList.add("selected");
    } else {
      // 点击其他地方取消选中
      setSelectedTagKey(null);
      editorRef.current
        ?.querySelectorAll(".variable-tag-inline")
        .forEach((el) => {
          el.classList.remove("selected");
        });
    }
  }, []);

  // 在光标位置插入变量标签
  const insertVariableAtCursor = useCallback(
    (variable: SelectableVariable) => {
      const editor = editorRef.current;
      if (!editor) return;

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      // 找到并删除 {{ 及其后的搜索文本
      const textBeforeCursor = getTextBeforeCursor();
      const lastOpenBrace = textBeforeCursor.lastIndexOf("{{");
      if (lastOpenBrace === -1) return;

      // 需要删除的字符数: {{ + 搜索文本
      const charsToDelete = textBeforeCursor.length - lastOpenBrace;

      // 向前删除字符
      deleteCharsBeforeCursor(charsToDelete);

      // 创建变量标签元素
      const displayInfo = parseVariableKey(variable.key, nodes as FlowNode[], constants);
      const tagHTML = createVariableTagHTML(variable.key, displayInfo);

      // 插入标签
      insertHTMLAtSelection(tagHTML);

      // 同步值
      const newValue = htmlToValue(editor);
      lastEmittedValueRef.current = newValue;
      onChange?.(newValue);

      setDropdownOpen(false);
      setSearchText("");

      // 确保焦点在编辑器上
      editor.focus();
    },
    [nodes, constants, onChange, getTextBeforeCursor]
  );

  // 在光标位置插入文本
  const insertTextAtCursor = useCallback(
    (text: string) => {
      const editor = editorRef.current;
      if (!editor) return;

      editor.focus();
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        // 没有选区时，直接追加到编辑器末尾
        editor.appendChild(document.createTextNode(text));
      } else {
        // 使用现代 API 插入文本
        insertTextAtSelection(text);
      }

      const newValue = htmlToValue(editor);
      lastEmittedValueRef.current = newValue;
      onChange?.(newValue);
    },
    [onChange]
  );

  // 选择变量
  const handleSelectVariable = useCallback(
    (variable: SelectableVariable) => {
      insertVariableAtCursor(variable);
    },
    [insertVariableAtCursor]
  );

  // 渲染下拉菜单
  const renderDropdownContent = () => {
    if (filteredGroups.length === 0) {
      return (
        <div
          className={styles.dropdownEmpty}
          onMouseDown={(e) => e.preventDefault()}
        >
          <Empty
            description="没有找到匹配的变量"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      );
    }

    return (
      <div
        className={styles.dropdownContent}
        onMouseDown={(e) => e.preventDefault()}
      >
        {filteredGroups.map((group) => (
          <div key={group.name} className={styles.group}>
            <div className={styles.groupTitle}>
              <span className={styles.groupIcon}>
                {nodeTypeIcons[group.name] || nodeTypeIcons.context}
              </span>
              {group.name}
            </div>
            <div className={styles.groupItems}>
              {group.variables.map((variable) => (
                <div
                  key={variable.key}
                  className={styles.dropdownItem}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectVariable(variable);
                  }}
                >
                  <div className={styles.itemMain}>
                    <span className={styles.itemName}>{variable.name}</span>
                    <span className={styles.itemType}>
                      {formatTypeLabel(variable.type)}
                    </span>
                  </div>
                  <div className={styles.itemLabel}>{variable.label}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest(".variable-dropdown-content") &&
        !target.closest(".variable-input-wrapper")
      ) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  return (
    <div className={cx(styles.wrapper, className, disabled && "disabled")}>
      <Dropdown
        open={dropdownOpen && !disabled}
        trigger={[]}
        placement="bottomLeft"
        popupRender={() => renderDropdownContent()}
        rootClassName={styles.dropdown}
      >
        <div className={styles.container}>
          <div
            ref={editorRef}
            className={cx(
              styles.editor,
              multiline && "multiline",
              disabled && "disabled"
            )}
            contentEditable={!disabled}
            suppressContentEditableWarning
            onInput={disabled ? undefined : handleInput}
            onKeyDown={disabled ? undefined : handleKeyDown}
            onPaste={disabled ? undefined : handlePaste}
            onClick={disabled ? undefined : handleEditorClick}
            onBlur={disabled ? undefined : handleBlur}
            onCompositionStart={
              disabled
                ? undefined
                : () => {
                    isComposingRef.current = true;
                  }
            }
            onCompositionEnd={
              disabled
                ? undefined
                : () => {
                    isComposingRef.current = false;
                    handleInput();
                  }
            }
            data-placeholder={placeholder}
          />
        </div>
      </Dropdown>
      {showEnumPicker && (
        <div className={styles.enumRow}>
          <EnumValuePicker
            options={enumOptions}
            onSelect={insertTextAtCursor}
            className={styles.enumPicker}
            placeholder="枚举值"
            disabled={disabled || enumOptions.length === 0}
          />
        </div>
      )}
    </div>
  );
};

export default VariableInput;
