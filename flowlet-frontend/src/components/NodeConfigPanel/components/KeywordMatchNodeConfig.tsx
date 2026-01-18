import React, { useEffect, useState } from "react";
import { Form, Select } from "antd";
import { createStyles } from "antd-style";
import { VariableInput } from "@/components/VariableInput";
import keywordService from "@/services/keywordService";
import { message } from "@/components/AppMessageContext/staticMethods";
import { useProjectStore } from "@/store/projectStore";

const useStyles = createStyles(({ css }) => ({
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
}));

const KeywordMatchNodeConfig: React.FC = () => {
  const { styles } = useStyles();
  const { currentProject } = useProjectStore();
  const [loading, setLoading] = useState(false);
  const [libraryOptions, setLibraryOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);

  useEffect(() => {
    const fetchLibraries = async () => {
      if (!currentProject?.id) {
        setLibraryOptions([]);
        return;
      }
      setLoading(true);
      try {
        const libraries = await keywordService.listLibraries({
          projectId: currentProject.id,
        });
        setLibraryOptions(
          libraries.map((library) => ({
            value: library.id,
            label: library.name,
          }))
        );
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "加载关键词库失败";
        message.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchLibraries();
  }, [currentProject?.id]);

  return (
    <div className={styles.section}>
      <Form.Item
        name="libraryId"
        label="关键词库"
        rules={[{ required: true, message: "请选择关键词库" }]}
      >
        <Select
          loading={loading}
          options={libraryOptions}
          placeholder="选择关键词库"
          showSearch
          optionFilterProp="label"
        />
      </Form.Item>

      <Form.Item
        name="textExpression"
        label="文本表达式"
        rules={[{ required: true, message: "请输入文本表达式" }]}
        extra="支持变量引用，如 {{input.content}}"
      >
        <VariableInput placeholder="{{input.content}}" />
      </Form.Item>
    </div>
  );
};

export default KeywordMatchNodeConfig;
