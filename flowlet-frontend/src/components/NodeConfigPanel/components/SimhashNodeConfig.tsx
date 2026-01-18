import React, { useEffect, useMemo, useState } from "react";
import { Form, Input, Select } from "antd";
import { createStyles } from "antd-style";
import { VariableInput } from "@/components/VariableInput";
import { message } from "@/components/AppMessageContext/staticMethods";
import { flowApi } from "@/services/flowService";
import { useProjectStore } from "@/store/projectStore";
import { useFlowStore } from "@/store/flowStore";

const useStyles = createStyles(({ css, token }) => ({
  section: css`
    display: flex;
    flex-direction: column;
    gap: 8px;

    .ant-form-item {
      margin-bottom: 8px;
    }

    .ant-form-item:last-child {
      margin-bottom: 0;
    }
  `,
  hint: css`
    color: ${token.colorTextSecondary};
    font-size: 12px;
    margin-top: 4px;
  `,
}));

const SimhashNodeConfig: React.FC = () => {
  const { styles } = useStyles();
  const form = Form.useFormInstance();
  const { currentProject } = useProjectStore();
  const flowId = useFlowStore((state) => state.flowId);
  const [flowsLoading, setFlowsLoading] = useState(false);
  const [flowOptions, setFlowOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);

  const mode = Form.useWatch("mode", { form, preserve: true }) as
    | "store"
    | "search"
    | "compute"
    | undefined;
  const targetFlowIds = Form.useWatch("targetFlowIds", {
    form,
    preserve: true,
  }) as string[] | undefined;

  useEffect(() => {
    if (!currentProject?.id) {
      setFlowOptions([]);
      return;
    }

    const fetchFlows = async () => {
      setFlowsLoading(true);
      try {
        const response = await flowApi.list(currentProject.id, 1, 200);
        if (response.data.code !== 200) {
          message.error(response.data.message || "获取流程列表失败");
          return;
        }
        const flows = response.data.data?.records || [];
        const options = flows.map((flow) => ({
          value: flow.id,
          label: flow.name,
        }));
        setFlowOptions(options);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "获取流程列表失败";
        message.error(errorMessage);
      } finally {
        setFlowsLoading(false);
      }
    };

    fetchFlows();
  }, [currentProject?.id]);

  useEffect(() => {
    if (mode !== "search" || !flowId) return;
    if (targetFlowIds && targetFlowIds.length > 0) return;
    form.setFieldValue("targetFlowIds", [flowId]);
  }, [mode, flowId, targetFlowIds, form]);

  const modeOptions = useMemo(
    () => [
      { value: "store", label: "计算并保存" },
      { value: "search", label: "相似检索" },
      { value: "compute", label: "仅计算" },
    ],
    []
  );

  return (
    <div className={styles.section}>
      <Form.Item
        name="mode"
        label="操作模式"
        rules={[{ required: true, message: "请选择操作模式" }]}
      >
        <Select options={modeOptions} />
      </Form.Item>

      <Form.Item
        name="textExpression"
        label="文本表达式"
        rules={[{ required: true, message: "请输入文本表达式" }]}
        extra="支持变量引用，如 {{input.content}}"
      >
        <VariableInput placeholder="{{input.content}}" />
      </Form.Item>

      {mode === "store" && (
        <>
          <Form.Item
            name="contentIdExpression"
            label="内容 ID 表达式"
            rules={[{ required: true, message: "请输入内容 ID" }]}
            extra="同项目内相同内容 ID 会覆盖更新"
          >
            <VariableInput placeholder="{{input.contentId}}" />
          </Form.Item>
          <Form.Item name="contentType" label="内容类型">
            <Input placeholder="如 news/article" />
          </Form.Item>
        </>
      )}

      {mode === "search" && (
        <>
          <Form.Item
            name="contentIdExpression"
            label="内容 ID 表达式（排除自身）"
            extra="可选，填入后会在结果中过滤自身内容"
          >
            <VariableInput placeholder="{{input.contentId}}" />
          </Form.Item>
          <Form.Item name="targetFlowIds" label="检索范围流程">
            <Select
              mode="multiple"
              loading={flowsLoading}
              options={flowOptions}
              placeholder="默认仅当前流程"
            />
          </Form.Item>
          <Form.Item
            name="maxDistance"
            label="海明距离阈值"
            rules={[{ required: true, message: "请输入距离阈值" }]}
          >
            <VariableInput placeholder="3 或 {{input.maxDistance}}" />
          </Form.Item>
          <div className={styles.hint}>
            💡 提示：分桶检索会筛选候选，再按海明距离精确过滤。
          </div>
        </>
      )}
    </div>
  );
};

export default SimhashNodeConfig;
