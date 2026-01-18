import React from "react";
import { Modal, Form, Input, InputNumber, Switch, Button, Space } from "antd";
import {
  AiOutlineFontSize,
  AiOutlineAlignLeft,
  AiOutlineUnorderedList,
  AiOutlineNumber,
  AiOutlinePlus,
  AiOutlineMinusCircle,
  AiOutlineDatabase,
} from "react-icons/ai";
import { createStyles } from "antd-style";
import { InputVariable, VariableType } from "@/types";
import { DataStructureSelector } from "@/components/DataStructureManager";
import { useProjectStore } from "@/store/projectStore";
import { useFlowStore } from "@/store/flowStore";

const useStyles = createStyles(({ css }) => ({
  form: css`
    padding-top: 16px;
  `,

  typeSelector: css`
    display: flex;
    gap: 12px;
  `,

  typeItem: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 90px;
    height: 70px;
    border: 1px solid #d9d9d9;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      border-color: #1677ff;
      color: #1677ff;
    }

    &.selected {
      border-color: #1677ff;
      background-color: #e6f4ff;
      color: #1677ff;
    }
  `,

  typeIcon: css`
    font-size: 24px;
    margin-bottom: 4px;
  `,

  typeLabel: css`
    font-size: 12px;
  `,

  // 变量列表样式
  variableList: css`
    margin-top: 8px;
  `,

  variableItem: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: #fafafa;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
    margin-bottom: 8px;
    transition: all 0.2s;

    &:hover {
      background: #f5f5f5;
      border-color: #d9d9d9;
    }

    &:hover .variable-actions {
      opacity: 1;
    }
  `,

  variableInfo: css`
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
  `,

  variableIcon: css`
    color: #1677ff;
    font-size: 14px;
  `,

  variableName: css`
    font-family: monospace;
    color: #1677ff;
    background: #e6f4ff;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
  `,

  variableLabel: css`
    color: #666;
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,

  variableRequired: css`
    color: #ff4d4f;
    font-size: 11px;
    margin-left: 4px;
  `,

  variableActions: css`
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s;
  `,

  addVariableBtn: css`
    margin-top: 8px;
  `,

  emptyVariables: css`
    text-align: center;
    padding: 24px 0;
    color: #999;
  `,
}));

interface AddVariableModalProps {
  open: boolean;
  editingVariable?: InputVariable;
  existingNames: string[];
  onOk: (variable: InputVariable) => void;
  onCancel: () => void;
}

interface ModalContentProps {
  editingVariable?: InputVariable;
  existingNames: string[];
  onOk: (variable: InputVariable) => void;
  onCancel: () => void;
}

const variableTypes = [
  { type: VariableType.TEXT, label: "文本", icon: <AiOutlineFontSize /> },
  { type: VariableType.PARAGRAPH, label: "段落", icon: <AiOutlineAlignLeft /> },
  {
    type: VariableType.SELECT,
    label: "下拉选项",
    icon: <AiOutlineUnorderedList />,
  },
  { type: VariableType.NUMBER, label: "数字", icon: <AiOutlineNumber /> },
  { type: VariableType.STRUCTURE, label: "数据结构", icon: <AiOutlineDatabase /> },
];

/**
 * 表单内容组件 - 使用 key 控制重新初始化
 */
const ModalContent: React.FC<ModalContentProps> = ({
  editingVariable,
  existingNames,
  onOk,
  onCancel,
}) => {
  const { styles, cx } = useStyles();
  const currentProject = useProjectStore((state) => state.currentProject);
  const flowId = useFlowStore((state) => state.flowId);
  const [form] = Form.useForm();
  // 初始化时直接从 props 计算初始值
  const [selectedType, setSelectedType] = React.useState<VariableType>(
    () => editingVariable?.type ?? VariableType.TEXT
  );

  // 仅在组件挂载时初始化表单（由于使用了 key，每次打开都会重新挂载）
  React.useEffect(() => {
    if (editingVariable) {
      form.setFieldsValue(editingVariable);
    } else {
      form.setFieldsValue({
        type: VariableType.TEXT,
        required: true,
        maxLength: 48,
      });
    }
  }, [editingVariable, form]);

  const handleTypeSelect = (type: VariableType) => {
    setSelectedType(type);
    form.setFieldsValue({ type });
    if (type !== VariableType.STRUCTURE) {
      form.setFieldsValue({ structureRef: undefined });
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      onOk({
        ...values,
        type: selectedType,
      });
    } catch {
      // 表单验证失败
    }
  };

  const validateVariableName = (_: unknown, value: string) => {
    if (!value) {
      return Promise.reject(new Error("请输入变量名称"));
    }
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
      return Promise.reject(
        new Error("变量名称只能包含字母、数字和下划线，且不能以数字开头")
      );
    }
    // 编辑时，如果名称没变，不需要检查重复
    if (editingVariable && editingVariable.name === value) {
      return Promise.resolve();
    }
    if (existingNames.includes(value)) {
      return Promise.reject(new Error("变量名称已存在"));
    }
    return Promise.resolve();
  };

  return (
    <Form form={form} layout="vertical" className={styles.form}>
      {/* 类型选择 */}
      <Form.Item label="字段类型" required>
        <div className={styles.typeSelector}>
          {variableTypes.map(({ type, label, icon }) => (
            <div
              key={type}
              className={cx(
                styles.typeItem,
                selectedType === type && "selected"
              )}
              onClick={() => handleTypeSelect(type)}
            >
              <span className={styles.typeIcon}>{icon}</span>
              <span className={styles.typeLabel}>{label}</span>
            </div>
          ))}
        </div>
      </Form.Item>

      <Form.Item name="type" hidden>
        <Input />
      </Form.Item>

      <Form.Item
        name="name"
        label="变量名称"
        rules={[
          {
            required: true,
            message: "请输入变量名称",
            validator: validateVariableName,
          },
        ]}
        extra="用于在表达式中引用，如 {{name}}"
      >
        <Input placeholder="请输入变量名称" />
      </Form.Item>

      <Form.Item
        name="label"
        label="显示名称"
        rules={[{ required: true, message: "请输入显示名称" }]}
      >
        <Input placeholder="请输入显示名称" />
      </Form.Item>

      <Form.Item name="description" label="描述">
        <Input placeholder="变量描述（可选）" />
      </Form.Item>

      {/* 文本和段落类型的额外配置 */}
      {(selectedType === VariableType.TEXT ||
        selectedType === VariableType.PARAGRAPH) && (
        <Form.Item name="maxLength" label="最大长度" initialValue={48}>
          <InputNumber min={1} max={1000000} style={{ width: "100%" }} />
        </Form.Item>
      )}

      {/* 数字类型的额外配置 */}
      {selectedType === VariableType.NUMBER && (
        <Space style={{ width: "100%" }}>
          <Form.Item name="min" label="最小值">
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="max" label="最大值">
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
        </Space>
      )}

      {/* 数据结构类型配置 */}
      {selectedType === VariableType.STRUCTURE && (
        <Form.Item
          name="structureRef"
          label="数据结构"
          rules={[{ required: true, message: "请选择数据结构" }]}
        >
          <DataStructureSelector
            projectId={currentProject?.id || ""}
            flowId={flowId || undefined}
            placeholder="选择全局或流程数据结构"
            disabled={!currentProject?.id}
            allowClear={false}
            showFullName
          />
        </Form.Item>
      )}

      {/* 下拉选项配置 */}
      {selectedType === VariableType.SELECT && (
        <Form.Item label="选项列表">
          <Form.List name="options">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space
                    key={key}
                    style={{ display: "flex", marginBottom: 8 }}
                    align="baseline"
                  >
                    <Form.Item
                      {...restField}
                      name={[name, "label"]}
                      rules={[{ required: true, message: "请输入选项名称" }]}
                    >
                      <Input placeholder="选项名称" />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, "value"]}
                      rules={[{ required: true, message: "请输入选项值" }]}
                    >
                      <Input placeholder="选项值" />
                    </Form.Item>
                    <AiOutlineMinusCircle onClick={() => remove(name)} />
                  </Space>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add()}
                  block
                  icon={<AiOutlinePlus />}
                >
                  添加选项
                </Button>
              </>
            )}
          </Form.List>
        </Form.Item>
      )}

      <Form.Item name="defaultValue" label="默认值">
        {selectedType === VariableType.NUMBER ? (
          <InputNumber style={{ width: "100%" }} placeholder="默认值（可选）" />
        ) : selectedType === VariableType.STRUCTURE ? (
          <Input.TextArea
            rows={3}
            placeholder="默认值 JSON（可选）"
          />
        ) : selectedType === VariableType.PARAGRAPH ? (
          <Input.TextArea rows={3} placeholder="默认值（可选）" />
        ) : (
          <Input placeholder="默认值（可选）" />
        )}
      </Form.Item>

      <Form.Item
        name="required"
        label="必填"
        valuePropName="checked"
        initialValue={true}
      >
        <Switch />
      </Form.Item>

      {/* 底部按钮 */}
      <div style={{ textAlign: "right", marginTop: 16 }}>
        <Space>
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" onClick={handleSubmit}>
            保存
          </Button>
        </Space>
      </div>
    </Form>
  );
};

/**
 * 添加/编辑变量弹窗
 */
const AddVariableModal: React.FC<AddVariableModalProps> = ({
  open,
  editingVariable,
  existingNames,
  onOk,
  onCancel,
}) => {
  // 使用状态记录打开次数，用于生成唯一 key
  const [openCount, setOpenCount] = React.useState(0);

  // 当 modal 打开时递增计数器
  React.useEffect(() => {
    if (open) {
      setOpenCount((c) => c + 1);
    }
  }, [open]);

  const contentKey = `${editingVariable?.name ?? "new"}-${openCount}`;

  return (
    <Modal
      title={editingVariable ? "编辑变量" : "添加变量"}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={480}
      destroyOnHidden
    >
      {open && (
        <ModalContent
          key={contentKey}
          editingVariable={editingVariable}
          existingNames={existingNames}
          onOk={onOk}
          onCancel={onCancel}
        />
      )}
    </Modal>
  );
};

export default AddVariableModal;
