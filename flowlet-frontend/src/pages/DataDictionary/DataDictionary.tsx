import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Empty, Spin, Tabs, Typography } from "antd";
import { DataStructureManager } from "@/components/DataStructureManager";
import { EnumManager } from "@/components/EnumManager";
import { ConstantManager } from "@/components/ConstantManager";
import { message } from "@/components/AppMessageContext/staticMethods";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import { flowApi } from "@/services/flowService";
import { useProjectStore } from "@/store/projectStore";
import { useStyles } from "./DataDictionary.styles";

const { Title } = Typography;

const DataDictionary: React.FC = () => {
  const { t } = useTranslation("dictionary");
  const { styles } = useStyles();
  const { currentProject } = useProjectStore();
  const [flows, setFlows] = useState<{ id: string; name: string }[]>([]);
  const [loadingFlows, setLoadingFlows] = useState(false);

  useBreadcrumb([{ title: t("breadcrumb.dictionary"), path: "/dictionary" }], [t]);

  const loadFlows = useCallback(async () => {
    if (!currentProject?.id) {
      setFlows([]);
      return;
    }

    setLoadingFlows(true);
    try {
      const { data } = await flowApi.list(currentProject.id, 1, 200);
      setFlows(
        (data.data.records || []).map((flow) => ({
          id: flow.id,
          name: flow.name,
        }))
      );
    } catch {
      message.error(t("message.loadFlowsFailed"));
    } finally {
      setLoadingFlows(false);
    }
  }, [currentProject?.id, t]);

  useEffect(() => {
    loadFlows();
  }, [loadFlows]);

  const tabs = useMemo(
    () => [
      {
        key: "structures",
        label: t("tabs.structures"),
        children: currentProject?.id ? (
          <DataStructureManager
            projectId={currentProject.id}
            flows={flows}
          />
        ) : (
          <Empty description={t("empty.selectProject")} />
        ),
      },
      {
        key: "enums",
        label: t("tabs.enums"),
        children: currentProject?.id ? (
          <EnumManager projectId={currentProject.id} />
        ) : (
          <Empty description={t("empty.selectProject")} />
        ),
      },
      {
        key: "constants",
        label: t("tabs.constants"),
        children: currentProject?.id ? (
          <ConstantManager projectId={currentProject.id} flows={flows} />
        ) : (
          <Empty description={t("empty.selectProject")} />
        ),
      },
    ],
    [currentProject?.id, flows, t]
  );

  return (
    <div>
      <div className={styles.pageHeader}>
        <Title level={4} className={styles.title}>
          {t("pageTitle")}
        </Title>
      </div>
      <Spin spinning={loadingFlows}>
        <Tabs items={tabs} />
      </Spin>
    </div>
  );
};

export default DataDictionary;
