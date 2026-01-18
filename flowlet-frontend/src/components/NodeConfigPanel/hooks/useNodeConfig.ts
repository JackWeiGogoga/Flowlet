import { useState, useRef, useEffect } from "react";
import { FormInstance } from "antd";
import { type Node } from "@xyflow/react";
import {
  FlowNodeData,
  InputVariable,
  StartNodeConfig,
  OutputVariableConfig,
  EndNodeConfig,
  NodeType,
  JsonParserNodeConfig,
} from "@/types";
import { useFlowStore } from "@/store/flowStore";

export interface UseNodeConfigReturn {
  selectedNode: Node<FlowNodeData> | null;
  form: FormInstance;
  variableModalOpen: boolean;
  editingVariable: InputVariable | undefined;
  outputVariableModalOpen: boolean;
  editingOutputVariable: OutputVariableConfig | undefined;
  authType: string | undefined;
  waitForCallback: boolean | undefined;
  callbackType: string | undefined;
  setVariableModalOpen: (open: boolean) => void;
  setEditingVariable: (variable: InputVariable | undefined) => void;
  setOutputVariableModalOpen: (open: boolean) => void;
  setEditingOutputVariable: (
    variable: OutputVariableConfig | undefined
  ) => void;
  handleValuesChange: (
    changed: unknown,
    allValues: Record<string, unknown>
  ) => void;
  handleDelete: () => void;
  getVariables: () => InputVariable[];
  handleVariableSave: (variable: InputVariable) => void;
  handleVariableDelete: (name: string) => void;
  handleVariableEdit: (variable: InputVariable) => void;
  handleDragEnd: (event: {
    active: { id: string | number };
    over: { id: string | number } | null;
  }) => void;
  // End 节点输出变量相关
  getOutputVariables: () => OutputVariableConfig[];
  handleOutputVariableSave: (variable: OutputVariableConfig) => void;
  handleOutputVariableDelete: (name: string) => void;
  handleOutputVariableEdit: (variable: OutputVariableConfig) => void;
  handleOutputVariableDragEnd: (event: {
    active: { id: string | number };
    over: { id: string | number } | null;
  }) => void;
  canDelete: boolean;
  getPanelTitle: () => string;
}

