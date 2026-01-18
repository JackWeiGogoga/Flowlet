import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  Popconfirm,
  InputNumber,
  Tabs,
} from "antd";
import {
  AiOutlineArrowLeft,
  AiOutlineDelete,
  AiOutlineEdit,
  AiOutlinePlus,
} from "react-icons/ai";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { message } from "@/components/AppMessageContext/staticMethods";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import keywordService, {
  type KeywordGroupRequest,
  type KeywordLibraryRequest,
  type KeywordTermRequest,
} from "@/services/keywordService";
import type {
  KeywordGroup,
  KeywordLibrary,
  KeywordMatchMode,
  KeywordTerm,
} from "@/types";
import { useProjectStore } from "@/store/projectStore";
import { useStyles } from "./KeywordManagement.styles";

const { Title, Text } = Typography;

const KeywordManagement: React.FC = () => {
  const { styles } = useStyles();
  const { t } = useTranslation("dictionary");
  const { currentProject } = useProjectStore();
  const navigate = useNavigate();
  const { libraryId } = useParams<{ libraryId?: string }>();

  const [libraries, setLibraries] = useState<KeywordLibrary[]>([]);
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(
    null
  );
  const [terms, setTerms] = useState<KeywordTerm[]>([]);
  const [groups, setGroups] = useState<KeywordGroup[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [termKeyword, setTermKeyword] = useState("");
  const [groupKeyword, setGroupKeyword] = useState("");
  const [debouncedLibraryKeyword, setDebouncedLibraryKeyword] = useState("");
  const [debouncedTermKeyword, setDebouncedTermKeyword] = useState("");
  const [debouncedGroupKeyword, setDebouncedGroupKeyword] = useState("");
  const [groupTermKeyword, setGroupTermKeyword] = useState("");
  const [debouncedGroupTermKeyword, setDebouncedGroupTermKeyword] =
    useState("");
  const [groupTermOptions, setGroupTermOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [groupTermLoading, setGroupTermLoading] = useState(false);

  const [loadingLibraries, setLoadingLibraries] = useState(false);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);

  const [libraryModalOpen, setLibraryModalOpen] = useState(false);
  const [termModalOpen, setTermModalOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);

  const [editingLibrary, setEditingLibrary] = useState<KeywordLibrary | null>(
    null
  );
  const [editingTerm, setEditingTerm] = useState<KeywordTerm | null>(null);
  const [editingGroup, setEditingGroup] = useState<KeywordGroup | null>(null);

  const [libraryForm] = Form.useForm<KeywordLibraryRequest>();
  type TermFormValues = Omit<KeywordTermRequest, "matchMode"> & {
    matchMode?: KeywordMatchMode;
    groupIds?: string[];
  };
  const [termForm] = Form.useForm<TermFormValues>();
  const [groupForm] = Form.useForm<KeywordGroupRequest>();

  const selectedLibrary = useMemo(
    () => libraries.find((library) => library.id === selectedLibraryId) || null,
    [libraries, selectedLibraryId]
  );

  const breadcrumbItems = useMemo(() => {
    if (!libraryId) {
      return [{ title: t("keyword.title"), path: "/keywords" }];
    }
    return [
      { title: t("keyword.title"), path: "/keywords" },
      { title: selectedLibrary?.name || t("keyword.libraryDetail") },
    ];
  }, [libraryId, selectedLibrary?.name, t]);

  useBreadcrumb(breadcrumbItems, [libraryId, selectedLibrary?.name]);

  useEffect(() => {
    setSelectedLibraryId(libraryId || null);
    setTermKeyword("");
    setGroupKeyword("");
    setDebouncedTermKeyword("");
    setDebouncedGroupKeyword("");
    setGroupTermKeyword("");
    setDebouncedGroupTermKeyword("");
    setGroupTermOptions([]);
  }, [libraryId]);

  const loadLibraries = useCallback(async () => {
    if (!currentProject?.id) {
      setLibraries([]);
      return;
    }
    setLoadingLibraries(true);
    try {
      const list = await keywordService.listLibraries({
        projectId: currentProject.id,
        keyword: debouncedLibraryKeyword,
      });
      setLibraries(list);
    } catch {
      message.error(t("keyword.message.loadLibraryFailed"));
    } finally {
      setLoadingLibraries(false);
    }
  }, [currentProject?.id, debouncedLibraryKeyword, t]);

  const loadTerms = useCallback(async () => {
    if (!currentProject?.id || !selectedLibraryId) {
      setTerms([]);
      return;
    }
    setLoadingTerms(true);
    try {
      const list = await keywordService.listTerms({
        projectId: currentProject.id,
        libraryId: selectedLibraryId,
        keyword: debouncedTermKeyword,
      });
      setTerms(list);
    } catch {
      message.error(t("keyword.message.loadTermFailed"));
    } finally {
      setLoadingTerms(false);
    }
  }, [currentProject?.id, selectedLibraryId, debouncedTermKeyword, t]);

  const loadGroups = useCallback(async () => {
    if (!currentProject?.id || !selectedLibraryId) {
      setGroups([]);
      return;
    }
    setLoadingGroups(true);
    try {
      const list = await keywordService.listGroups({
        projectId: currentProject.id,
        libraryId: selectedLibraryId,
        keyword: debouncedGroupKeyword,
      });
      setGroups(list);
    } catch {
      message.error(t("keyword.message.loadGroupFailed"));
    } finally {
      setLoadingGroups(false);
    }
  }, [currentProject?.id, selectedLibraryId, debouncedGroupKeyword, t]);

  useEffect(() => {
    loadLibraries();
  }, [loadLibraries]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedLibraryKeyword(searchKeyword.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchKeyword]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedTermKeyword(termKeyword.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [termKeyword]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedGroupKeyword(groupKeyword.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [groupKeyword]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedGroupTermKeyword(groupTermKeyword.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [groupTermKeyword]);

  useEffect(() => {
    loadTerms();
    loadGroups();
  }, [loadTerms, loadGroups]);

  useEffect(() => {
    if (!termModalOpen) return;
    termForm.resetFields();
    if (editingTerm) {
      termForm.setFieldsValue({
        term: editingTerm.term,
        matchMode: editingTerm.matchMode,
        enabled: editingTerm.enabled,
        groupIds: editingTerm.groupIds || [],
      });
    } else {
      termForm.setFieldsValue({ matchMode: "NORMAL", enabled: true });
    }
  }, [termModalOpen, editingTerm, termForm]);

  useEffect(() => {
    if (!groupModalOpen) return;
    groupForm.resetFields();
    if (editingGroup) {
      groupForm.setFieldsValue({
        name: editingGroup.name,
        description: editingGroup.description,
        enabled: editingGroup.enabled,
        actionLevel: editingGroup.actionLevel,
        priority: editingGroup.priority ?? 0,
        termIds: editingGroup.termIds || [],
      });
    } else {
      groupForm.setFieldsValue({
        enabled: true,
        actionLevel: "TAG_ONLY",
        priority: 0,
        termIds: [],
      });
    }
  }, [groupModalOpen, editingGroup, groupForm]);

  const showRequestError = (error: unknown, fallback: string) => {
    if (error instanceof Error) {
      if (error.message === "Network Error") {
        message.error(fallback);
      }
      return;
    }
    message.error(fallback);
  };

  const openLibraryModal = (library?: KeywordLibrary) => {
    setEditingLibrary(library || null);
    setLibraryModalOpen(true);
    libraryForm.resetFields();
    if (library) {
      libraryForm.setFieldsValue({
        name: library.name,
        description: library.description,
        enabled: library.enabled,
      });
    } else {
      libraryForm.setFieldsValue({ enabled: true });
    }
  };

  const openTermModal = (term?: KeywordTerm) => {
    setEditingTerm(term || null);
    setTermModalOpen(true);
  };

  const openGroupModal = (group?: KeywordGroup) => {
    setEditingGroup(group || null);
    setGroupModalOpen(true);
  };

  const handleSubmitLibrary = async () => {
    if (!currentProject?.id) return;
    const values = await libraryForm.validateFields();
    try {
      if (editingLibrary) {
        await keywordService.updateLibrary(
          currentProject.id,
          editingLibrary.id,
          values
        );
        message.success(t("keyword.message.libraryUpdated"));
      } else {
        await keywordService.createLibrary(currentProject.id, values);
        message.success(t("keyword.message.libraryCreated"));
      }
      setLibraryModalOpen(false);
      await loadLibraries();
    } catch (error: unknown) {
      showRequestError(error, t("keyword.message.librarySaveFailed"));
    }
  };

  const handleSubmitTerm = async () => {
    if (!currentProject?.id || !selectedLibraryId) return;
    const values = (await termForm.validateFields()) as KeywordTermRequest;
    try {
      if (editingTerm) {
        await keywordService.updateTerm(
          currentProject.id,
          selectedLibraryId,
          editingTerm.id,
          values
        );
        message.success(t("keyword.message.termUpdated"));
      } else {
        await keywordService.createTerm(
          currentProject.id,
          selectedLibraryId,
          values
        );
        message.success(t("keyword.message.termCreated"));
      }
      setTermModalOpen(false);
      await loadTerms();
    } catch (error: unknown) {
      showRequestError(error, t("keyword.message.termSaveFailed"));
    }
  };

  const handleSubmitGroup = async () => {
    if (!currentProject?.id || !selectedLibraryId) return;
    const values = await groupForm.validateFields();
    try {
      if (editingGroup) {
        await keywordService.updateGroup(
          currentProject.id,
          selectedLibraryId,
          editingGroup.id,
          values
        );
        message.success(t("keyword.message.groupUpdated"));
      } else {
        await keywordService.createGroup(
          currentProject.id,
          selectedLibraryId,
          values
        );
        message.success(t("keyword.message.groupCreated"));
      }
      setGroupModalOpen(false);
      await loadGroups();
    } catch (error: unknown) {
      showRequestError(error, t("keyword.message.groupSaveFailed"));
    }
  };

  const handleDeleteLibrary = async (library: KeywordLibrary) => {
    if (!currentProject?.id) return;
    try {
      await keywordService.deleteLibrary(currentProject.id, library.id);
      message.success(t("keyword.message.libraryDeleted"));
      await loadLibraries();
      if (library.id === selectedLibraryId) {
        navigate("/keywords");
      }
    } catch {
      message.error(t("keyword.message.libraryDeleteFailed"));
    }
  };

  const handleDeleteTerm = async (term: KeywordTerm) => {
    if (!currentProject?.id || !selectedLibraryId) return;
    try {
      await keywordService.deleteTerm(
        currentProject.id,
        selectedLibraryId,
        term.id
      );
      message.success(t("keyword.message.termDeleted"));
      await loadTerms();
    } catch {
      message.error(t("keyword.message.termDeleteFailed"));
    }
  };

  const handleDeleteGroup = async (group: KeywordGroup) => {
    if (!currentProject?.id || !selectedLibraryId) return;
    try {
      await keywordService.deleteGroup(
        currentProject.id,
        selectedLibraryId,
        group.id
      );
      message.success(t("keyword.message.groupDeleted"));
      await loadGroups();
    } catch {
      message.error(t("keyword.message.groupDeleteFailed"));
    }
  };

  const groupOptions = useMemo(
    () =>
      groups.map((group) => ({
        value: group.id,
        label: group.name,
      })),
    [groups]
  );

  const loadGroupTermOptions = useCallback(async () => {
    if (!currentProject?.id || !selectedLibraryId) {
      setGroupTermOptions([]);
      return;
    }
    setGroupTermLoading(true);
    try {
      const list = await keywordService.listTerms({
        projectId: currentProject.id,
        libraryId: selectedLibraryId,
        keyword: debouncedGroupTermKeyword || undefined,
      });
      setGroupTermOptions(
        list.map((term) => ({
          value: term.id,
          label: `${term.term} · ${
            term.matchMode === "PINYIN"
              ? t("keyword.matchMode.pinyin")
              : term.matchMode === "COMBO"
                ? t("keyword.matchMode.combo")
                : t("keyword.matchMode.normal")
          }`,
        }))
      );
    } catch {
      message.error(t("keyword.message.loadTermFailed"));
    } finally {
      setGroupTermLoading(false);
    }
  }, [currentProject?.id, selectedLibraryId, debouncedGroupTermKeyword, t]);

  useEffect(() => {
    if (!groupModalOpen) return;
    loadGroupTermOptions();
  }, [groupModalOpen, loadGroupTermOptions]);

  const filteredLibraries = useMemo(() => libraries, [libraries]);
  const filteredTerms = useMemo(() => terms, [terms]);
  const filteredGroups = useMemo(() => groups, [groups]);

  const libraryColumns = [
    {
      title: t("keyword.columns.library"),
      dataIndex: "name",
      key: "name",
      render: (value: string) => <Text strong>{value}</Text>,
    },
    {
      title: t("keyword.columns.description"),
      dataIndex: "description",
      key: "description",
      render: (value: string | undefined) => value || "-",
    },
    {
      title: t("keyword.columns.createdAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value: string | undefined) =>
        value ? new Date(value).toLocaleString() : "-",
    },
    {
      title: t("keyword.columns.enabled"),
      dataIndex: "enabled",
      key: "enabled",
      render: (enabled: boolean) => (
        <Tag color={enabled ? "success" : "default"}>
          {enabled ? t("keyword.status.enabled") : t("keyword.status.disabled")}
        </Tag>
      ),
    },
    {
      title: t("keyword.columns.actions"),
      key: "actions",
      render: (_: unknown, record: KeywordLibrary) => (
        <Space>
          <Button
            size="small"
            type="primary"
            onClick={() => navigate(`/keywords/${record.id}`)}
          >
            {t("keyword.actions.manage")}
          </Button>
          <Button
            size="small"
            icon={<AiOutlineEdit />}
            onClick={() => openLibraryModal(record)}
          >
            {t("keyword.actions.edit")}
          </Button>
          <Popconfirm
            title={t("keyword.confirm.deleteLibrary")}
            onConfirm={() => handleDeleteLibrary(record)}
          >
            <Button size="small" danger icon={<AiOutlineDelete />}>
              {t("keyword.actions.delete")}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const termColumns = [
    {
      title: t("keyword.columns.keyword"),
      dataIndex: "term",
      key: "term",
    },
    {
      title: t("keyword.columns.type"),
      dataIndex: "matchMode",
      key: "matchMode",
      render: (value: KeywordTerm["matchMode"]) => (
        <Tag
          color={
            value === "PINYIN" ? "geekblue" : value === "COMBO" ? "volcano" : "blue"
          }
        >
          {value === "PINYIN"
            ? t("keyword.matchMode.pinyin")
            : value === "COMBO"
              ? t("keyword.matchMode.combo")
              : t("keyword.matchMode.normal")}
        </Tag>
      ),
    },
    {
      title: t("keyword.columns.enabled"),
      dataIndex: "enabled",
      key: "enabled",
      render: (enabled: boolean) => (
        <Tag color={enabled ? "success" : "default"}>
          {enabled ? t("keyword.status.enabled") : t("keyword.status.disabled")}
        </Tag>
      ),
    },
    {
      title: t("keyword.columns.createdBy"),
      dataIndex: "createdByName",
      key: "createdByName",
      render: (value: string | undefined) => value || "-",
    },
    {
      title: t("keyword.columns.createdAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value: string | undefined) =>
        value ? new Date(value).toLocaleString() : "-",
    },
    {
      title: t("keyword.columns.actions"),
      key: "actions",
      render: (_: unknown, record: KeywordTerm) => (
        <Space>
          <Button
            size="small"
            icon={<AiOutlineEdit />}
            onClick={() => openTermModal(record)}
          >
            {t("keyword.actions.edit")}
          </Button>
          <Popconfirm
            title={t("keyword.confirm.deleteTerm")}
            onConfirm={() => handleDeleteTerm(record)}
          >
            <Button size="small" danger icon={<AiOutlineDelete />}>
              {t("keyword.actions.delete")}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const groupColumns = [
    {
      title: t("keyword.columns.group"),
      dataIndex: "name",
      key: "name",
      render: (value: string, record: KeywordGroup) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{value}</Text>
          {record.description && (
            <Text type="secondary">{record.description}</Text>
          )}
        </Space>
      ),
    },
    {
      title: t("keyword.columns.actionLevel"),
      dataIndex: "actionLevel",
      key: "actionLevel",
      render: (value: KeywordGroup["actionLevel"]) => {
        const labelMap: Record<KeywordGroup["actionLevel"], string> = {
          DELETE: t("keyword.actionLevels.delete"),
          REVIEW_BEFORE_PUBLISH: t("keyword.actionLevels.reviewBeforePublish"),
          PUBLISH_BEFORE_REVIEW: t("keyword.actionLevels.publishBeforeReview"),
          TAG_ONLY: t("keyword.actionLevels.tagOnly"),
        };
        const label = labelMap[value] || value;
        const color = value === "DELETE" ? "red" : "gold";
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: t("keyword.columns.termCount"),
      dataIndex: "termIds",
      key: "termIds",
      render: (value: string[]) => value?.length || 0,
    },
    {
      title: t("keyword.columns.enabled"),
      dataIndex: "enabled",
      key: "enabled",
      render: (enabled: boolean) => (
        <Tag color={enabled ? "success" : "default"}>
          {enabled ? t("keyword.status.enabled") : t("keyword.status.disabled")}
        </Tag>
      ),
    },
    {
      title: t("keyword.columns.createdBy"),
      dataIndex: "createdByName",
      key: "createdByName",
      render: (value: string | undefined) => value || "-",
    },
    {
      title: t("keyword.columns.createdAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value: string | undefined) =>
        value ? new Date(value).toLocaleString() : "-",
    },
    {
      title: t("keyword.columns.actions"),
      key: "actions",
      render: (_: unknown, record: KeywordGroup) => (
        <Space>
          <Button
            size="small"
            icon={<AiOutlineEdit />}
            onClick={() => openGroupModal(record)}
          >
            {t("keyword.actions.edit")}
          </Button>
          <Popconfirm
            title={t("keyword.confirm.deleteGroup")}
            onConfirm={() => handleDeleteGroup(record)}
          >
            <Button size="small" danger icon={<AiOutlineDelete />}>
              {t("keyword.actions.delete")}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className={styles.pageHeader}>
        {libraryId ? (
          <Space>
            <Button
              icon={<AiOutlineArrowLeft />}
              onClick={() => navigate("/keywords")}
            >
              {t("keyword.back")}
            </Button>
            <Title level={4} className={styles.title}>
              {selectedLibrary?.name || t("keyword.libraryDetail")}
            </Title>
          </Space>
        ) : (
          <Title level={4} className={styles.title}>
            {t("keyword.title")}
          </Title>
        )}
        <Space>
          {libraryId && selectedLibrary ? (
            <Button onClick={() => openLibraryModal(selectedLibrary)}>
              {t("keyword.editLibraryButton")}
            </Button>
          ) : null}
          {!libraryId && (
            <Button
              type="primary"
              icon={<AiOutlinePlus />}
              onClick={() => openLibraryModal()}
            >
              {t("keyword.createLibrary")}
            </Button>
          )}
        </Space>
      </div>

      {!currentProject?.id ? (
        <Empty description={t("empty.selectProject")} />
      ) : libraryId ? (
        selectedLibrary ? (
          <Card className={styles.contentCard}>
            <Tabs
              items={[
                {
                  key: "terms",
                  label: t("keyword.tabs.terms"),
                  children: (
                    <>
                      <div className={styles.toolbar}>
                        <Input.Search
                          placeholder={t("keyword.searchKeyword")}
                          allowClear
                          onChange={(event) => setTermKeyword(event.target.value)}
                          value={termKeyword}
                          className={styles.searchInput}
                        />
                        <Space>
                          <Button
                            type="primary"
                            icon={<AiOutlinePlus />}
                            onClick={() => openTermModal()}
                          >
                            {t("keyword.modal.createTerm")}
                          </Button>
                        </Space>
                      </div>
                      <Table
                        rowKey="id"
                        size="small"
                        columns={termColumns}
                        dataSource={filteredTerms}
                        loading={loadingTerms}
                        pagination={{ pageSize: 10 }}
                      />
                    </>
                  ),
                },
                {
                  key: "groups",
                  label: t("keyword.tabs.groups"),
                  children: (
                    <>
                      <div className={styles.toolbar}>
                        <Input.Search
                          placeholder={t("keyword.searchGroup")}
                          allowClear
                          onChange={(event) =>
                            setGroupKeyword(event.target.value)
                          }
                          value={groupKeyword}
                          className={styles.searchInput}
                        />
                        <Button
                          type="primary"
                          icon={<AiOutlinePlus />}
                          onClick={() => openGroupModal()}
                        >
                          {t("keyword.modal.createGroup")}
                        </Button>
                      </div>
                      <Table
                        rowKey="id"
                        size="small"
                        columns={groupColumns}
                        dataSource={filteredGroups}
                        loading={loadingGroups}
                        pagination={{ pageSize: 10 }}
                      />
                    </>
                  ),
                },
              ]}
            />
          </Card>
        ) : (
          <Empty description={t("keyword.noLibrary")} />
        )
      ) : (
        <Card className={styles.contentCard} loading={loadingLibraries}>
          <div className={styles.listToolbar}>
            <Input.Search
              placeholder={t("keyword.searchLibrary")}
              allowClear
              onChange={(event) => setSearchKeyword(event.target.value)}
              value={searchKeyword}
            />
          </div>
          <Table
            rowKey="id"
            columns={libraryColumns}
            dataSource={filteredLibraries}
            pagination={{ pageSize: 10 }}
            onRow={(record) => ({
              onClick: () => navigate(`/keywords/${record.id}`),
              className: styles.clickableRow,
            })}
          />
        </Card>
      )}

      <Modal
        title={editingLibrary ? t("keyword.modal.editLibrary") : t("keyword.modal.createLibrary")}
        open={libraryModalOpen}
        onOk={handleSubmitLibrary}
        onCancel={() => setLibraryModalOpen(false)}
        destroyOnHidden
      >
        <Form form={libraryForm} layout="vertical">
          <Form.Item
            name="name"
            label={t("keyword.form.name")}
            rules={[{ required: true, message: t("keyword.form.nameRequired") }]}
          >
            <Input placeholder={t("keyword.form.namePlaceholder")} />
          </Form.Item>
          <Form.Item name="description" label={t("keyword.form.description")}>
            <Input.TextArea rows={3} placeholder={t("keyword.form.descriptionPlaceholder")} />
          </Form.Item>
          <Form.Item name="enabled" label={t("keyword.form.enabled")} valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingTerm ? t("keyword.modal.editTerm") : t("keyword.modal.createTerm")}
        open={termModalOpen}
        onOk={handleSubmitTerm}
        onCancel={() => setTermModalOpen(false)}
        destroyOnHidden
      >
        <Form form={termForm} layout="vertical">
          <Form.Item
            name="term"
            label={t("keyword.form.keyword")}
            rules={[{ required: true, message: t("keyword.form.keywordRequired") }]}
          >
            <Input placeholder={t("keyword.form.keywordPlaceholder")} />
          </Form.Item>
          <Form.Item
            name="matchMode"
            label={t("keyword.form.matchMode")}
            rules={[{ required: true, message: t("keyword.form.matchModeRequired") }]}
            extra={t("keyword.form.matchModeExtra")}
          >
            <Select
              options={[
                { value: "NORMAL", label: t("keyword.form.matchModeOptions.normal") },
                { value: "PINYIN", label: t("keyword.form.matchModeOptions.pinyin") },
                { value: "COMBO", label: t("keyword.form.matchModeOptions.combo") },
              ]}
            />
          </Form.Item>
          <Form.Item name="groupIds" label={t("keyword.form.groupIds")}>
            <Select
              mode="multiple"
              options={groupOptions}
              placeholder={t("keyword.form.groupIdsPlaceholder")}
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="enabled" label={t("keyword.form.enabled")} valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingGroup ? t("keyword.modal.editGroup") : t("keyword.modal.createGroup")}
        open={groupModalOpen}
        onOk={handleSubmitGroup}
        onCancel={() => setGroupModalOpen(false)}
        destroyOnHidden
      >
        <Form form={groupForm} layout="vertical">
          <Form.Item
            name="name"
            label={t("keyword.form.groupName")}
            rules={[{ required: true, message: t("keyword.form.groupNameRequired") }]}
          >
            <Input placeholder={t("keyword.form.groupNamePlaceholder")} />
          </Form.Item>
          <Form.Item name="description" label={t("keyword.form.description")}>
            <Input.TextArea rows={2} placeholder={t("keyword.form.descriptionPlaceholder")} />
          </Form.Item>
          <Form.Item
            name="actionLevel"
            label={t("keyword.form.actionLevel")}
            rules={[{ required: true, message: t("keyword.form.actionLevelRequired") }]}
          >
            <Select
              options={[
                { value: "DELETE", label: t("keyword.actionLevels.delete") },
                { value: "REVIEW_BEFORE_PUBLISH", label: t("keyword.actionLevels.reviewBeforePublish") },
                { value: "PUBLISH_BEFORE_REVIEW", label: t("keyword.actionLevels.publishBeforeReview") },
                { value: "TAG_ONLY", label: t("keyword.actionLevels.tagOnly") },
              ]}
            />
          </Form.Item>
          <Form.Item name="priority" label={t("keyword.form.priority")}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="termIds"
            label={t("keyword.form.termIds")}
            extra={t("keyword.form.termIdsExtra")}
          >
            <Select
              mode="multiple"
              showSearch
              filterOption={false}
              onSearch={setGroupTermKeyword}
              options={groupTermOptions}
              loading={groupTermLoading}
              placeholder={t("keyword.form.termIdsPlaceholder")}
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="enabled" label={t("keyword.form.enabled")} valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default KeywordManagement;
