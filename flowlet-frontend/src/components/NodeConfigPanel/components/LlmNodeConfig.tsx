import React, { useEffect, useMemo, useRef, useCallback } from "react";
import {
  Alert,
  Button,
  Divider,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Card,
  Space,
} from "antd";
import type { DefaultOptionType } from "antd/es/select";
import { createStyles } from "antd-style";
import { AiOutlineDelete, AiOutlinePlus } from "react-icons/ai";
import { VariableInput } from "@/components/VariableInput";
import { OutputAliasConfig } from "./OutputAliasConfig";
import { useModelHubStore, StandardProviderId } from "@/store/modelHubStore";
import { message } from "@/components/AppMessageContext/staticMethods";
import { useFlowStore } from "@/store/flowStore";
import IconMap from "@/components/LLMIcons";
import {
  STANDARD_PROVIDER_ICON_KEYS,
  STANDARD_PROVIDER_LABELS,
} from "@/config/llmProviders";

const useStyles = createStyles(({ css, token }) => ({
  section: css`
    display: flex;
    flex-direction: column;
    gap: 4px;

    .ant-form-item {
      margin-bottom: 8px;
    }

    .ant-form-item:last-child {
      margin-bottom: 0;
    }

    .ant-form-item-label {
      padding-bottom: 2px;
    }

    .ant-form-item-label > label {
      font-size: 12px;
      height: 22px;
    }

    .ant-form-item-extra {
      margin-top: 2px;
      font-size: 11px;
    }
  `,
  sectionTitle: css`
    font-size: 11px;
    font-weight: 500;
    color: ${token.colorTextSecondary};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  `,
  hint: css`
    color: ${token.colorTextTertiary};
    font-size: 11px;
    line-height: 1.4;
    margin-top: 4px;
  `,
  divider: css`
    margin: 8px 0 !important;
  `,
  messageCard: css`
    margin-bottom: 12px;
    border-radius: 8px;
    background: ${token.colorFillAlter};

    .ant-card-head {
      min-height: 36px;
      padding: 0 12px;
      border-bottom: 1px solid ${token.colorBorderSecondary};
    }

    .ant-card-head-title {
      padding: 8px 0;
      font-size: 12px;
    }

    .ant-card-extra {
      padding: 8px 0;
    }

    .ant-card-body {
      padding: 12px;
    }
  `,
  contentBlock: css`
    padding: 8px;
    background: ${token.colorBgContainer};
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: 6px;
    margin-bottom: 8px;

    &:last-child {
      margin-bottom: 0;
    }
  `,
  contentHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  `,
  contentTypeSelect: css`
    width: 120px;
  `,
  contentInput: css`
    width: 100%;
  `,
  addButton: css`
    font-size: 12px;
    height: 28px;
    padding: 0 10px;
  `,
  buttonGroup: css`
    display: flex;
    gap: 8px;
    margin-top: 8px;
  `,
  paramRow: css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;

    .ant-form-item {
      margin-bottom: 0;
    }
  `,
  providerOption: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
  `,
  providerOptionIcon: css`
    width: 12px;
    height: 12px;
  `,
  roleSelect: css`
    width: 120px;
  `,
}));

const MODEL_TYPE_LABELS: Record<string, string> = {
  text: "文本",
  multimodal: "多模态",
  embedding: "Embedding",
  image: "图像",
  audio: "音频",
  unknown: "其他",
};

type ModelSelectOption = { label: string; value: string };

interface ContentPart {
  type: "text" | "image_url";
  text?: string;
  url?: string;
}

interface Message {
  role: "user" | "assistant" | "system";
  content: ContentPart[];
}

/**
 * 单个内容块组件 - 完全受控，不依赖 Form.List 嵌套
 */
const ContentPartEditor: React.FC<{
  value: ContentPart;
  onChange: (value: ContentPart) => void;
  onDelete: () => void;
  styles: ReturnType<typeof useStyles>["styles"];
}> = ({ value, onChange, onDelete, styles }) => {
  const handleTypeChange = useCallback(
    (type: "text" | "image_url") => {
      onChange({
        type,
        text: type === "text" ? value.text || "" : undefined,
        url: type === "image_url" ? value.url || "" : undefined,
      });
    },
    [onChange, value.text, value.url]
  );

  const handleValueChange = useCallback(
    (newValue: string) => {
      if (value.type === "text") {
        onChange({ ...value, text: newValue });
      } else {
        onChange({ ...value, url: newValue });
      }
    },
    [onChange, value]
  );

  return (
    <div className={styles.contentBlock}>
      <div className={styles.contentHeader}>
        <Select
          size="small"
          value={value.type}
          onChange={handleTypeChange}
          className={styles.contentTypeSelect}
          options={[
            { label: "文本", value: "text" },
            { label: "图片 URL", value: "image_url" },
          ]}
        />
        <Button
          type="text"
          danger
          size="small"
          icon={<AiOutlineDelete />}
          onClick={onDelete}
        />
      </div>
      <VariableInput
        value={value.type === "text" ? value.text || "" : value.url || ""}
        onChange={handleValueChange}
        multiline={value.type === "text"}
        placeholder={
          value.type === "text" ? "输入消息内容..." : "输入图片 URL..."
        }
        className={styles.contentInput}
      />
    </div>
  );
};

/**
 * 单条消息编辑器 - 管理消息的 role 和多个 content parts
 */
const MessageEditor: React.FC<{
  index: number;
  value: Message;
  onChange: (value: Message) => void;
  onDelete: () => void;
  styles: ReturnType<typeof useStyles>["styles"];
}> = ({ index, value, onChange, onDelete, styles }) => {
  const handleRoleChange = useCallback(
    (role: "user" | "assistant" | "system") => {
      onChange({ ...value, role });
    },
    [onChange, value]
  );

  const handleContentChange = useCallback(
    (contentIndex: number, content: ContentPart) => {
      const newContent = [...value.content];
      newContent[contentIndex] = content;
      onChange({ ...value, content: newContent });
    },
    [onChange, value]
  );

  const handleContentDelete = useCallback(
    (contentIndex: number) => {
      const newContent = value.content.filter((_, i) => i !== contentIndex);
      onChange({ ...value, content: newContent });
    },
    [onChange, value]
  );

  const handleAddText = useCallback(() => {
    onChange({
      ...value,
      content: [...value.content, { type: "text", text: "" }],
    });
  }, [onChange, value]);

  const handleAddImage = useCallback(() => {
    onChange({
      ...value,
      content: [...value.content, { type: "image_url", url: "" }],
    });
  }, [onChange, value]);

  return (
    <Card
      size="small"
      className={styles.messageCard}
      title={
        <Space>
          <span>消息 {index + 1}</span>
          <Select
            size="small"
            value={value.role}
            onChange={handleRoleChange}
            className={styles.roleSelect}
            popupMatchSelectWidth={false}
            options={[
              { label: "user", value: "user" },
              { label: "assistant", value: "assistant" },
            ]}
          />
        </Space>
      }
      extra={
        <Button
          type="text"
          danger
          size="small"
          icon={<AiOutlineDelete />}
          onClick={onDelete}
        />
      }
    >
      {value.content.map((part, contentIndex) => (
        <ContentPartEditor
          key={contentIndex}
          value={part}
          onChange={(newPart) => handleContentChange(contentIndex, newPart)}
          onDelete={() => handleContentDelete(contentIndex)}
          styles={styles}
        />
      ))}
      <div className={styles.buttonGroup}>
        <Button
          type="dashed"
          size="small"
          icon={<AiOutlinePlus />}
          onClick={handleAddText}
          className={styles.addButton}
        >
          添加文本
        </Button>
        <Button
          type="dashed"
          size="small"
          icon={<AiOutlinePlus />}
          onClick={handleAddImage}
          className={styles.addButton}
        >
          添加图片
        </Button>
      </div>
    </Card>
  );
};

/**
 * 消息列表编辑器 - 作为受控组件与 Form.Item 配合
 */
const MessagesEditor: React.FC<{
  value?: Message[];
  onChange?: (value: Message[]) => void;
}> = ({ value = [], onChange }) => {
  const { styles } = useStyles();

  const handleMessageChange = useCallback(
    (index: number, message: Message) => {
      const newMessages = [...value];
      newMessages[index] = message;
      onChange?.(newMessages);
    },
    [value, onChange]
  );

  const handleMessageDelete = useCallback(
    (index: number) => {
      const newMessages = value.filter((_, i) => i !== index);
      onChange?.(newMessages);
    },
    [value, onChange]
  );

  const handleAddMessage = useCallback(() => {
    onChange?.([
      ...value,
      { role: "user", content: [{ type: "text", text: "" }] },
    ]);
  }, [value, onChange]);

  return (
    <div>
      {value.map((msg, index) => (
        <MessageEditor
          key={index}
          index={index}
          value={msg}
          onChange={(newMsg) => handleMessageChange(index, newMsg)}
          onDelete={() => handleMessageDelete(index)}
          styles={styles}
        />
      ))}
      <Button
        type="dashed"
        icon={<AiOutlinePlus />}
        onClick={handleAddMessage}
        className={styles.addButton}
      >
        添加消息
      </Button>
    </div>
  );
};

const LlmNodeConfig: React.FC = () => {
  const { styles } = useStyles();
  const form = Form.useFormInstance();
  const { selectedNode, updateNode } = useFlowStore();
  const { standardConfigs, customProviders, fetchProviders } =
    useModelHubStore();

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const providerType = Form.useWatch("providerType", {
    form,
    preserve: true,
  }) as "STANDARD" | "CUSTOM" | undefined;
  const providerKey = Form.useWatch("providerKey", {
    form,
    preserve: true,
  }) as StandardProviderId | undefined;
  const providerId = Form.useWatch("providerId", {
    form,
    preserve: true,
  }) as string | undefined;
  const model = Form.useWatch("model", {
    form,
    preserve: true,
  }) as string | undefined;
  const outputJsonEnabled = Form.useWatch("outputJsonEnabled", {
    form,
    preserve: true,
  }) as boolean | undefined;
  const outputJsonSample = Form.useWatch("outputJsonSample", {
    form,
    preserve: true,
  }) as string | undefined;

  const migrationDoneRef = useRef(false);

  const standardOptions = useMemo(
    () =>
      Object.values(standardConfigs)
        .filter((provider) => provider.enabled && provider.hasKey)
        .map((provider) => {
          const iconKey = STANDARD_PROVIDER_ICON_KEYS[provider.providerKey];
          const ProviderIcon = iconKey ? IconMap[iconKey] : undefined;
          const text = STANDARD_PROVIDER_LABELS[provider.providerKey];
          return {
            value: provider.providerKey,
            label: ProviderIcon ? (
              <span className={styles.providerOption}>
                <ProviderIcon className={styles.providerOptionIcon} />
                {text}
              </span>
            ) : (
              text
            ),
          };
        }),
    [standardConfigs, styles.providerOption, styles.providerOptionIcon]
  );

  const customOptions = useMemo(
    () =>
      customProviders
        .filter((provider) => provider.hasKey && provider.enabled)
        .map((provider) => ({
          value: provider.id,
          label: provider.name,
        })),
    [customProviders]
  );

  const activeStandard = providerKey ? standardConfigs[providerKey] : undefined;
  const activeCustom = providerId
    ? customProviders.find((provider) => provider.id === providerId)
    : undefined;

  const quickSelectOptions = useMemo<DefaultOptionType[]>(() => {
    if (providerType === "CUSTOM") {
      return (activeCustom?.models || []).map((value) => ({
        label: value,
        value,
      }));
    }
    if (providerType === "STANDARD") {
      const enabledModels = activeStandard?.models || [];
      const catalog = activeStandard?.modelCatalog || [];
      if (enabledModels.length === 0) {
        return activeStandard?.defaultModel
          ? [
              {
                label: activeStandard.defaultModel,
                value: activeStandard.defaultModel,
              },
            ]
          : [];
      }
      if (catalog.length === 0) {
        return enabledModels.map((value) => ({ label: value, value }));
      }
      const enabledSet = new Set(enabledModels);
      const filtered = catalog.filter((item) => enabledSet.has(item.id));
      const hasTyped = filtered.some((item) => item.type);
      if (!hasTyped) {
        return filtered.map((item) => ({ label: item.id, value: item.id }));
      }
      const groups = new Map<string, ModelSelectOption[]>();
      filtered.forEach((item) => {
        const key = item.type || "unknown";
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push({ label: item.id, value: item.id });
      });
      return Array.from(groups.entries()).map(([groupKey, options], index) => ({
        key: `group-${groupKey}-${index}`,
        label: MODEL_TYPE_LABELS[groupKey] || groupKey,
        options,
      }));
    }
    return [];
  }, [providerType, activeCustom, activeStandard]);

  const quickSelectValues = useMemo(() => {
    const values: string[] = [];
    quickSelectOptions.forEach((item) => {
      if ("options" in item && item.options) {
        item.options.forEach((option: DefaultOptionType) => {
          if (option.value) {
            values.push(option.value.toString());
          }
        });
      } else if (item.value) {
        values.push(item.value.toString());
      }
    });
    return values;
  }, [quickSelectOptions]);

  const defaultModel =
    providerType === "CUSTOM"
      ? activeCustom?.model || activeCustom?.models?.[0]
      : activeStandard?.defaultModel;

  useEffect(() => {
    if (!providerType) {
      const defaultType =
        standardOptions.length > 0
          ? "STANDARD"
          : customOptions.length > 0
          ? "CUSTOM"
          : "STANDARD";
      form.setFieldValue("providerType", defaultType);
    }
  }, [providerType, standardOptions, customOptions, form]);

  useEffect(() => {
    if (providerType === "STANDARD") {
      if (providerId) {
        form.setFieldValue("providerId", undefined);
      }
      if (!providerKey && standardOptions.length > 0) {
        form.setFieldValue("providerKey", standardOptions[0].value);
      }
    }
    if (providerType === "CUSTOM") {
      if (providerKey) {
        form.setFieldValue("providerKey", undefined);
      }
      if (!providerId && customOptions.length > 0) {
        form.setFieldValue("providerId", customOptions[0].value);
      }
    }
  }, [
    providerType,
    providerKey,
    providerId,
    standardOptions,
    customOptions,
    form,
  ]);

  useEffect(() => {
    if (!model && defaultModel) {
      form.setFieldValue("model", defaultModel);
    }
  }, [model, defaultModel, form]);

  /**
   * 规范化消息格式，确保所有消息都有正确的 role 和 content.type 字段
   */
  const normalizeMessagesData = (messages: unknown[]): Message[] => {
    return messages
      .filter(
        (msg): msg is Record<string, unknown> =>
          msg != null && typeof msg === "object"
      )
      .map((msg) => {
        // 确保 role 存在
        let role: "user" | "assistant" | "system" = "user";
        if (typeof msg.role === "string") {
          const r = msg.role.trim().toLowerCase();
          if (r === "assistant" || r === "system") {
            role = r;
          }
        }

        // 确保 content 是数组
        const rawContent = Array.isArray(msg.content) ? msg.content : [];
        const content: ContentPart[] = rawContent
          .filter(
            (part): part is Record<string, unknown> =>
              part != null && typeof part === "object"
          )
          .map((part) => {
            // 推断类型
            let type: "text" | "image_url" = "text";
            if (typeof part.type === "string") {
              type = part.type === "image_url" ? "image_url" : "text";
            } else if (part.url || part.imageUrl || part.image_url) {
              type = "image_url";
            }

            if (type === "image_url") {
              let url = "";
              if (typeof part.url === "string") {
                url = part.url;
              } else if (typeof part.imageUrl === "string") {
                url = part.imageUrl;
              } else if (part.image_url && typeof part.image_url === "object") {
                const imgObj = part.image_url as Record<string, unknown>;
                if (typeof imgObj.url === "string") {
                  url = imgObj.url;
                }
              }
              return { type: "image_url", url };
            }
            const text = typeof part.text === "string" ? part.text : "";
            return { type: "text", text };
          });

        return {
          role,
          content: content.length > 0 ? content : [{ type: "text", text: "" }],
        };
      });
  };

  // 数据迁移和规范化
  useEffect(() => {
    if (migrationDoneRef.current) return;
    migrationDoneRef.current = true;

    const currentMessages = form.getFieldValue("messages");

    // 如果已有 messages，检查并规范化格式
    if (Array.isArray(currentMessages) && currentMessages.length > 0) {
      const normalized = normalizeMessagesData(currentMessages);
      // 检查是否需要更新（是否有字段缺失）
      const needsUpdate = currentMessages.some(
        (msg: Record<string, unknown>, index: number) => {
          const normalizedMsg = normalized[index];
          if (!normalizedMsg) return true;
          if (!msg.role) return true;
          if (!Array.isArray(msg.content)) return true;
          return (msg.content as unknown[]).some((part) => {
            if (!part || typeof part !== "object") return true;
            if (!(part as Record<string, unknown>).type) return true;
            return false;
          });
        }
      );
      if (needsUpdate) {
        form.setFieldValue("messages", normalized);
      }
      return;
    }

    const currentUserPrompts = form.getFieldValue("userPrompts");
    const legacyUserPrompt = form.getFieldValue("userPrompt");
    const legacyPrompt = form.getFieldValue("prompt");
    const legacyImageUrls = form.getFieldValue("imageUrls");

    const prompts: string[] = [];
    if (Array.isArray(currentUserPrompts)) {
      currentUserPrompts.forEach((item) => {
        if (typeof item === "string" && item.trim()) {
          prompts.push(item.trim());
        }
      });
    }
    if (prompts.length === 0) {
      const legacy =
        typeof legacyUserPrompt === "string" && legacyUserPrompt.trim()
          ? legacyUserPrompt.trim()
          : typeof legacyPrompt === "string" && legacyPrompt.trim()
          ? legacyPrompt.trim()
          : "";
      if (legacy) {
        prompts.push(legacy);
      }
    }

    const imageUrls: string[] = [];
    if (Array.isArray(legacyImageUrls)) {
      legacyImageUrls.forEach((item) => {
        if (typeof item === "string" && item.trim()) {
          imageUrls.push(item.trim());
        }
      });
    } else if (typeof legacyImageUrls === "string" && legacyImageUrls.trim()) {
      imageUrls.push(legacyImageUrls.trim());
    }

    const nextMessages: Message[] = [];

    prompts.forEach((prompt) => {
      nextMessages.push({
        role: "user",
        content: [{ type: "text", text: prompt }],
      });
    });

    if (imageUrls.length > 0) {
      if (nextMessages.length === 0) {
        nextMessages.push({
          role: "user",
          content: imageUrls.map((url) => ({ type: "image_url", url })),
        });
      } else {
        nextMessages[0].content.push(
          ...imageUrls.map((url) => ({ type: "image_url" as const, url }))
        );
      }
    }

    if (nextMessages.length > 0) {
      form.setFieldValue("messages", nextMessages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showProviderWarning =
    standardOptions.length === 0 && customOptions.length === 0;

  const normalizeJsonSample = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }

    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenceMatch?.[1]) {
      return fenceMatch[1].trim();
    }

    return trimmed;
  };

  const handleParseJsonSample = () => {
    const sample = outputJsonSample || "";
    if (!sample.trim()) {
      message.warning("请先输入 JSON 示例");
      return;
    }

    const normalized = normalizeJsonSample(sample);
    try {
      const parsed = JSON.parse(normalized);
      let target = parsed;

      if (Array.isArray(parsed)) {
        if (parsed.length === 0 || typeof parsed[0] !== "object") {
          message.warning("示例 JSON 需要是对象或对象数组");
          return;
        }
        target = parsed[0];
      }

      if (!target || typeof target !== "object") {
        message.warning("示例 JSON 需要是对象");
        return;
      }

      const keys = Object.keys(target as Record<string, unknown>);
      if (keys.length === 0) {
        message.warning("示例 JSON 没有可用字段");
        return;
      }

      form.setFieldValue("outputJsonFields", keys);
      if (selectedNode) {
        const { label, description, ...formConfig } = form.getFieldsValue(true);
        updateNode(selectedNode.id, {
          label: label as string,
          description: description as string,
          config: {
            ...selectedNode.data.config,
            ...formConfig,
            outputJsonFields: keys,
          },
        });
      }
      message.success(`已生成 ${keys.length} 个字段`);
    } catch {
      message.error("JSON 解析失败，请检查格式");
    }
  };

  return (
    <div className={styles.section}>
      {showProviderWarning && (
        <Alert
          type="warning"
          showIcon
          title="还没有可用的模型提供方"
          description="请先在系统设置中配置并启用模型提供方。"
        />
      )}

      <div>
        <div className={styles.sectionTitle}>模型提供方</div>
        <Form.Item
          name="providerType"
          label="提供方类型"
          initialValue="STANDARD"
          rules={[{ required: true, message: "请选择提供方类型" }]}
        >
          <Select
            options={[
              { label: "标准提供方", value: "STANDARD" },
              { label: "自定义提供方", value: "CUSTOM" },
            ]}
          />
        </Form.Item>
        {providerType === "STANDARD" && (
          <Form.Item
            name="providerKey"
            label="标准提供方"
            rules={[{ required: true, message: "请选择提供方" }]}
          >
            <Select
              placeholder="选择已配置的标准提供方"
              options={standardOptions}
            />
          </Form.Item>
        )}
        {providerType === "CUSTOM" && (
          <Form.Item
            name="providerId"
            label="自定义提供方"
            rules={[{ required: true, message: "请选择提供方" }]}
          >
            <Select
              placeholder="选择已配置的自定义提供方"
              options={customOptions}
            />
          </Form.Item>
        )}
        <Form.Item
          name="model"
          label="模型"
          extra={defaultModel ? "留空将使用提供方默认模型" : "请输入模型 ID"}
        >
          <Input placeholder="如 gpt-4o / claude-3.5-sonnet" />
        </Form.Item>
        {quickSelectOptions.length > 0 && (
          <Form.Item label="快速选择">
            <Select
              placeholder="选择已有模型"
              options={quickSelectOptions}
              onChange={(value) => {
                form.setFieldValue("model", value);
                if (selectedNode) {
                  const { label, description, ...formConfig } =
                    form.getFieldsValue(true);
                  updateNode(selectedNode.id, {
                    label: label as string,
                    description: description as string,
                    config: {
                      ...selectedNode.data.config,
                      ...formConfig,
                      model: value,
                    },
                  });
                }
              }}
              allowClear
              showSearch
              value={
                quickSelectValues.includes(model || "") ? model : undefined
              }
            />
          </Form.Item>
        )}
      </div>

      <Divider className={styles.divider} />

      <div>
        <div className={styles.sectionTitle}>消息</div>
        <Form.Item name="systemPrompt" label="System Prompt">
          <VariableInput
            multiline
            placeholder="定义系统角色与行为约束，可使用 {{变量}}"
          />
        </Form.Item>
        <Form.Item name="userPrompt" hidden>
          <Input />
        </Form.Item>
        <Form.Item
          name="messages"
          label="消息列表"
          tooltip="按消息组织内容，支持 text 与 image_url 混合"
          rules={[
            {
              validator: async (_, value) => {
                const messages = (value as Message[]) || [];
                const hasValid = messages.some((message) => {
                  return message.content.some((part) => {
                    if (part.type === "text") {
                      return part.text && part.text.trim();
                    }
                    if (part.type === "image_url") {
                      return part.url && part.url.trim();
                    }
                    return false;
                  });
                });
                if (!hasValid) {
                  return Promise.reject(new Error("请至少配置一条消息内容"));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <MessagesEditor />
        </Form.Item>
        <div className={styles.hint}>
          内容块支持变量，例如 {"{{input.imageUrl}}"}
        </div>
      </div>

      <Divider className={styles.divider} />

      <div>
        <div className={styles.sectionTitle}>生成参数</div>
        <div className={styles.paramRow}>
          <Form.Item name="temperature" label="Temperature" initialValue={0.7}>
            <InputNumber min={0} max={2} step={0.1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="topP" label="Top P" initialValue={1}>
            <InputNumber
              min={0}
              max={1}
              step={0.05}
              style={{ width: "100%" }}
            />
          </Form.Item>
        </div>
        <div className={styles.paramRow}>
          <Form.Item name="maxTokens" label="Max Tokens" initialValue={1024}>
            <InputNumber min={1} max={8192} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="timeoutMs" label="超时 (ms)" initialValue={60000}>
            <InputNumber min={1000} max={300000} style={{ width: "100%" }} />
          </Form.Item>
        </div>
        <div className={styles.hint}>
          提示词中可引用变量：{"{{input.query}}"} 或 {"{{nodes.xxx.body}}"}
        </div>
      </div>

      <Divider className={styles.divider} />

      <div>
        <div className={styles.sectionTitle}>输出变量</div>
        <Form.Item
          name="outputJsonEnabled"
          label="JSON 格式化输出"
          valuePropName="checked"
          extra="开启后可将模型返回的 JSON 字段拆分为独立输出变量"
        >
          <Switch />
        </Form.Item>
        {outputJsonEnabled && (
          <>
            <Form.Item
              label="JSON 字段"
              required
              tooltip="配置需要解析输出的字段名（按 JSON 顶层字段匹配）"
            >
              <Form.List
                name="outputJsonFields"
                rules={[
                  {
                    validator: async (_, value) => {
                      const fields = (value as string[] | undefined) || [];
                      const hasValid = fields.some(
                        (field) => field && field.trim()
                      );
                      if (!hasValid) {
                        return Promise.reject(
                          new Error("请至少配置一个输出字段")
                        );
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                {(fields, { add, remove }, { errors }) => (
                  <div>
                    {fields.map((field, index) => {
                      const { key, name, ...restField } = field;
                      return (
                        <div
                          key={key}
                          style={{
                            display: "flex",
                            gap: 8,
                            marginBottom: 8,
                            alignItems: "center",
                          }}
                        >
                          <Form.Item
                            {...restField}
                            name={name}
                            rules={[
                              { required: true, message: "请输入字段名" },
                            ]}
                            style={{ flex: 1, marginBottom: 0 }}
                          >
                            <Input placeholder={`字段 ${index + 1}`} />
                          </Form.Item>
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<AiOutlineDelete />}
                            onClick={() => remove(name)}
                          />
                        </div>
                      );
                    })}
                    <Button
                      type="dashed"
                      icon={<AiOutlinePlus />}
                      onClick={() => add("")}
                      className={styles.addButton}
                    >
                      添加字段
                    </Button>
                    <Form.ErrorList errors={errors} />
                  </div>
                )}
              </Form.List>
            </Form.Item>
            <Form.Item
              name="outputJsonSample"
              label="JSON 示例"
              extra="粘贴 JSON 示例后点击解析，自动生成字段列表"
            >
              <Input.TextArea
                rows={4}
                placeholder={`例如:\n{\n  "title": "示例",\n  "score": 0.85\n}`}
              />
            </Form.Item>
            <Button
              type="default"
              onClick={handleParseJsonSample}
              className={styles.addButton}
            >
              解析示例生成字段
            </Button>
          </>
        )}
      </div>

      <OutputAliasConfig />
    </div>
  );
};

export default LlmNodeConfig;
