import React from "react";
import { useTranslation } from "react-i18next";
import { Drawer, Tabs } from "antd";
import { DataStructureManager } from "@/components/DataStructureManager";
import { ConstantManager } from "@/components/ConstantManager";

interface DataDictDrawerProps {
  open: boolean;
  onClose: () => void;
  projectId?: string;
  flowId?: string;
}

export const DataDictDrawer: React.FC<DataDictDrawerProps> = ({
  open,
  onClose,
  projectId,
  flowId,
}) => {
  const { t } = useTranslation("flow");

  return (
    <Drawer
      title={t("dataDictDrawer.title")}
      open={open}
      onClose={onClose}
      size={480}
      styles={{ body: { padding: 16 } }}
    >
      {projectId && (
        <Tabs
          items={[
            {
              key: "structures",
              label: t("dataDictDrawer.structures"),
              children: (
                <DataStructureManager
                  projectId={projectId}
                  flowId={flowId}
                  compact
                />
              ),
            },
            {
              key: "constants",
              label: t("dataDictDrawer.constants"),
              children: (
                <ConstantManager projectId={projectId} flowId={flowId} />
              ),
            },
          ]}
        />
      )}
    </Drawer>
  );
};
