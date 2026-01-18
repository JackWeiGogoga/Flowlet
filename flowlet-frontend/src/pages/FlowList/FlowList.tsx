import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  Typography,
  Flex,
  Modal,
  Form,
  Dropdown,
  Switch,
  Tooltip,
} from "antd";
import type { MenuProps } from "antd";
import {
  AiOutlinePlus,
  AiOutlineEdit,
  AiOutlineDelete,
  AiOutlinePlayCircle,
  AiOutlineSearch,
  AiOutlineHistory,
  AiOutlineCopy,
  AiOutlineForm,
  AiOutlineMore,
  AiOutlineStop,
  AiOutlineCheck,
} from "react-icons/ai";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { createStyles } from "antd-style";
import { flowApi } from "@/services/flowService";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import { FlowDefinition, FlowStatus } from "@/types";
import { useProjectStore } from "@/store/projectStore";
import { modal, message } from "@/components/AppMessageContext/staticMethods";

const { Title } = Typography;

// 使用 antd-style 创建样式
const useStyles = createStyles(({ css }) => ({
  pageHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
  `,
  toolbar: css`
    display: flex;
    justify-content: space-between;
    margin-bottom: 16px;
  `,
  clickableRow: css`
    cursor: pointer;
  `,
}));

const statusColors: Record<FlowStatus, string> = {
  [FlowStatus.DRAFT]: "default",
  [FlowStatus.PUBLISHED]: "success",
  [FlowStatus.DISABLED]: "error",
};

const FlowList: React.FC = () => {
  const { styles } = useStyles();
  const { t } = useTranslation("flow");
  const { t: tCommon } = useTranslation("common");
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentProject } = useProjectStore();
  const parsePositiveInt = (value: string | null, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };
  const initialPage = parsePositiveInt(searchParams.get("page"), 1);
  const initialPageSize = parsePositiveInt(searchParams.get("pageSize"), 10);
  const initialSearchText = searchParams.get("q") ?? "";
  const initialStatusFilter = searchParams.get("status") ?? undefined;
  const [loading, setLoading] = useState(false);
  const [flows, setFlows] = useState<FlowDefinition[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [searchText, setSearchText] = useState(initialSearchText);
  const [statusFilter, setStatusFilter] =
    useState<string | undefined>(initialStatusFilter || undefined);

  const listUrl = `${location.pathname}${location.search}`;

  // 编辑流程信息的状态
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingFlow, setEditingFlow] = useState<FlowDefinition | null>(null);
  const [editForm] = Form.useForm();

  // 状态标签映射
  const statusLabels: Record<FlowStatus, string> = useMemo(() => ({
    [FlowStatus.DRAFT]: t("status.draft"),
    [FlowStatus.PUBLISHED]: t("status.published"),
    [FlowStatus.DISABLED]: t("status.disabled"),
  }), [t]);

  // 加载流程列表
  const loadFlows = useCallback(async () => {
    // 必须有选中的项目才能加载
    if (!currentProject?.id) {
      setFlows([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    try {
      const { data } = await flowApi.list(
        currentProject.id,
        page,
        pageSize,
        statusFilter,
        searchText || undefined
      );
      setFlows(data.data.records);
      setTotal(data.data.total);
    } catch {
      message.error(t("message.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, page, pageSize, statusFilter, searchText, t]);

  // 当项目变化时，重置分页并重新加载
  useEffect(() => {
    setPage(1);
  }, [currentProject?.id]);

  // 同步 URL 查询参数到本地状态
  useEffect(() => {
    const nextPage = parsePositiveInt(searchParams.get("page"), 1);
    const nextPageSize = parsePositiveInt(searchParams.get("pageSize"), 10);
    const nextSearchText = searchParams.get("q") ?? "";
    const nextStatus = searchParams.get("status") ?? undefined;
    setPage(nextPage);
    setPageSize(nextPageSize);
    setSearchText(nextSearchText);
    setStatusFilter(nextStatus || undefined);
  }, [searchParams]);

  // 将本地状态写回 URL，支持返回时恢复列表状态
  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) {
      params.set("page", String(page));
    }
    if (pageSize !== 10) {
      params.set("pageSize", String(pageSize));
    }
    if (searchText) {
      params.set("q", searchText);
    }
    if (statusFilter) {
      params.set("status", statusFilter);
    }
    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
  }, [page, pageSize, searchText, statusFilter, searchParams, setSearchParams]);

  useEffect(() => {
    loadFlows();
  }, [loadFlows]);

  // 删除流程
  const handleDelete = async (id: string) => {
    try {
      await flowApi.delete(id);
      message.success(t("message.deleteSuccess"));
      loadFlows();
    } catch {
      message.error(t("message.deleteFailed"));
    }
  };

  // 复制流程
  const handleCopy = async (id: string) => {
    try {
      await flowApi.copy(id);
      message.success(t("message.copySuccess"));
      loadFlows();
    } catch {
      message.error(t("message.copyFailed"));
    }
  };

  // 下线（禁用）流程
  const handleDisable = async (id: string) => {
    try {
      await flowApi.disable(id);
      message.success(t("message.disableSuccess"));
      loadFlows();
    } catch {
      message.error(t("message.disableFailed"));
    }
  };

  // 上线（恢复）流程
  const handleEnable = async (id: string) => {
    try {
      await flowApi.publish(id);
      message.success(t("message.enableSuccess"));
      loadFlows();
    } catch {
      message.error(t("message.enableFailed"));
    }
  };

  // 打开编辑流程信息弹窗
  const handleEditInfo = (record: FlowDefinition) => {
    setEditingFlow(record);
    editForm.setFieldsValue({
      name: record.name,
      description: record.description,
      isReusable: record.isReusable || false,
    });
    setEditModalVisible(true);
  };

  // 保存流程信息
  const handleSaveInfo = async () => {
    try {
      const values = await editForm.validateFields();
      if (!editingFlow) return;

      // 解析 graphData 字符串为对象
      const graphData =
        typeof editingFlow.graphData === "string"
          ? JSON.parse(editingFlow.graphData)
          : editingFlow.graphData;

      // 更新基本信息
      await flowApi.update(editingFlow.id, {
        name: values.name,
        description: values.description,
        graphData,
        inputSchema: editingFlow.inputSchema,
      });

      // 如果可复用状态有变化，单独更新
      if (values.isReusable !== (editingFlow.isReusable || false)) {
        await flowApi.setReusable(editingFlow.id, values.isReusable);
      }

      message.success(t("message.saveSuccess"));
      setEditModalVisible(false);
      setEditingFlow(null);
      editForm.resetFields();
      loadFlows();
    } catch {
      message.error(t("message.saveFailed"));
    }
  };

  const columns: ColumnsType<FlowDefinition> = [
    {
      title: t("columns.name"),
      dataIndex: "name",
      key: "name",
      render: (text) => <span>{text}</span>,
    },
    {
      title: t("columns.description"),
      dataIndex: "description",
      key: "description",
      ellipsis: true,
    },
    {
      title: t("columns.status"),
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: FlowStatus) => (
        <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>
      ),
    },
    {
      title: t("columns.version"),
      dataIndex: "version",
      key: "version",
      width: 100,
      align: "center",
      render: (value: boolean) => <Tag color="default">{value}</Tag>,
    },
    {
      title: t("columns.isReusable"),
      dataIndex: "isReusable",
      key: "isReusable",
      width: 110,
      align: "center",
      render: (value: boolean | undefined) =>
        value ? <Tag color="blue">{t("reusable.yes")}</Tag> : <Tag>{t("reusable.no")}</Tag>,
    },
    {
      title: t("columns.createdBy"),
      dataIndex: "createdByName",
      key: "createdByName",
      width: 120,
      ellipsis: true,
      render: (text: string | undefined) => text || "-",
    },
    {
      title: t("columns.updatedAt"),
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 180,
      render: (text) => dayjs(text).format("YYYY-MM-DD HH:mm:ss"),
    },
    {
      title: tCommon("table.actions"),
      key: "action",
      width: 100,
      render: (_, record) => {
        const moreMenuItems: MenuProps["items"] = [
          {
            key: "edit",
            icon: <AiOutlineEdit />,
            label: t("actions.edit"),
            onClick: () =>
              navigate(`/flows/${record.id}`, { state: { from: listUrl } }),
          },
          {
            key: "info",
            icon: <AiOutlineForm />,
            label: t("actions.editInfo"),
            onClick: () => handleEditInfo(record),
          },
          {
            key: "copy",
            icon: <AiOutlineCopy />,
            label: t("actions.copy"),
            onClick: () => handleCopy(record.id),
          },
          {
            type: "divider" as const,
          },
          ...(record.status === FlowStatus.PUBLISHED
            ? [
                {
                  key: "execute",
                  icon: <AiOutlinePlayCircle />,
                  label: t("actions.execute"),
                  onClick: () =>
                    navigate(`/flows/${record.id}`, { state: { from: listUrl } }),
                },
                {
                  key: "history",
                  icon: <AiOutlineHistory />,
                  label: t("actions.history"),
                  onClick: () => navigate(`/executions?flowId=${record.id}`),
                },
                {
                  type: "divider" as const,
                },
                {
                  key: "disable",
                  icon: <AiOutlineStop />,
                  label: t("actions.disable"),
                  onClick: () => {
                    modal.confirm({
                      title: t("confirm.disableTitle"),
                      content: t("confirm.disableContent"),
                      okText: tCommon("action.ok"),
                      cancelText: tCommon("action.cancel"),
                      onOk: () => handleDisable(record.id),
                    });
                  },
                },
              ]
            : []),
          ...(record.status === FlowStatus.DISABLED
            ? [
                {
                  key: "enable",
                  icon: <AiOutlineCheck />,
                  label: t("actions.enable"),
                  onClick: () => {
                    modal.confirm({
                      title: t("confirm.enableTitle"),
                      content: t("confirm.enableContent"),
                      okText: tCommon("action.ok"),
                      cancelText: tCommon("action.cancel"),
                      onOk: () => handleEnable(record.id),
                    });
                  },
                },
              ]
            : []),
          {
            key: "delete",
            icon: <AiOutlineDelete />,
            label: t("actions.delete"),
            danger: true,
            onClick: () => {
              modal.confirm({
                title: t("confirm.deleteTitle"),
                okText: tCommon("action.ok"),
                cancelText: tCommon("action.cancel"),
                okButtonProps: { danger: true },
                onOk: () => handleDelete(record.id),
              });
            },
          },
        ];

        return (
          <Flex>
            <Dropdown menu={{ items: moreMenuItems }} trigger={["click"]}>
              <Button type="link" icon={<AiOutlineMore />} />
            </Dropdown>
          </Flex>
        );
      },
    },
  ];

  // 设置面包屑
  const breadcrumbItems = useMemo(() => [{ title: t("title") }], [t]);
  useBreadcrumb(breadcrumbItems, [breadcrumbItems]);

  return (
    <>
      <div className={styles.pageHeader}>
        <Title level={4} style={{ margin: 0 }}>
          {t("title")}
        </Title>
        <Button
          type="primary"
          icon={<AiOutlinePlus />}
          onClick={() => navigate("/flows/new", { state: { from: listUrl } })}
        >
          {t("newFlow")}
        </Button>
      </div>

      <div className={styles.toolbar}>
        <Space>
          <Input
            placeholder={t("searchPlaceholder")}
            prefix={<AiOutlineSearch />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={() => {
              setPage(1);
              loadFlows();
            }}
            style={{ width: 280 }}
            allowClear
          />
          <Select
            placeholder={t("statusFilter")}
            allowClear
            style={{ width: 120 }}
            value={statusFilter}
            onChange={setStatusFilter}
          >
            <Select.Option value="draft">{t("status.draft")}</Select.Option>
            <Select.Option value="published">{t("status.published")}</Select.Option>
            <Select.Option value="disabled">{t("status.disabled")}</Select.Option>
          </Select>
        </Space>
      </div>
      <Table
        columns={columns}
        dataSource={flows}
        rowKey="id"
        loading={loading}
        rowClassName={styles.clickableRow}
        onRow={(record) => ({
          onClick: (event) => {
            const target = event.target as HTMLElement;
            if (
              target.closest(
                "a, button, .ant-btn, .ant-dropdown, .ant-switch, .ant-select, .ant-input, .ant-popover, .ant-modal, .ant-tooltip, .ant-checkbox, .ant-radio, [role='button']"
              )
            ) {
              return;
            }
            navigate(`/flows/${record.id}`, { state: { from: listUrl } });
          },
        })}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => tCommon("table.total", { total }),
          onChange: (p, s) => {
            setPage(p);
            setPageSize(s);
          },
        }}
      />

      {/* 编辑流程信息弹窗 */}
      <Modal
        title={t("modal.editTitle")}
        open={editModalVisible}
        onOk={handleSaveInfo}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingFlow(null);
          editForm.resetFields();
        }}
        okText={tCommon("action.save")}
        cancelText={tCommon("action.cancel")}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="name"
            label={t("modal.nameLabel")}
            rules={[{ required: true, message: t("modal.nameRequired") }]}
          >
            <Input placeholder={t("modal.namePlaceholder")} />
          </Form.Item>
          <Form.Item name="description" label={t("modal.descLabel")}>
            <Input.TextArea rows={4} placeholder={t("modal.descPlaceholder")} />
          </Form.Item>
          <Form.Item
            name="isReusable"
            label={
              <Tooltip title={t("modal.reusableTip")}>
                <span>{t("modal.reusableLabel")}</span>
              </Tooltip>
            }
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default FlowList;