export const useNodeConfig = (form: FormInstance): UseNodeConfigReturn => {
  const { selectedNode, updateNode, deleteNode, setSelectedNode } =
    useFlowStore();
  const prevNodeIdRef = useRef<string | null>(null);
  // 用于标记是否是内部更新，避免 useEffect 用旧数据覆盖表单
  const isInternalUpdateRef = useRef(false);
  const [variableModalOpen, setVariableModalOpen] = useState(false);
  const [editingVariable, setEditingVariable] = useState<
    InputVariable | undefined
  >();
  // End 节点输出变量相关状态
  const [outputVariableModalOpen, setOutputVariableModalOpen] = useState(false);
  const [editingOutputVariable, setEditingOutputVariable] = useState<
    OutputVariableConfig | undefined
  >();

  // Kafka 配置相关的 watch - 这些需要在组件中通过 Form.useWatch 获取
  // 这里只返回 undefined，实际值在组件中处理
  const authType = undefined;
  const waitForCallback = undefined;
  const callbackType = undefined;

  useEffect(() => {
    if (selectedNode) {
      if (selectedNode.id !== prevNodeIdRef.current) {
        form.resetFields();
        prevNodeIdRef.current = selectedNode.id;
        // 只在节点切换时设置表单值
        form.setFieldsValue({
          label: selectedNode.data.label,
          description: selectedNode.data.description,
          ...selectedNode.data.config,
        });
      } else if (!isInternalUpdateRef.current) {
        // 同一个节点，且不是内部更新导致的变化
        // 这种情况通常是外部改变了节点数据（如撤销/重做）
        form.setFieldsValue({
          label: selectedNode.data.label,
          description: selectedNode.data.description,
          ...selectedNode.data.config,
        });
      }
      // 重置内部更新标记
      isInternalUpdateRef.current = false;
    } else {
      prevNodeIdRef.current = null;
      form.resetFields();
    }
  }, [selectedNode, form]);

  /**
   * 标准化 LLM 消息列表
   * 确保所有消息都有完整的 role 和 content.type 字段
   */
  const normalizeLlmMessages = (
    raw: unknown
  ): Array<{
    role: string;
    content: Array<{ type: string; text?: string; url?: string }>;
  }> => {
    if (!Array.isArray(raw)) return [];

    return raw
      .filter(
        (item): item is Record<string, unknown> =>
          item != null && typeof item === "object"
      )
      .map((message) => {
        // 确保 role 字段存在，默认为 user
        const roleValue =
          typeof message.role === "string" && message.role.trim()
            ? message.role.trim()
            : "user";
        const contentRaw = Array.isArray(message.content)
          ? message.content
          : [];

        const content = contentRaw
          .filter(
            (part): part is Record<string, unknown> =>
              part != null && typeof part === "object"
          )
          .map((partObj) => {
            // 推断类型：优先使用 type 字段，否则根据内容推断
            let type =
              typeof partObj.type === "string" ? partObj.type.trim() : "";
            if (!type) {
              // 如果没有 type 字段，根据存在的字段推断
              if (partObj.url || partObj.imageUrl || partObj.image_url) {
                type = "image_url";
              } else {
                type = "text";
              }
            }

            // 根据 type 只保留对应的字段
            if (type === "image_url") {
              let url = typeof partObj.url === "string" ? partObj.url : "";
              // 兼容旧格式
              if (!url && typeof partObj.imageUrl === "string") {
                url = partObj.imageUrl;
              }
              if (
                !url &&
                partObj.image_url &&
                typeof partObj.image_url === "object"
              ) {
                const imageUrlObj = partObj.image_url as Record<
                  string,
                  unknown
                >;
                if (typeof imageUrlObj.url === "string") {
                  url = imageUrlObj.url;
                }
              }
              return { type: "image_url", url };
            }
            // 默认为 text 类型
            const text = typeof partObj.text === "string" ? partObj.text : "";
            return { type: "text", text };
          });

        return { role: roleValue, content };
      });
  };

  const handleValuesChange = (
    changed: unknown,
    allValues: Record<string, unknown>
  ) => {
    if (!selectedNode) return;

    // 标记这是内部更新，避免 useEffect 用旧数据覆盖表单
    isInternalUpdateRef.current = true;

    const { label, description, ...formConfig } = allValues;
    const changedValues = (changed ?? {}) as Record<string, unknown>;
    const nextConfig = {
      ...selectedNode.data.config,
      ...formConfig,
    };

    if (selectedNode.data.nodeType === NodeType.JSON_PARSER) {
      const outputFieldsChanged = Object.prototype.hasOwnProperty.call(
        changedValues,
        "outputFields"
      );
      const outputFields = (formConfig as Record<string, unknown>).outputFields;
      const prevOutputFields = (
        selectedNode.data.config as JsonParserNodeConfig | undefined
      )?.outputFields;

      if (!outputFieldsChanged) {
        if (prevOutputFields !== undefined) {
          nextConfig.outputFields = prevOutputFields;
        } else {
          delete nextConfig.outputFields;
        }
      } else if (outputFields !== undefined && !Array.isArray(outputFields)) {
        if (prevOutputFields !== undefined) {
          nextConfig.outputFields = prevOutputFields;
        } else {
          delete nextConfig.outputFields;
        }
      }
    }

    if (selectedNode.data.nodeType === NodeType.LLM) {
      const normalized = normalizeLlmMessages(nextConfig.messages);
      if (normalized.length > 0 || Array.isArray(nextConfig.messages)) {
        nextConfig.messages = normalized;
      }
    }

    updateNode(selectedNode.id, {
      label: label as string,
      description: description as string,
      config: {
        ...nextConfig,
      },
    });
  };

  const handleDelete = () => {
    if (selectedNode) {
      deleteNode(selectedNode.id);
      setSelectedNode(null);
    }
  };

  const getVariables = (): InputVariable[] => {
    if (!selectedNode) return [];
    const config = selectedNode.data.config as StartNodeConfig | undefined;
    return config?.variables || [];
  };

  const handleVariableSave = (variable: InputVariable) => {
    if (!selectedNode) return;

    const currentVariables = getVariables();
    let newVariables: InputVariable[];

    if (editingVariable) {
      newVariables = currentVariables.map((v) =>
        v.name === editingVariable.name ? variable : v
      );
    } else {
      newVariables = [...currentVariables, variable];
    }

    updateNode(selectedNode.id, {
      config: {
        ...selectedNode.data.config,
        variables: newVariables,
      },
    });

    setVariableModalOpen(false);
    setEditingVariable(undefined);
  };

  const handleVariableDelete = (name: string) => {
    if (!selectedNode) return;

    const newVariables = getVariables().filter((v) => v.name !== name);
    updateNode(selectedNode.id, {
      config: {
        ...selectedNode.data.config,
        variables: newVariables,
      },
    });
  };

  const handleVariableEdit = (variable: InputVariable) => {
    setEditingVariable(variable);
    setVariableModalOpen(true);
  };

  const getPanelTitle = () => {
    if (!selectedNode) return "节点配置";
    return `节点配置 - ${selectedNode.data.label}`;
  };

  const handleDragEnd = (event: {
    active: { id: string | number };
    over: { id: string | number } | null;
  }) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const variables = getVariables();
      const oldIndex = variables.findIndex((v) => v.name === active.id);
      const newIndex = variables.findIndex((v) => v.name === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newVariables = [...variables];
        const [removed] = newVariables.splice(oldIndex, 1);
        newVariables.splice(newIndex, 0, removed);

        if (selectedNode) {
          updateNode(selectedNode.id, {
            config: {
              ...selectedNode.data.config,
              variables: newVariables,
            },
          });
        }
      }
    }
  };

  // ========== End 节点输出变量相关方法 ==========
  const getOutputVariables = (): OutputVariableConfig[] => {
    if (!selectedNode || selectedNode.data.nodeType !== NodeType.END) return [];
    const config = selectedNode.data.config as EndNodeConfig | undefined;
    return config?.outputVariables || [];
  };

  const handleOutputVariableSave = (variable: OutputVariableConfig) => {
    if (!selectedNode) return;

    const currentVariables = getOutputVariables();
    let newVariables: OutputVariableConfig[];

    if (editingOutputVariable) {
      newVariables = currentVariables.map((v) =>
        v.name === editingOutputVariable.name ? variable : v
      );
    } else {
      newVariables = [...currentVariables, variable];
    }

    updateNode(selectedNode.id, {
      config: {
        ...selectedNode.data.config,
        outputVariables: newVariables,
      },
    });
    form.setFieldValue("outputVariables", newVariables);

    setOutputVariableModalOpen(false);
    setEditingOutputVariable(undefined);
  };

  const handleOutputVariableDelete = (name: string) => {
    if (!selectedNode) return;

    const newVariables = getOutputVariables().filter((v) => v.name !== name);
    updateNode(selectedNode.id, {
      config: {
        ...selectedNode.data.config,
        outputVariables: newVariables,
      },
    });
    form.setFieldValue("outputVariables", newVariables);
  };

  const handleOutputVariableEdit = (variable: OutputVariableConfig) => {
    setEditingOutputVariable(variable);
    setOutputVariableModalOpen(true);
  };

  const handleOutputVariableDragEnd = (event: {
    active: { id: string | number };
    over: { id: string | number } | null;
  }) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const variables = getOutputVariables();
      const oldIndex = variables.findIndex((v) => v.name === active.id);
      const newIndex = variables.findIndex((v) => v.name === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newVariables = [...variables];
        const [removed] = newVariables.splice(oldIndex, 1);
        newVariables.splice(newIndex, 0, removed);

        if (selectedNode) {
          updateNode(selectedNode.id, {
            config: {
              ...selectedNode.data.config,
              outputVariables: newVariables,
            },
          });
          form.setFieldValue("outputVariables", newVariables);
        }
      }
    }
  };

  const canDelete = selectedNode
    ? !["start", "end"].includes(selectedNode.data.nodeType)
    : false;

  return {
    selectedNode,
    form,
    variableModalOpen,
    editingVariable,
    outputVariableModalOpen,
    editingOutputVariable,
    authType,
    waitForCallback,
    callbackType,
    setVariableModalOpen,
    setEditingVariable,
    setOutputVariableModalOpen,
    setEditingOutputVariable,
    handleValuesChange,
    handleDelete,
    getVariables,
    handleVariableSave,
    handleVariableDelete,
    handleVariableEdit,
    handleDragEnd,
    // End 节点输出变量
    getOutputVariables,
    handleOutputVariableSave,
    handleOutputVariableDelete,
    handleOutputVariableEdit,
    handleOutputVariableDragEnd,
    canDelete,
    getPanelTitle,
  };
};
