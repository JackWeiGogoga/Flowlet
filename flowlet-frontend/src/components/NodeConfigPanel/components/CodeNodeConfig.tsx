import React, { useEffect } from "react";
import { Form, Select, InputNumber, Switch, Collapse } from "antd";
import { createStyles } from "antd-style";
import { AiOutlineCode } from "react-icons/ai";
import type { CodeNodeConfig as CodeNodeConfigType } from "@/types";
import { useFlowStore } from "@/store/flowStore";
import { KeyValueEditor } from "./KeyValueEditor";
import Editor from "@monaco-editor/react";

const useStyles = createStyles(({ token, css }) => ({
  container: css`
    display: flex;
    flex-direction: column;
    gap: ${token.marginSM}px;
  `,
  codeEditor: css`
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadius}px;
    overflow: hidden;
    background: ${token.colorBgContainer};
  `,
  codeEditorInner: css`
    height: 280px;
  `,
  codeEditorLoading: css`
    height: 280px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeSM}px;
  `,
  tip: css`
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextSecondary};
  `,
}));

/**
 * Code 节点配置组件（Python）
 */
export const CodeNodeConfig: React.FC = () => {
  const { styles } = useStyles();
  const form = Form.useFormInstance();
  const selectedNode = useFlowStore((state) => state.selectedNode);
  const updateNode = useFlowStore((state) => state.updateNode);

  const defaultCode = `def run(inputs, context):\n    return {"ok": True}\n`;

  const language = Form.useWatch("language", {
    form,
    preserve: true,
  }) as CodeNodeConfigType["language"] | undefined;
  const codeValue = Form.useWatch("code", { form, preserve: true }) as
    | string
    | undefined;

  useEffect(() => {
    if (!selectedNode) return;
    const existingCode = selectedNode.data.config?.code;
    if (existingCode != null) {
      return;
    }
    const currentCode = form.getFieldValue("code");
    if (!currentCode) {
      form.setFieldValue("code", defaultCode);
      updateNode(selectedNode.id, {
        config: {
          ...selectedNode.data.config,
          language: "python",
          code: defaultCode,
          timeoutMs: selectedNode.data.config?.timeoutMs ?? 3000,
          memoryMb: selectedNode.data.config?.memoryMb ?? 128,
          allowNetwork: selectedNode.data.config?.allowNetwork ?? false,
        },
      });
    }
  }, [form, defaultCode, selectedNode, updateNode]);

  return (
    <div className={styles.container}>
      <Form.Item name="language" label="语言" initialValue="python">
        <Select options={[{ value: "python", label: "Python" }]} disabled />
      </Form.Item>

      <Form.Item
        name="code"
        label="代码"
        rules={[{ required: true, message: "请输入代码" }]}
        extra={
          <div className={styles.tip}>
            入口函数固定为 <code>run(inputs, context)</code>，返回值必须为 JSON
            可序列化对象。
          </div>
        }
      >
        <div className={styles.codeEditor}>
          <Editor
            language="python"
            theme="vs-light"
            value={codeValue || ""}
            onChange={(value) => {
              const nextCode = value ?? "";
              form.setFieldValue("code", nextCode);
              if (selectedNode) {
                updateNode(selectedNode.id, {
                  config: {
                    ...selectedNode.data.config,
                    code: nextCode,
                  },
                });
              }
            }}
            className={styles.codeEditorInner}
            height="280px"
            loading={
              <div className={styles.codeEditorLoading}>
                Loading editor...
              </div>
            }
            options={{
              fontSize: 13,
              minimap: { enabled: false },
              wordWrap: "on",
              scrollBeyondLastLine: false,
              tabSize: 4,
              automaticLayout: true,
            }}
          />
        </div>
      </Form.Item>

      <Form.Item
        name="inputs"
        label="代码入参"
        extra="左侧为变量名，右侧为变量表达式（支持 {{nodes.xxx}} 等）"
      >
        <KeyValueEditor
          keyPlaceholder="参数名（如 items）"
          valuePlaceholder="输入表达式或变量（如 {{nodes.api-1.body.data}}）"
        />
      </Form.Item>

      <Collapse
        ghost
        items={[
          {
            key: "runtime",
            label: (
              <span>
                <AiOutlineCode /> 执行配置
              </span>
            ),
            children: (
              <>
                <Form.Item
                  name="timeoutMs"
                  label="超时"
                  initialValue={3000}
                  extra="单次执行最大耗时（毫秒）"
                >
                  <InputNumber min={100} max={60000} step={100} />
                </Form.Item>
                <Form.Item
                  name="memoryMb"
                  label="内存限制"
                  initialValue={128}
                  extra="单次执行可用内存（MB）"
                >
                  <InputNumber min={64} max={2048} step={64} />
                </Form.Item>
                <Form.Item
                  name="allowNetwork"
                  label="允许网络访问"
                  valuePropName="checked"
                  extra="默认禁用，启用后可访问网络资源"
                >
                  <Switch />
                </Form.Item>
                {language === "python" && (
                  <div className={styles.tip}>
                    运行环境为受限 Python 沙箱，依赖包需预装。
                  </div>
                )}
              </>
            ),
          },
        ]}
      />
    </div>
  );
};

export default CodeNodeConfig;
