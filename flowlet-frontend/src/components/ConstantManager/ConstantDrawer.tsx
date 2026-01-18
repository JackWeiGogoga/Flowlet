import React, { useEffect, useMemo, useState } from "react";
import { Drawer, Form, Input, Select, Button, Radio, InputNumber } from "antd";
import { useTranslation } from "react-i18next";
import { message } from "@/components/AppMessageContext/staticMethods";
import constantService, {
  type ConstantDefinitionRequest,
  type ConstantDefinitionResponse,
  type ConstantValueType,
} from "@/services/constantService";
import { useStyles } from "./ConstantManager.style";

interface ConstantDrawerProps {
  open: boolean;
  onClose: () => void;
  onSaved: (constant: ConstantDefinitionResponse) => void;
  projectId: string;
  flowId?: string;
  flows?: { id: string; name: string }[];
  editingConstant?: ConstantDefinitionResponse | null;
}

export const ConstantDrawer: React.FC<ConstantDrawerProps> = ({
  open,
  onClose,
  onSaved,
  projectId,
  flowId,
  flows = [],
  editingConstant,
}) => {
  const { t } = useTranslation("dictionary");
  const { t: tCommon } = useTranslation("common");
  const { styles } = useStyles();
  const [form] = Form.useForm();
  const [valueType, setValueType] = useState<ConstantValueType>("string");
  const [saving, setSaving] = useState(false);

  const isEditing = !!editingConstant;

  const valueTypeOptions = useMemo(
    () => [
      { value: "string" as ConstantValueType, label: t("constant.drawer.types.string") },
      { value: "number" as ConstantValueType, label: t("constant.drawer.types.number") },
      { value: "boolean" as ConstantValueType, label: t("constant.drawer.types.boolean") },
      { value: "object" as ConstantValueType, label: t("constant.drawer.types.object") },
      { value: "array" as ConstantValueType, label: t("constant.drawer.types.array") },
    ],
    [t]
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    if (editingConstant) {
      setValueType(editingConstant.valueType);
      form.setFieldsValue({
        name: editingConstant.name,
        description: editingConstant.description,
        flowId: editingConstant.flowId || "",
        valueType: editingConstant.valueType,
        value:
          editingConstant.valueType === "object" ||
          editingConstant.valueType === "array"
            ? JSON.stringify(editingConstant.value, null, 2)
            : editingConstant.value,
      });
    } else {
      setValueType("string");
      form.resetFields();
      form.setFieldsValue({ flowId: flowId || "", valueType: "string" });
    }
  }, [open, editingConstant, flowId, form]);

  const scopeOptions = useMemo(() => {
    const baseOptions = [
      { value: "", label: t("constant.drawer.scopeProjectLevel") },
      ...flows.map((item) => ({
        value: item.id,
        label: t("constant.drawer.scopeFlowPrefix", { name: item.name }),
      })),
    ];
    if (flowId && !flows.find((item) => item.id === flowId)) {
      return [...baseOptions, { value: flowId, label: t("constant.drawer.scopeCurrentFlow") }];
    }
    return baseOptions;
  }, [flows, flowId, t]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      let parsedValue: unknown = values.value;
      if (valueType === "number") {
        if (values.value === undefined || values.value === null || values.value === "") {
          throw new Error(t("constant.message.numberRequired"));
        }
        parsedValue = Number(values.value);
        if (Number.isNaN(parsedValue)) {
          throw new Error(t("constant.message.numberInvalid"));
        }
      } else if (valueType === "boolean") {
        parsedValue = values.value;
      } else if (valueType === "object" || valueType === "array") {
        if (!values.value) {
          throw new Error(t("constant.message.jsonRequired"));
        }
        try {
          parsedValue = JSON.parse(values.value);
        } catch {
          throw new Error(t("constant.message.jsonInvalid"));
        }
        if (valueType === "object" && Array.isArray(parsedValue)) {
          throw new Error(t("constant.message.objectRequired"));
        }
        if (valueType === "array" && !Array.isArray(parsedValue)) {
          throw new Error(t("constant.message.arrayRequired"));
        }
      }

      const request: ConstantDefinitionRequest = {
        name: values.name,
        description: values.description,
        flowId: values.flowId || undefined,
        valueType,
        value: parsedValue,
      };

      let result: ConstantDefinitionResponse;
      if (isEditing && editingConstant) {
        result = await constantService.update(
          projectId,
          editingConstant.id,
          request
        );
        message.success(t("constant.message.updated"));
      } else {
        result = await constantService.create(projectId, request);
        message.success(t("constant.message.created"));
      }

      onSaved(result);
      onClose();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t("constant.message.saveFailed");
      message.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      title={isEditing ? t("constant.drawer.editTitle") : t("constant.drawer.createTitle")}
      open={open}
      onClose={onClose}
      size={520}
      footer={
        <div className={styles.drawerFooter}>
          <Button onClick={onClose}>{tCommon("cancel")}</Button>
          <Button type="primary" onClick={handleSubmit} loading={saving}>
            {isEditing ? tCommon("save") : tCommon("create")}
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label={t("constant.drawer.name")}
          rules={[
            { required: true, message: t("constant.drawer.nameRequired") },
            {
              pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
              message: t("constant.drawer.namePattern"),
            },
          ]}
        >
          <Input placeholder={t("constant.drawer.namePlaceholder")} />
        </Form.Item>

        <Form.Item name="description" label={t("constant.drawer.description")}>
          <Input.TextArea placeholder={t("constant.drawer.descriptionPlaceholder")} rows={2} />
        </Form.Item>

        <Form.Item name="flowId" label={t("constant.drawer.scope")}>
          <Select
            options={scopeOptions}
            placeholder={t("constant.drawer.scopePlaceholder")}
            disabled={isEditing}
          />
        </Form.Item>

        <Form.Item
          name="valueType"
          label={t("constant.drawer.valueType")}
          rules={[{ required: true, message: t("constant.drawer.valueTypeRequired") }]}
        >
          <Select
            options={valueTypeOptions}
            onChange={(next) => setValueType(next)}
          />
        </Form.Item>

        <Form.Item
          name="value"
          label={t("constant.drawer.value")}
          rules={[{ required: true, message: t("constant.drawer.valueRequired") }]}
        >
          {valueType === "number" ? (
            <InputNumber style={{ width: "100%" }} stringMode />
          ) : valueType === "boolean" ? (
            <Radio.Group>
              <Radio value={true}>true</Radio>
              <Radio value={false}>false</Radio>
            </Radio.Group>
          ) : valueType === "object" || valueType === "array" ? (
            <Input.TextArea
              rows={4}
              placeholder={
                valueType === "object"
                  ? t("constant.drawer.objectPlaceholder")
                  : t("constant.drawer.arrayPlaceholder")
              }
            />
          ) : (
            <Input placeholder={t("constant.drawer.stringPlaceholder")} />
          )}
        </Form.Item>
      </Form>
    </Drawer>
  );
};
