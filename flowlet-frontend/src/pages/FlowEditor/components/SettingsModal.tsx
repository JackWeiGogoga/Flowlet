import React from "react";
import { useTranslation } from "react-i18next";
import { Modal, Form, Input, Switch, Tooltip } from "antd";
import type { FormInstance } from "antd";

interface SettingsModalProps {
  open: boolean;
  onOk: () => void;
  onCancel: () => void;
  loading: boolean;
  form: FormInstance;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onOk,
  onCancel,
  loading,
  form,
}) => {
  const { t } = useTranslation("flow");
  const { t: tCommon } = useTranslation("common");

  return (
    <Modal
      title={t("settingsModal.title")}
      open={open}
      onOk={onOk}
      onCancel={() => {
        onCancel();
        form.resetFields();
      }}
      confirmLoading={loading}
      okText={tCommon("action.save")}
      cancelText={tCommon("action.cancel")}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label={t("settingsModal.name")}
          rules={[{ required: true, message: t("settingsModal.nameRequired") }]}
        >
          <Input placeholder={t("settingsModal.namePlaceholder")} />
        </Form.Item>
        <Form.Item name="description" label={t("settingsModal.desc")}>
          <Input.TextArea
            rows={4}
            placeholder={t("settingsModal.descPlaceholder")}
          />
        </Form.Item>
        <Form.Item
          name="isReusable"
          label={
            <Tooltip title={t("settingsModal.reusableTip")}>
              <span>{t("settingsModal.reusableLabel")}</span>
            </Tooltip>
          }
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
};
