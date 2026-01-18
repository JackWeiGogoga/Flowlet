import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Table,
  Tag,
  Button,
  Space,
  Typography,
  Select,
  Flex,
} from "antd";
import { message } from "@/components/AppMessageContext/staticMethods";
import { AiOutlineReload, AiOutlineEye } from "react-icons/ai";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { createStyles } from "antd-style";
import { TimeRangeFilter, TimeRange } from "@/components/TimeRangeFilter";
import { ExecutionStatusTag } from "@/components/ExecutionStatusTag";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import { FlowExecution, FlowDefinition, ExecutionStatus } from "@/types";
import { executionApi, flowApi } from "@/services/flowService";
import { useProjectStore } from "@/store/projectStore";

const useStyles = createStyles(({ css }) => ({
  pageHeader: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  `,
  headerLeft: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  filterCard: css`
    margin-bottom: 16px;
  `,
  tableCard: css`
    background: #fff;
    .ant-table-wrapper {
      overflow-x: auto;
    }
  `,
}));

const { Title, Text } = Typography;

const ExecutionHistory: React.FC = () => {
  const { styles } = useStyles();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const flowIdFromUrl = searchParams.get("flowId");
  const { currentProject } = useProjectStore();
  const { t } = useTranslation("execution");

  const [executions, setExecutions] = useState<FlowExecution[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 筛选条件
  const [flowId, setFlowId] = useState<string | undefined>(
    flowIdFromUrl || undefined
  );
  const [status, setStatus] = useState<string | undefined>();

  // 时间筛选（默认最近24小时）
  const [timeRange, setTimeRange] = useState<TimeRange>(() => ({
    startTime: dayjs().subtract(24, "hour").toISOString(),
    endTime: dayjs().toISOString(),
  }));

  // 流程列表（用于下拉选择）
  const [flowList, setFlowList] = useState<FlowDefinition[]>([]);
  const [flowListLoading, setFlowListLoading] = useState(false);

  // 用于面包屑显示的流程名称（从URL flowId获取）
  const [breadcrumbFlowName, setBreadcrumbFlowName] = useState<string>("");

  // 加载流程列表
  const loadFlowList = useCallback(async () => {
    if (!currentProject?.id) return;
    setFlowListLoading(true);
    try {
      // 加载所有流程（设置较大的 size）
      const { data } = await flowApi.list(currentProject.id, 1, 1000);
      if (data.code === 200) {
        setFlowList(data.data.records);
      }
    } catch (error) {
      console.error("Failed to load flow list:", error);
    } finally {
      setFlowListLoading(false);
    }
  }, [currentProject?.id]);

  useEffect(() => {
    loadFlowList();
  }, [loadFlowList]);

  // 加载流程名称（仅当从特定流程进入时）
  useEffect(() => {
    if (flowIdFromUrl) {
      flowApi.get(flowIdFromUrl).then(({ data }) => {
        if (data.code === 200 && data.data) {
          setBreadcrumbFlowName(data.data.name);
        }
      });
    }
  }, [flowIdFromUrl]);

  // 流程下拉选项
  const flowOptions = useMemo(() => {
    return flowList.map((flow) => ({
      label: flow.name,
      value: flow.id,
    }));
  }, [flowList]);

  // 加载执行历史
  const loadExecutions = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await executionApi.list({
        page: current,
        size: pageSize,
        projectId: currentProject?.id,
        flowId,
        status,
        startTime: timeRange.startTime,
        endTime: timeRange.endTime,
      });
      if (data.code === 200) {
        setExecutions(data.data.records);
        setTotal(data.data.total);
      } else {
        message.error(data.message || t("history.message.loadFailed"));
      }
    } catch (error) {
      console.error("Failed to load executions:", error);
      message.error(t("history.message.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [current, pageSize, currentProject?.id, flowId, status, timeRange, t]);

  useEffect(() => {
    loadExecutions();
  }, [loadExecutions]);

  const columns: ColumnsType<FlowExecution> = [
    {
      title: t("history.columns.id"),
      dataIndex: "id",
      key: "id",
      width: 200,
      render: (id: string) => (
        <Button type="link" onClick={() => navigate(`/executions/${id}`)}>
          <Tag color="cyan">{id.substring(0, 16)}...</Tag>
        </Button>
      ),
    },
    {
      title: t("history.columns.flowName"),
      dataIndex: "flowName",
      key: "flowName",
      width: 180,
      ellipsis: true,
      render: (name: string, record: FlowExecution) => (
        <Button
          type="link"
          onClick={() => navigate(`/flows/${record.flowId}`)}
          style={{ padding: 0 }}
        >
          <Tag color="blue">{name || "-"}</Tag>
        </Button>
      ),
    },
    {
      title: t("history.columns.version"),
      dataIndex: "flowVersion",
      key: "flowVersion",
      width: 80,
      render: (version: number) => <Tag>v{version}</Tag>,
    },
    {
      title: t("history.columns.status"),
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (s: ExecutionStatus) => <ExecutionStatusTag status={s} />,
    },
    {
      title: t("history.columns.startedAt"),
      dataIndex: "startedAt",
      key: "startedAt",
      width: 180,
      render: (time: string) => dayjs(time).format("YYYY-MM-DD HH:mm:ss"),
    },
    {
      title: t("history.columns.completedAt"),
      dataIndex: "completedAt",
      key: "completedAt",
      width: 180,
      render: (time: string) =>
        time ? dayjs(time).format("YYYY-MM-DD HH:mm:ss") : "-",
    },
    {
      title: t("history.columns.duration"),
      key: "duration",
      width: 100,
      render: (_, record) => {
        if (!record.completedAt) return "-";
        const duration = dayjs(record.completedAt).diff(
          dayjs(record.startedAt),
          "millisecond"
        );
        if (duration < 1000) return `${duration}ms`;
        if (duration < 60000) return `${(duration / 1000).toFixed(2)}s`;
        return `${(duration / 60000).toFixed(2)}m`;
      },
    },
    {
      title: t("history.columns.actions"),
      key: "actions",
      width: 100,
      fixed: "right",
      render: (_, record) => (
        <Button
          type="link"
          icon={<AiOutlineEye />}
          onClick={() => navigate(`/executions/${record.id}`)}
        >
          {t("history.actions.detail")}
        </Button>
      ),
    },
  ];

  // 构建面包屑
  const breadcrumbItems = useMemo(
    () =>
      flowIdFromUrl
        ? [
            { title: t("history.breadcrumb.flowManagement"), path: "/flows" },
            {
              title: breadcrumbFlowName || t("history.breadcrumb.flow"),
              path: `/flows/${flowIdFromUrl}`,
            },
            { title: t("history.breadcrumb.history") },
          ]
        : [{ title: t("history.breadcrumb.history") }],
    [flowIdFromUrl, breadcrumbFlowName, t]
  );

  // 设置面包屑
  useBreadcrumb(breadcrumbItems, [breadcrumbItems]);

  return (
    <>
      {/* 页面标题 */}
      <div className={styles.pageHeader}>
        <Title level={4} style={{ margin: 0 }}>
          {t("history.title")}
          {breadcrumbFlowName && (
            <Text type="secondary" style={{ marginLeft: 8, fontSize: 14 }}>
              - {breadcrumbFlowName}
            </Text>
          )}
        </Title>
      </div>

      {/* 筛选区域 */}
      <Flex vertical gap={"middle"}>
        <Space wrap>
          <Button icon={<AiOutlineReload />} onClick={loadExecutions} />

          <Select
            placeholder={t("history.filter.statusPlaceholder")}
            allowClear
            style={{ width: 140 }}
            value={status}
            onChange={setStatus}
            options={[
              { label: t("history.status.all"), value: undefined },
              { label: t("history.status.completed"), value: "completed" },
              { label: t("history.status.failed"), value: "failed" },
              { label: t("history.status.running"), value: "running" },
              { label: t("history.status.pending"), value: "pending" },
              { label: t("history.status.waiting"), value: "waiting" },
            ]}
          />
          {!flowIdFromUrl && (
            <Select
              placeholder={t("history.filter.flowPlaceholder")}
              allowClear
              showSearch={{
                filterOption: (input, option) =>
                  (option?.label ?? "")
                    .toString()
                    .toLowerCase()
                    .includes(input.toLowerCase()),
              }}
              style={{ width: 240 }}
              value={flowId}
              onChange={setFlowId}
              loading={flowListLoading}
              options={flowOptions}
              notFoundContent={flowListLoading ? t("history.filter.loadingFlows") : t("history.filter.noFlows")}
            />
          )}
          <TimeRangeFilter
            value={timeRange}
            onChange={(value) => {
              setTimeRange(value);
              setCurrent(1); // 重置到第一页
            }}
            defaultPreset="24h"
          />
        </Space>

        {/* 执行历史表格 */}
        <Table
          columns={columns}
          dataSource={executions}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            current,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (totalCount) => t("history.pagination.total", { total: totalCount }),
            onChange: (page, size) => {
              setCurrent(page);
              setPageSize(size);
            },
          }}
        />
      </Flex>
    </>
  );
};

export default ExecutionHistory;
