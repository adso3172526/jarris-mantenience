import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Card,
  Space,
  Tag,
  Select,
  Input,
  Tooltip,
  Row,
  Col,
  DatePicker,
  Pagination,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  EyeOutlined,
  FileTextOutlined,
  SearchOutlined,
  ToolOutlined,
  HomeOutlined,
  EditOutlined,
  ClearOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { workOrdersApi, usersApi, locationsApi } from '../../services/api';
import { workOrderStatusStyles, workOrderPriorityStyles, workOrderPriorityLabels } from '../../config/theme';
import { useAuth } from '../../contexts/AuthContext';
import ViewWorkOrderModal from './ViewWorkOrderModal';
import EditClosedWorkOrderModal from './EditClosedWorkOrderModal';


interface WorkOrder {
  id: string;
  title: string;
  status: string;
  maintenanceType?: string;
  locativeCategory?: { id: string; name: string };
  priority?: string;
  assigneeType?: string;
  assigneeName?: string;
  assigneeEmail?: string;
  createdBy?: string;
  asset?: {
    id: string;
    code: string;
    description: string;
    category?: { name: string };
  };
  location: {
    id: string;
    name: string;
  };
  cost: number;
  materialsCost: number;
  createdAt: string;
  finishedAt?: string;
  closedAt?: string;
}

