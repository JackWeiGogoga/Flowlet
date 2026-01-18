import React, { useEffect, useState } from "react";
import { Drawer, Form, Input, Button, Space } from "antd";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { message } from "@/components/AppMessageContext/staticMethods";
import enumService, {
  type EnumDefinition,
  type EnumRequest,
} from "@/services/enumService";

interface EnumDrawerProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  editingEnum?: EnumDefinition | null;
  onSaved: () => void;
}

const emptyValue = { value: "", label: "", description: "" };

export const EnumDrawer: React.FC<EnumDrawerProps> = ({
  open,
  onClose,
  projectId,
  editingEnum,
  onSaved,
}) => {
  const { t } = useTranslation("dictionary");
  const { t: tCommon } = useTranslation("common");
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const isEditing = !!editingEnum;

  useEffect(() => {
    if (!open) {
      return;
    }

    if (editingEnum) {
      form.setFieldsValue({
        name: editingEnum.name,
        description: editingEnum.description,
        values: editingEnum.values?.length ? editingEnum.values : [emptyValue],
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ values: [emptyValue] });
    }
  }, [open, editingEnum, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const request: EnumRequest = {
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        values: (values.values || [])
          .map((item: { value: string; label?: string; description?: string }) => ({
            value: item.value.trim(),
            label: item.label?.trim() || undefined,
            description: item.description?.trim() || undefined,
          }))
          .filter((item: { value: string }) => item.value),
      };

      if (request.values.length === 0) {
        message.error(t("enum.message.atLeastOneValue"));
        return;
      }

      setSaving(true);
      if (isEditing && editingEnum) {
        await enumService.update(projectId, editingEnum.id, request);
        message.success(t("enum.message.updated"));
      } else {
        await enumService.create(projectId, request);
        message.success(t("enum.message.created"));
      }

      onSaved();
      onClose();
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes("枚举不存在")) {
        message.error(error.message);
        return;
      }
      if (error) {
        message.error(t("enum.message.saveFailed"));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      title={isEditing ? t("enum.drawer.editTitle") : t("enum.drawer.createTitle")}
      open={open}
      onClose={onClose}
      size={520}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={onClose}>{tCommon("cancel")}</Button>
          <Button type="primary" loading={saving} onClick={handleSubmit}>
            {isEditing ? tCommon("save") : tCommon("create")}
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label={t("enum.drawer.name")}
          rules={[
            { required: true, message: t("enum.drawer.nameRequired") },
            {
              pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/,
              message: t("enum.drawer.namePattern"),
            },
          ]}
        >
          <Input placeholder={t("enum.drawer.namePlaceholder")} />
        </Form.Item>

        <Form.Item name="description" label={t("enum.drawer.description")}>
          <Input.TextArea placeholder={t("enum.drawer.descriptionPlaceholder")} rows={2} />
        </Form.Item>

        <Form.List name="values">
          {(fields, { add, remove }) => (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>{t("enum.drawer.enumValues")}</span>
                <Button
                  type="link"
                  icon={<FiPlus />}
                  onClick={() => add(emptyValue)}
                >
                  {t("enum.drawer.addValue")}
                </Button>
              </div>
              {fields.map((field, index) => (
                <Space
                  key={field.key}
                  style={{ display: "flex", marginBottom: 12 }}
                  align="start"
                >
                  <Form.Item
                    {...field}
                    name={[field.name, "value"]}
                    rules={[{ required: true, message: t("enum.drawer.valueRequired") }]}
                  >
                    <Input placeholder={t("enum.drawer.valuePlaceholder")} />
                  </Form.Item>
                  <Form.Item {...field} name={[field.name, "label"]}>
                    <Input placeholder={t("enum.drawer.labelPlaceholder")} />
                  </Form.Item>
                  <Form.Item {...field} name={[field.name, "description"]}>
                    <Input placeholder={t("enum.drawer.descPlaceholder")} />
                  </Form.Item>
                  <Button
                    type="text"
                    danger
                    icon={<FiTrash2 />}
                    onClick={() => remove(field.name)}
                    disabled={fields.length === 1 && index === 0}
                  />
                </Space>
              ))}
            </div>
          )}
        </Form.List>
      </Form>
    </Drawer>
  );
};
