import React from "react";
import { useTranslation } from "react-i18next";
import {
  Drawer,
  Select,
  Input,
  Button,
  Empty,
  List,
  Avatar,
} from "antd";
import { AiOutlineRobot } from "react-icons/ai";
import { AiFlowSession, AiFlowMessageRecord } from "@/types";
import { useStyles } from "../styles";

interface StandardProvider {
  providerKey: string;
  enabled: boolean;
  hasKey: boolean;
  models?: string[];
}

interface CustomProvider {
  id: string;
  name: string;
  enabled: boolean;
  hasKey: boolean;
  models?: string[];
}

interface AiFlowDrawerProps {
  open: boolean;
  onClose: () => void;
  // 会话状态
  session: AiFlowSession | null;
  messages: AiFlowMessageRecord[];
  input: string;
  onInputChange: (value: string) => void;
  sending: boolean;
  regenerating: boolean;
  // 模型提供方
  providerType: "STANDARD" | "CUSTOM";
  onProviderTypeChange: (value: "STANDARD" | "CUSTOM") => void;
  providerKey: string;
  onProviderKeyChange: (value: string) => void;
  providerId?: string;
  onProviderIdChange: (value: string) => void;
  model: string;
  onModelChange: (value: string) => void;
  providersLoading: boolean;
  standardProviders: StandardProvider[];
  customProviders: CustomProvider[];
  // 操作
  onSend: () => void;
  onRegenerate: () => void;
  onNewSession: () => void;
  onOpenDslModal: () => void;
}

export const AiFlowDrawer: React.FC<AiFlowDrawerProps> = ({
  open,
  onClose,
  session,
  messages,
  input,
  onInputChange,
  sending,
  regenerating,
  providerType,
  onProviderTypeChange,
  providerKey,
  onProviderKeyChange,
  providerId,
  onProviderIdChange,
  model,
  onModelChange,
  providersLoading,
  standardProviders,
  customProviders,
  onSend,
  onRegenerate,
  onNewSession,
  onOpenDslModal,
}) => {
  const { styles } = useStyles();
  const { t } = useTranslation("flow");

  return (
    <Drawer
      title={t("aiDrawer.title")}
      open={open}
      onClose={onClose}
      size={520}
      styles={{ body: { padding: 16 } }}
    >
      <div className={styles.aiDrawerBody}>
        <div className={styles.aiConfigRow}>
          <Select
            style={{ minWidth: 120 }}
            value={providerType}
            onChange={(value) => onProviderTypeChange(value as "STANDARD" | "CUSTOM")}
            options={[
              { label: t("aiDrawer.standardModel"), value: "STANDARD" },
              { label: t("aiDrawer.customModel"), value: "CUSTOM" },
            ]}
          />
          {providerType === "STANDARD" && (
            <Select
              style={{ minWidth: 160 }}
              loading={providersLoading}
              value={providerKey}
              onChange={(value) => onProviderKeyChange(value)}
              options={standardProviders.map((provider) => ({
                label: provider.providerKey,
                value: provider.providerKey,
              }))}
              placeholder={t("aiDrawer.selectStandardProvider")}
            />
          )}
          {providerType === "CUSTOM" && (
            <Select
              style={{ minWidth: 160 }}
              loading={providersLoading}
              value={providerId}
              onChange={(value) => onProviderIdChange(value)}
              options={customProviders.map((provider) => ({
                label: provider.name,
                value: provider.id,
              }))}
              placeholder={t("aiDrawer.selectCustomProvider")}
            />
          )}
          <Input
            style={{ minWidth: 160 }}
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            placeholder={t("aiDrawer.modelPlaceholder")}
          />
          <Button onClick={onNewSession} disabled={sending || regenerating}>
            {t("aiDrawer.newSession")}
          </Button>
          <Button icon={<AiOutlineRobot />} onClick={onOpenDslModal}>
            {t("aiDrawer.dslEdit")}
          </Button>
        </div>

        <div className={styles.aiChatList}>
          {messages.length === 0 ? (
            <Empty description={t("aiDrawer.startDescribe")} />
          ) : (
            <List
              dataSource={messages}
              rowKey={(item) => item.id}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar>{item.role === "user" ? "U" : "A"}</Avatar>
                    }
                    title={
                      item.role === "user" ? t("aiDrawer.you") : t("aiDrawer.ai")
                    }
                    description={
                      <div
                        className={`${styles.aiMessageBubble} ${
                          item.role === "user" ? styles.aiMessageBubbleUser : ""
                        }`}
                      >
                        {item.content}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </div>

        <div className={styles.aiInputArea}>
          <Input.TextArea
            rows={4}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={t("aiDrawer.inputPlaceholder")}
          />
          <div className={styles.aiConfigRow}>
            <Button type="primary" loading={sending} onClick={onSend}>
              {t("aiDrawer.send")}
            </Button>
            <Button
              loading={regenerating}
              disabled={!session || sending}
              onClick={onRegenerate}
            >
              {t("aiDrawer.regenerate")}
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
};