const WorkOrdersPage: React.FC = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterLocation, setFilterLocation] = useState<string | undefined>();
  const [filterAssignee, setFilterAssignee] = useState<string | undefined>();
  const [filterType, setFilterType] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [mobilePage, setMobilePage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Modals
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);

  const { user, hasAccess, hasPermission } = useAuth();
  const isJefe = hasAccess(['ADMIN'], ['EDITAR_OT', 'CERRAR_OT', 'ANULAR_OT']);
  const canSeeAllOT = hasPermission('VER_TODAS_OT');
  const canSeeAllLocativo = hasPermission('VER_TODAS_OT_LOCATIVO');
  const isPDV = !isJefe && !canSeeAllOT && !canSeeAllLocativo && (hasPermission('CREAR_OT_EQUIPO') || hasPermission('CREAR_OT_LOCATIVO')) && !hasPermission('INICIAR_OT') && !!user?.locationId;
  const isAssigneeView = !isJefe && !canSeeAllOT && !canSeeAllLocativo && !isPDV && hasPermission('VER_OT');

  const canEditClosed = hasPermission('EDITAR_OT_CERRADA');

  const formatCOP = (value: number) => {
    return `$${Math.round(value).toLocaleString('es-CO')}`;
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadWorkOrders();
    usersApi.getTechniciansAndContractors().then((res) => setTechnicians(res.data)).catch(() => {});
    locationsApi.getAll().then((res) => setLocations(res.data)).catch(() => {});
  }, [isJefe, canSeeAllOT, canSeeAllLocativo, isPDV, isAssigneeView, user?.email, user?.locationId]);

  useEffect(() => {
    applyFilters();
  }, [workOrders, searchText, filterLocation, filterAssignee, filterType, dateRange]);

  useEffect(() => {
    setMobilePage(1);
  }, [searchText, filterLocation, filterAssignee, filterType, dateRange]);

  const loadWorkOrders = async () => {
    try {
      setLoading(true);
      let response;

      if (isPDV && user?.email) {
        response = await workOrdersApi.getByCreator(user.email);
      } else if (isAssigneeView && user?.email) {
        response = await workOrdersApi.getByAssignee(user.email);
      } else {
        response = await workOrdersApi.getAll();
      }

      // Only show CERRADA orders, both EQUIPO and LOCATIVO
      let closedOrders = response.data.filter((wo: any) => wo.status === 'CERRADA');

      // Filter by type based on permissions:
      // VER_TODAS_OT → can see EQUIPO, VER_TODAS_OT_LOCATIVO → can see LOCATIVO
      if (!isJefe) {
        if (canSeeAllOT && !canSeeAllLocativo) {
          closedOrders = closedOrders.filter((wo: any) => wo.maintenanceType === 'EQUIPO');
        } else if (!canSeeAllOT && canSeeAllLocativo) {
          closedOrders = closedOrders.filter((wo: any) => wo.maintenanceType === 'LOCATIVO');
        }
      }

      setWorkOrders(closedOrders);
    } catch (error: any) {
      console.error('Error loading work orders:', error);
      message.error('Error al cargar órdenes de trabajo');
    } finally {
      setLoading(false);
    }
  };

  const hasActiveFilters = !!(searchText || filterLocation || filterAssignee || filterType || dateRange);

  const handleClearFilters = () => {
    setSearchText('');
    setFilterLocation(undefined);
    setFilterAssignee(undefined);
    setFilterType(undefined);
    setDateRange(null);
  };

  const applyFilters = () => {
    let filtered = [...workOrders];

    if (searchText) {
      const search = searchText.toLowerCase().replace(/^ot-/i, '');
      filtered = filtered.filter(
        (wo) =>
          wo.id.toLowerCase().includes(search) ||
          wo.title.toLowerCase().includes(search) ||
          (wo.asset?.code?.toLowerCase().includes(search)) ||
          (wo.asset?.description?.toLowerCase().includes(search)) ||
          (wo.locativeCategory?.name?.toLowerCase().includes(search))
      );
    }

    if (filterLocation) {
      filtered = filtered.filter((wo) => wo.location?.id === filterLocation);
    }

    if (filterAssignee) {
      filtered = filtered.filter((wo) => wo.assigneeEmail === filterAssignee);
    }

    if (filterType) {
      filtered = filtered.filter((wo) => wo.maintenanceType === filterType);
    }

    if (dateRange && dateRange[0] && dateRange[1]) {
      const start = dateRange[0].startOf('day');
      const end = dateRange[1].endOf('day');
      filtered = filtered.filter((wo) => {
        const date = dayjs(wo.closedAt || wo.createdAt);
        return date.isAfter(start) && date.isBefore(end);
      });
    }

    setFilteredOrders(filtered);
  };

  const handleView = (order: WorkOrder) => {
    setSelectedOrder(order);
    setViewModalOpen(true);
  };

  const handleEdit = (order: WorkOrder) => {
    setSelectedOrder(order);
    setEditModalOpen(true);
  };

  const getActionButtons = (record: WorkOrder, isMobileView = false) => {
    const buttons = [];

    const wrapTooltip = (key: string, title: string, btn: React.ReactNode) =>
      isMobileView ? <React.Fragment key={key}>{btn}</React.Fragment> : <Tooltip key={key} title={title}>{btn}</Tooltip>;

    buttons.push(
      wrapTooltip("view", "Ver detalles",
        <Button
          type={isMobileView ? "default" : "text"}
          icon={<EyeOutlined style={{ color: '#1890ff' }} />}
          onClick={() => handleView(record)}
          block={isMobileView}
        >
          {isMobileView && "Ver"}
        </Button>
      )
    );

    // Edit closed OT - controlled by EDITAR_OT_CERRADA
    if (isJefe || canEditClosed) {
      buttons.push(
        wrapTooltip("edit", "Editar OT cerrada",
          <Button
            type={isMobileView ? "default" : "text"}
            icon={<EditOutlined style={{ color: '#faad14' }} />}
            onClick={() => handleEdit(record)}
            block={isMobileView}
          >
            {isMobileView && "Editar"}
          </Button>
        )
      );
    }

    return isMobileView ? (
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        {buttons}
      </Space>
    ) : (
      <Space size="small">{buttons}</Space>
    );
  };

  const renderMobileCard = (record: WorkOrder) => (
    <Card
      key={record.id}
      style={{ marginBottom: 12, borderLeft: `4px solid ${workOrderStatusStyles[record.status]?.color || '#d9d9d9'}`, borderBottom: `4px solid ${workOrderStatusStyles[record.status]?.color || '#d9d9d9'}`, cursor: 'pointer' }}
      size="small"
      onClick={() => setExpandedCardId(expandedCardId === record.id ? null : record.id)}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <div style={{ fontFamily: "'Segoe UI', sans-serif", fontSize: 14, fontWeight: 600, color: '#8c8c8c', marginBottom: 8 }}>
              OT-{record.id.substring(0, 8)}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <Tag color={record.maintenanceType === 'EQUIPO' ? 'blue-inverse' : 'purple-inverse'} style={{ width: 90, textAlign: 'center', display: 'inline-block' }}>
                {record.maintenanceType === 'EQUIPO' ? (
                  <><ToolOutlined /> EQUIPO</>
                ) : (
                  <><HomeOutlined /> LOCATIVO</>
                )}
              </Tag>
              {record.priority && (
                <Tag style={{ backgroundColor: workOrderPriorityStyles[record.priority]?.bg, color: workOrderPriorityStyles[record.priority]?.color, border: 'none', width: 60, textAlign: 'center', display: 'inline-block' }}>
                  {workOrderPriorityLabels[record.priority as keyof typeof workOrderPriorityLabels]}
                </Tag>
              )}
            </div>
          </div>
          <Tag style={{ backgroundColor: workOrderStatusStyles[record.status]?.bg, color: workOrderStatusStyles[record.status]?.color, border: 'none', width: 90, textAlign: 'center', display: 'inline-block', margin: 0 }}>
            {record.status}
          </Tag>
        </div>

        {record.maintenanceType === 'EQUIPO' && record.asset ? (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{record.asset.code}</div>
            <div style={{ fontSize: 15, color: '#8c8c8c' }}>{record.asset.description}</div>
          </div>
        ) : (
          <span style={{ fontSize: 12, marginBottom: 8, display: 'inline-block' }}>
            {record.locativeCategory?.name || 'LOCATIVO'}
          </span>
        )}

        <div style={{ fontSize: 13, marginBottom: 4 }}>
          <strong>Solicitud:</strong> {record.title}
        </div>

        <div style={{ fontSize: 14, color: '#8c8c8c', marginBottom: 4, fontWeight: 700 }}>
           {record.location.name}
        </div>

        {record.assigneeName && (
          <div style={{ fontSize: 12, marginBottom: 4 }}>
            <div><strong>Asignado:</strong> {record.assigneeName}</div>
            <Tag color={record.assigneeType === 'INTERNO' ? 'blue' : 'orange'}>
              {record.assigneeType}
            </Tag>
          </div>
        )}

        <div style={{ fontSize: 13, fontWeight: 600, color: '#E60012', marginBottom: 4 }}>
          {formatCOP(Number(record.cost || 0) + Number(record.materialsCost || 0))}
          {(Number(record.cost || 0) > 0 || Number(record.materialsCost || 0) > 0) && (
            <span style={{ fontSize: 11, color: '#888', fontWeight: 400, marginLeft: 6 }}>
              ({Number(record.cost || 0) > 0 ? `Trab: ${formatCOP(record.cost)}` : ''}{Number(record.cost || 0) > 0 && Number(record.materialsCost || 0) > 0 ? ' + ' : ''}{Number(record.materialsCost || 0) > 0 ? `Mat: ${formatCOP(record.materialsCost)}` : ''})
            </span>
          )}
        </div>

        <div style={{ fontSize: 11, color: '#8c8c8c' }}>
          Cerrada: {record.closedAt ? new Date(record.closedAt).toLocaleDateString('es-CO') : new Date(record.createdAt).toLocaleDateString('es-CO')}
        </div>
      </div>

      {expandedCardId === record.id && (
        <div
          style={{ marginTop: 8, borderTop: '1px solid #f0f0f0', paddingTop: 8 }}
          onClick={(e) => e.stopPropagation()}
        >
          {getActionButtons(record, true)}
        </div>
      )}
    </Card>
  );

  const allColumns: ColumnsType<WorkOrder> = [
    {
      title: 'Cerrada',
      key: 'closedAt',
      width: 100,
      ellipsis: true,
      sorter: (a, b) => new Date(a.closedAt || a.createdAt).getTime() - new Date(b.closedAt || b.createdAt).getTime(),
      defaultSortOrder: 'descend',
      render: (_, record) => new Date(record.closedAt || record.createdAt).toLocaleDateString('es-CO'),
    },
    {
      title: 'OT',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      ellipsis: true,
      render: (id) => (
        <span style={{ fontFamily: 'monospace', fontSize: 13 }}>
          {id.substring(0, 8)}
        </span>
      ),
    },
    {
      title: 'Ubicación',
      dataIndex: ['location', 'name'],
      key: 'location',
      width: 120,
      align: 'center',
      ellipsis: true,
      sorter: (a, b) => (a.location?.name || '').localeCompare(b.location?.name || ''),
    },
    {
      title: 'Tipo',
      dataIndex: 'maintenanceType',
      key: 'maintenanceType',
      width: 90,
      ellipsis: true,
      sorter: (a, b) => (a.maintenanceType || '').localeCompare(b.maintenanceType || ''),
      render: (type) => (
        <Tag color={type === 'EQUIPO' ? 'blue-inverse' : 'purple-inverse'} style={{ width: 90, textAlign: 'center', display: 'inline-block' }}>
          {type === 'EQUIPO' ? (
            <><ToolOutlined /> EQUIPO</>
          ) : (
            <><HomeOutlined /> LOCATIVO</>
          )}
        </Tag>
      ),
    },
    {
      title: 'Prioridad',
      dataIndex: 'priority',
      key: 'priority',
      width: 90,
      ellipsis: true,
      sorter: (a, b) => (a.priority || '').localeCompare(b.priority || ''),
      render: (priority: string) => priority ? (
        <Tag style={{ backgroundColor: workOrderPriorityStyles[priority]?.bg, color: workOrderPriorityStyles[priority]?.color, border: 'none', width: 60, textAlign: 'center', display: 'inline-block' }}>
          {workOrderPriorityLabels[priority as keyof typeof workOrderPriorityLabels]}
        </Tag>
      ) : <span style={{ color: '#8c8c8c' }}>—</span>,
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      ellipsis: true,
      render: (status) => (
        <Tag style={{ backgroundColor: workOrderStatusStyles[status]?.bg, color: workOrderStatusStyles[status]?.color, border: 'none', width: 90, textAlign: 'center', display: 'inline-block' }}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Equipo / Categoría',
      key: 'asset_or_category',
      width: 150,
      ellipsis: true,
      sorter: (a, b) => {
        const aVal = a.asset?.code || a.locativeCategory?.name || '';
        const bVal = b.asset?.code || b.locativeCategory?.name || '';
        return aVal.localeCompare(bVal);
      },
      render: (_, record) => {
        if (record.maintenanceType === 'EQUIPO' && record.asset) {
          return record.asset.code;
        } else {
          return record.locativeCategory?.name || 'LOCATIVO';
        }
      },
    },
    {
      title: 'Asignado a',
      key: 'assignee',
      width: 120,
      ellipsis: true,
      sorter: (a, b) => (a.assigneeName || '').localeCompare(b.assigneeName || ''),
      render: (_, record) =>
        record.assigneeName ? record.assigneeName : (
          <span style={{ color: '#8c8c8c' }}>Sin asignar</span>
        ),
    },
    {
      title: 'Solicitud',
      dataIndex: 'title',
      key: 'title',
      width: 150,
      ellipsis: true,
      sorter: (a, b) => (a.title || '').localeCompare(b.title || ''),
    },
    {
      title: 'Trabajo',
      dataIndex: 'cost',
      key: 'cost',
      width: 90,
      ellipsis: true,
      sorter: (a, b) => Number(a.cost || 0) - Number(b.cost || 0),
      render: (cost) => Number(cost) > 0 ? formatCOP(cost) : <span style={{ color: '#8c8c8c' }}>—</span>,
    },
    {
      title: 'Materiales',
      dataIndex: 'materialsCost',
      key: 'materialsCost',
      width: 90,
      ellipsis: true,
      sorter: (a, b) => Number(a.materialsCost || 0) - Number(b.materialsCost || 0),
      render: (val) => val && Number(val) > 0 ? formatCOP(val) : <span style={{ color: '#8c8c8c' }}>—</span>,
    },
    {
      title: 'Total',
      key: 'total',
      width: 90,
      ellipsis: true,
      sorter: (a, b) => (Number(a.cost || 0) + Number(a.materialsCost || 0)) - (Number(b.cost || 0) + Number(b.materialsCost || 0)),
      render: (_, record) => formatCOP(Number(record.cost || 0) + Number(record.materialsCost || 0)),
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 120,
      render: (_, record) => getActionButtons(record, false),
    },
  ];

  const columns = allColumns;

  return (
    <div style={{ height: isMobile ? 'auto' : 'calc(100vh - 112px)', display: 'flex', flexDirection: 'column' }}>
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <Space>
              <FileTextOutlined style={{ fontSize: isMobile ? 14 : 18, color: '#E60012' }} />
              <span style={{ fontSize: isMobile ? 14 : 16, fontWeight: 600 }}>Órdenes de Trabajo</span>
            </Space>
          </div>
        }
        styles={{ header: isMobile ? { padding: '0 12px', minHeight: 40 } : {}, body: { padding: isMobile ? 12 : '12px 24px', flex: 1, display: 'flex', flexDirection: 'column', overflow: isMobile ? 'auto' : 'hidden' } }}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: isMobile ? 'auto' : 'hidden' }}
      >
        {/* Filtros */}
        {isMobile ? (
          <div style={{ marginBottom: 12 }}>
            <Button
              icon={<FilterOutlined />}
              onClick={() => setFiltersOpen(!filtersOpen)}
              block
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: '#fff',
                color: hasActiveFilters ? '#E60012' : 'rgba(0,0,0,0.88)',
                borderColor: hasActiveFilters ? '#E60012' : '#d9d9d9',
              }}
            >
              Filtros{hasActiveFilters ? ` (${[searchText, filterAssignee, filterLocation, filterType, dateRange].filter(Boolean).length})` : ''}
            </Button>
            {filtersOpen && (
              <Card size="small" style={{ marginTop: 8, background: '#fafafa' }}>
                <Row gutter={[8, 8]}>
                  <Col xs={24}>
                    <Input
                      placeholder="Buscar..."
                      prefix={<SearchOutlined />}
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      allowClear
                      size="large"
                    />
                  </Col>
                  <Col xs={24}>
                    <Select
                      placeholder="Tipo"
                      style={{ width: '100%' }}
                      value={filterType}
                      onChange={setFilterType}
                      allowClear
                      size="large"
                    >
                      <Select.Option value="EQUIPO">Equipo</Select.Option>
                      <Select.Option value="LOCATIVO">Locativo</Select.Option>
                    </Select>
                  </Col>
                  {!isAssigneeView && !isPDV && (
                    <Col xs={24}>
                      <Select
                        placeholder="Técnico/Contratista"
                        style={{ width: '100%' }}
                        value={filterAssignee}
                        onChange={setFilterAssignee}
                        allowClear
                        showSearch
                        optionFilterProp="children"
                        size="large"
                      >
                        {technicians
                          .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email))
                          .map((tech) => (
                            <Select.Option key={tech.id} value={tech.email}>
                              {tech.name || tech.email.split('@')[0]}
                            </Select.Option>
                          ))}
                      </Select>
                    </Col>
                  )}
                  {!isPDV && (
                    <Col xs={24}>
                      <Select
                        placeholder="Ubicación"
                        style={{ width: '100%' }}
                        value={filterLocation}
                        onChange={setFilterLocation}
                        allowClear
                        showSearch
                        optionFilterProp="children"
                        size="large"
                      >
                        {locations
                          .sort((a: any, b: any) => a.name.localeCompare(b.name))
                          .map((loc: any) => (
                            <Select.Option key={loc.id} value={loc.id}>
                              {loc.name}
                            </Select.Option>
                          ))}
                      </Select>
                    </Col>
                  )}
                  <Col xs={12}>
                    <DatePicker
                      style={{ width: '100%' }}
                      placeholder="Desde"
                      value={dateRange?.[0] || null}
                      onChange={(date) => setDateRange(date ? [date, dateRange?.[1] || date] : null)}
                      format="DD/MM/YYYY"
                      size="large"
                      placement="topLeft"
                    />
                  </Col>
                  <Col xs={12}>
                    <DatePicker
                      style={{ width: '100%' }}
                      placeholder="Hasta"
                      value={dateRange?.[1] || null}
                      onChange={(date) => setDateRange(date ? [dateRange?.[0] || date, date] : null)}
                      format="DD/MM/YYYY"
                      size="large"
                      placement="topRight"
                    />
                  </Col>
                  <Col xs={24}>
                    <Button
                      icon={<ClearOutlined />}
                      onClick={handleClearFilters}
                      disabled={!hasActiveFilters}
                      block
                      size="large"
                    >
                      Limpiar
                    </Button>
                  </Col>
                </Row>
                {hasActiveFilters && (
                  <div style={{ marginTop: 8, color: '#1890ff', fontSize: 11 }}>
                    Mostrando {filteredOrders.length} de {workOrders.length} órdenes
                  </div>
                )}
              </Card>
            )}
          </div>
        ) : (
          <Card size="small" style={{ marginBottom: 12, background: '#fafafa' }}>
            <Row gutter={[8, 8]}>
              <Col sm={12} md={4}>
                <Input
                  placeholder="Buscar OT..."
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  allowClear
                  size="middle"
                />
              </Col>
              <Col sm={12} md={2}>
                <Select
                  placeholder="Tipo"
                  style={{ width: '100%' }}
                  value={filterType}
                  onChange={setFilterType}
                  allowClear
                  size="middle"
                >
                  <Select.Option value="EQUIPO">Equipo</Select.Option>
                  <Select.Option value="LOCATIVO">Locativo</Select.Option>
                </Select>
              </Col>
              {!isAssigneeView && !isPDV && (
                <Col sm={12} md={4}>
                  <Select
                    placeholder="Técnico/Contratista"
                    style={{ width: '100%' }}
                    value={filterAssignee}
                    onChange={setFilterAssignee}
                    allowClear
                    showSearch
                    optionFilterProp="children"
                    size="middle"
                  >
                    {technicians
                      .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email))
                      .map((tech) => (
                        <Select.Option key={tech.id} value={tech.email}>
                          {tech.name || tech.email.split('@')[0]}
                        </Select.Option>
                      ))}
                  </Select>
                </Col>
              )}
              {!isPDV && (
                <Col sm={12} md={4}>
                  <Select
                    placeholder="Ubicación"
                    style={{ width: '100%' }}
                    value={filterLocation}
                    onChange={setFilterLocation}
                    allowClear
                    showSearch
                    optionFilterProp="children"
                    size="middle"
                  >
                    {locations
                      .sort((a: any, b: any) => a.name.localeCompare(b.name))
                      .map((loc: any) => (
                        <Select.Option key={loc.id} value={loc.id}>
                          {loc.name}
                        </Select.Option>
                      ))}
                  </Select>
                </Col>
              )}
              <Col sm={12} md={4}>
                <DatePicker.RangePicker
                  style={{ width: '100%' }}
                  value={dateRange}
                  onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
                  format="DD/MM/YYYY"
                  size="middle"
                />
              </Col>
              <Col sm={12} md={3}>
                <Button
                  icon={<ClearOutlined />}
                  onClick={handleClearFilters}
                  disabled={!hasActiveFilters}
                  block
                  size="middle"
                >
                  Limpiar
                </Button>
              </Col>
            </Row>
            {hasActiveFilters && (
              <div style={{ marginTop: 8, color: '#1890ff', fontSize: 12 }}>
                Mostrando {filteredOrders.length} de {workOrders.length} órdenes
              </div>
            )}
          </Card>
        )}

        {/* Lista */}
        {isMobile ? (
          loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>Cargando...</div>
          ) : filteredOrders.length > 0 ? (
            <div style={{ background: '#E0E0E0', borderRadius: 10, padding: 12 }}>
              {filteredOrders.slice((mobilePage - 1) * 5, mobilePage * 5).map(renderMobileCard)}
              <Pagination
                current={mobilePage}
                pageSize={5}
                total={filteredOrders.length}
                onChange={(page) => setMobilePage(page)}
                size="small"
                simple
                style={{ textAlign: 'center', marginTop: 8 }}
              />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }}>
              No hay órdenes de trabajo cerradas
            </div>
          )
        ) : (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Table
              columns={columns}
              dataSource={filteredOrders}
              rowKey="id"
              loading={loading}
              size="small"
              tableLayout="fixed"
              scroll={{ y: 'calc(100vh - 310px)' }}
              pagination={{
                total: filteredOrders.length,
                pageSize: 10,
                showTotal: (total) => `Total: ${total} órdenes`,
                size: 'small',
                showSizeChanger: false,
              }}
            />
          </div>
        )}
      </Card>

      {/* Modals */}
      {selectedOrder && (
        <>
          <ViewWorkOrderModal
            open={viewModalOpen}
            onClose={() => setViewModalOpen(false)}
            workOrder={selectedOrder}
            showEditButton={(isJefe || canEditClosed)}
            onEdit={() => {
              setViewModalOpen(false);
              setEditModalOpen(true);
            }}
          />

          <EditClosedWorkOrderModal
            open={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            onSuccess={loadWorkOrders}
            workOrder={selectedOrder}
          />
        </>
      )}
    </div>
  );
};

export default WorkOrdersPage;
