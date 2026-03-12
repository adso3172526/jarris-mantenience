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
  Divider,
  DatePicker,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  EyeOutlined,
  UserAddOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
  SearchOutlined,
  CloseSquareOutlined,
  CameraOutlined,
  ToolOutlined,
  HomeOutlined,
  EditOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { workOrdersApi, usersApi, locationsApi } from '../../services/api';
import { workOrderStatusColors } from '../../config/theme';
import { useAuth } from '../../contexts/AuthContext';
import CreateWorkOrderModal from './CreateWorkOrderModal';
import ViewWorkOrderModal from './ViewWorkOrderModal';
import AssignWorkOrderModal from './AssignWorkOrderModal';
import StartWorkOrderModal from './StartWorkOrderModal';
import FinishWorkOrderModal from './FinishWorkOrderModal';
import CloseWorkOrderModal from './CloseWorkOrderModal';
import RejectWorkOrderModal from './RejectWorkOrderModal';
import UploadPhotosModal from './UploadPhotosModal';
import EditClosedWorkOrderModal from './EditClosedWorkOrderModal';
import { message } from 'antd';


interface WorkOrder {
  id: string;
  title: string;
  status: string;
  maintenanceType?: string;
  locativeCategory?: string;
  assigneeType?: string;
  assigneeName?: string;
  assigneeEmail?: string;
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
  createdAt: string;
  finishedAt?: string;
  closedAt?: string;
}

const WorkOrdersPage: React.FC = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [filterLocation, setFilterLocation] = useState<string | undefined>();
  const [filterAssignee, setFilterAssignee] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [photosModalOpen, setPhotosModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);

  const { user, hasRole } = useAuth();
  const isJefe = hasRole(['ADMIN', 'JEFE_MANTENIMIENTO']);
  const isTecnico = hasRole('TECNICO_INTERNO');
  const isContratista = hasRole('CONTRATISTA');
  const isPDV = hasRole('PDV');

  const formatCOP = (value: number) => {
    return `$${Math.round(value).toLocaleString('es-CO')}`;
  };

  // Detect mobile on resize
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
  }, []);

  useEffect(() => {
    applyFilters();
  }, [workOrders, searchText, filterStatus, filterLocation, filterAssignee, dateRange]);

  const loadWorkOrders = async () => {
    try {
      setLoading(true);
      let response;
      
      if (isPDV && user?.email) {
        response = await workOrdersApi.getByLocation(user.locationId!);
      } else if ((isTecnico || isContratista) && user?.email) {
        response = await workOrdersApi.getByAssignee(user.email);
      } else {
        response = await workOrdersApi.getAll();
      }

      setWorkOrders(response.data);
    } catch (error: any) {
      console.error('Error loading work orders:', error);
      message.error('Error al cargar ordenes de trabajo');
    } finally {
      setLoading(false);
    }
  };

  const hasActiveFilters = !!(searchText || filterStatus || filterLocation || filterAssignee || dateRange);

  const handleClearFilters = () => {
    setSearchText('');
    setFilterStatus(undefined);
    setFilterLocation(undefined);
    setFilterAssignee(undefined);
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
          (wo.locativeCategory?.toLowerCase().includes(search))
      );
    }

    if (filterStatus) {
      filtered = filtered.filter((wo) => wo.status === filterStatus);
    }

    if (filterLocation) {
      filtered = filtered.filter((wo) => wo.location?.id === filterLocation);
    }

    if (filterAssignee) {
      filtered = filtered.filter((wo) => wo.assigneeEmail === filterAssignee);
    }

    if (dateRange && dateRange[0] && dateRange[1]) {
      const start = dateRange[0].startOf('day');
      const end = dateRange[1].endOf('day');
      filtered = filtered.filter((wo) => {
        const date = dayjs(wo.createdAt);
        return date.isAfter(start) && date.isBefore(end);
      });
    }

    setFilteredOrders(filtered);
  };

  const handleView = (order: WorkOrder) => {
    setSelectedOrder(order);
    setViewModalOpen(true);
  };

  const handleAssign = (order: WorkOrder) => {
    setSelectedOrder(order);
    setAssignModalOpen(true);
  };

  const handleStart = (order: WorkOrder) => {
    setSelectedOrder(order);
    setStartModalOpen(true);
  };

  const handleFinish = (order: WorkOrder) => {
    setSelectedOrder(order);
    setFinishModalOpen(true);
  };

  const handleClose = (order: WorkOrder) => {
    setSelectedOrder(order);
    setCloseModalOpen(true);
  };

  const handleReject = (order: WorkOrder) => {
    setSelectedOrder(order);
    setRejectModalOpen(true);
  };

  const handlePhotos = (order: WorkOrder) => {
    setSelectedOrder(order);
    setPhotosModalOpen(true);
  };

  const getActionButtons = (record: WorkOrder, isMobileView = false) => {
    const buttons = [];

    // Ver siempre disponible
    buttons.push(
      <Tooltip key="view" title="Ver detalles">
        <Button
          type={isMobileView ? "default" : "text"}
          icon={<EyeOutlined style={{ color: '#1890ff' }} />}
          onClick={() => handleView(record)}
          block={isMobileView}
        >
          {isMobileView && "Ver"}
        </Button>
      </Tooltip>
    );

    // Subir fotos
    if (record.status !== 'CERRADA' && record.status !== 'RECHAZADA') {
      buttons.push(
        <Tooltip key="photos" title="Subir fotos">
          <Button
            type={isMobileView ? "default" : "text"}
            icon={<CameraOutlined />}
            onClick={() => handlePhotos(record)}
            style={{ color: '#722ed1' }}
            block={isMobileView}
          >
            {isMobileView && "Fotos"}
          </Button>
        </Tooltip>
      );
    }

    // Rechazar
    if (isJefe && record.status === 'NUEVA') {
      buttons.push(
        <Tooltip key="reject" title="Rechazar">
          <Button
            type={isMobileView ? "default" : "text"}
            danger
            icon={<CloseSquareOutlined />}
            onClick={() => handleReject(record)}
            block={isMobileView}
          >
            {isMobileView && "Rechazar"}
          </Button>
        </Tooltip>
      );
    }

    // Asignar
    if (isJefe && record.status === 'NUEVA') {
      buttons.push(
        <Tooltip key="assign" title="Asignar">
          <Button
            type={isMobileView ? "primary" : "text"}
            icon={<UserAddOutlined />}
            onClick={() => handleAssign(record)}
            block={isMobileView}
          >
            {isMobileView && "Asignar"}
          </Button>
        </Tooltip>
      );
    }

    // Reasignar
    if (isJefe && record.status === 'ASIGNADA') {
      buttons.push(
        <Tooltip key="reassign" title="Reasignar">
          <Button
            type={isMobileView ? "default" : "text"}
            icon={<UserAddOutlined />}
            onClick={() => handleAssign(record)}
            style={{ color: '#faad14' }}
            block={isMobileView}
          >
            {isMobileView && "Reasignar"}
          </Button>
        </Tooltip>
      );
    }

    // Iniciar
    if ((isTecnico || isContratista) && record.status === 'ASIGNADA') {
      buttons.push(
        <Tooltip key="start" title="Iniciar">
          <Button
            type={isMobileView ? "primary" : "text"}
            icon={<PlayCircleOutlined />}
            onClick={() => handleStart(record)}
            style={!isMobileView ? { color: '#52c41a' } : { backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            block={isMobileView}
          >
            {isMobileView && "Iniciar"}
          </Button>
        </Tooltip>
      );
    }

    // Finalizar (solo si ya inició)
    if ((isTecnico || isContratista) && record.status === 'EN_PROCESO') {
      buttons.push(
        <Tooltip key="finish" title="Finalizar">
          <Button
            type={isMobileView ? "primary" : "text"}
            icon={<CheckCircleOutlined />}
            onClick={() => handleFinish(record)}
            style={!isMobileView ? { color: '#faad14' } : { backgroundColor: '#faad14', borderColor: '#faad14' }}
            block={isMobileView}
          >
            {isMobileView && "Finalizar"}
          </Button>
        </Tooltip>
      );
    }

    // Cerrar
    if (isJefe && record.status === 'TERMINADA') {
      buttons.push(
        <Tooltip key="close" title="Cerrar OT">
          <Button
            type={isMobileView ? "primary" : "text"}
            icon={<CloseCircleOutlined />}
            onClick={() => handleClose(record)}
            style={!isMobileView ? { color: '#E60012' } : { backgroundColor: '#E60012', borderColor: '#E60012' }}
            block={isMobileView}
          >
            {isMobileView && "Cerrar"}
          </Button>
        </Tooltip>
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

  // Mobile Card View
  const renderMobileCard = (record: WorkOrder) => (
    <Card 
      key={record.id} 
      style={{ marginBottom: 12 }}
      size="small"
    >
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#8c8c8c' }}>
            OT-{record.id.substring(0, 8)}
          </span>
          <Tag color={workOrderStatusColors[record.status as keyof typeof workOrderStatusColors]}>
            {record.status}
          </Tag>
        </div>
        
        <div style={{ marginBottom: 8 }}>
          <Tag color={record.maintenanceType === 'EQUIPO' ? 'blue' : 'green'} style={{ marginBottom: 4 }}>
            {record.maintenanceType === 'EQUIPO' ? (
              <><ToolOutlined /> EQUIPO</>
            ) : (
              <><HomeOutlined /> LOCATIVO</>
            )}
          </Tag>
        </div>

        {record.maintenanceType === 'EQUIPO' && record.asset ? (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{record.asset.code}</div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>{record.asset.description}</div>
          </div>
        ) : (
          <Tag color="green" style={{ marginBottom: 8 }}>
            {record.locativeCategory || 'LOCATIVO'}
          </Tag>
        )}

        <div style={{ fontSize: 13, marginBottom: 4 }}>
          <strong>Solicitud:</strong> {record.title}
        </div>

        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>
           {record.location.name}
        </div>

        {!isPDV && record.assigneeName && (
          <div style={{ fontSize: 12, marginBottom: 4 }}>
            <strong>Asignado:</strong> {record.assigneeName}{' '}
            <Tag size="small" color={record.assigneeType === 'INTERNO' ? 'blue' : 'orange'}>
              {record.assigneeType}
            </Tag>
          </div>
        )}

        {!isPDV && (
          <div style={{ fontSize: 13, fontWeight: 600, color: '#E60012', marginBottom: 4 }}>
            {formatCOP(record.cost)}
          </div>
        )}

        <div style={{ fontSize: 11, color: '#8c8c8c' }}>
          {new Date(record.createdAt).toLocaleDateString('es-CO')}
        </div>

      </div>

      <Divider style={{ margin: '8px 0' }} />

      {getActionButtons(record, true)}
    </Card>
  );

  // Desktop Table Columns
  const allColumns: ColumnsType<WorkOrder> = [
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
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      ellipsis: true,
      sorter: (a, b) => a.status.localeCompare(b.status),
      render: (status) => (
        <Tag color={workOrderStatusColors[status as keyof typeof workOrderStatusColors]}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Tipo',
      dataIndex: 'maintenanceType',
      key: 'maintenanceType',
      width: 90,
      ellipsis: true,
      sorter: (a, b) => (a.maintenanceType || '').localeCompare(b.maintenanceType || ''),
      render: (type) => (
        <Tag color={type === 'EQUIPO' ? 'blue' : 'green'}>
          {type === 'EQUIPO' ? (
            <><ToolOutlined /> EQUIPO</>
          ) : (
            <><HomeOutlined /> LOCATIVO</>
          )}
        </Tag>
      ),
    },
    {
      title: 'Equipo / Categoría',
      key: 'asset_or_category',
      width: 150,
      ellipsis: true,
      sorter: (a, b) => {
        const aVal = a.asset?.code || a.locativeCategory || '';
        const bVal = b.asset?.code || b.locativeCategory || '';
        return aVal.localeCompare(bVal);
      },
      render: (_, record) => {
        if (record.maintenanceType === 'EQUIPO' && record.asset) {
          return record.asset.code;
        } else {
          return record.locativeCategory || 'LOCATIVO';
        }
      },
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
      title: 'Ubicación',
      dataIndex: ['location', 'name'],
      key: 'location',
      width: 120,
      ellipsis: true,
      sorter: (a, b) => (a.location?.name || '').localeCompare(b.location?.name || ''),
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
      title: 'Costo',
      dataIndex: 'cost',
      key: 'cost',
      width: 100,
      ellipsis: true,
      sorter: (a, b) => Number(a.cost || 0) - Number(b.cost || 0),
      render: (cost) => formatCOP(cost),
    },
    {
      title: 'Creada',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 100,
      ellipsis: true,
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: 'descend',
      render: (date) => new Date(date).toLocaleDateString('es-CO'),
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 160,
      render: (_, record) => getActionButtons(record, false),
    },
  ];

  // PDV: hide columns not relevant to them
  const hiddenForPDV = ['assignee', 'cost'];
  const columns = isPDV
    ? allColumns.filter((c) => !hiddenForPDV.includes(c.key as string))
    : allColumns;

  return (
    <div style={{ height: isMobile ? 'auto' : 'calc(100vh - 112px)', display: 'flex', flexDirection: 'column' }}>
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <Space>
              <FileTextOutlined style={{ fontSize: 18, color: '#E60012' }} />
              <span style={{ fontSize: isMobile ? 16 : 16, fontWeight: 600 }}>{isPDV ? 'Mis Solicitudes' : 'Ordenes de Trabajo'}</span>
            </Space>
            {(isPDV || isJefe || hasRole('ADMIN')) && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateModalOpen(true)}
                size="middle"
              >
                {isMobile ? "Nueva" : "Nueva Solicitud"}
              </Button>
            )}
          </div>
        }
        styles={{ body: { padding: isMobile ? 12 : '12px 24px', flex: 1, display: 'flex', flexDirection: 'column', overflow: isMobile ? 'auto' : 'hidden' } }}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: isMobile ? 'auto' : 'hidden' }}
      >
        {/* Filtros */}
        <Card size="small" style={{ marginBottom: 12, background: '#fafafa' }}>
          <Row gutter={[8, 8]}>
            <Col xs={24} sm={12} md={4}>
              <Input
                placeholder={isMobile ? 'Buscar...' : 'Buscar OT...'}
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                size={isMobile ? 'large' : 'middle'}
              />
            </Col>
            <Col xs={24} sm={12} md={3}>
              <Select
                placeholder="Estado"
                style={{ width: '100%' }}
                value={filterStatus}
                onChange={setFilterStatus}
                allowClear
                size={isMobile ? 'large' : 'middle'}
              >
                <Select.Option value="NUEVA">Nueva</Select.Option>
                <Select.Option value="ASIGNADA">Asignada</Select.Option>
                <Select.Option value="EN_PROCESO">En Proceso</Select.Option>
                <Select.Option value="TERMINADA">Terminada</Select.Option>
                <Select.Option value="CERRADA">Cerrada</Select.Option>
                <Select.Option value="RECHAZADA">Rechazada</Select.Option>
              </Select>
            </Col>
            {!isTecnico && !isContratista && !isPDV && (
              <Col xs={24} sm={12} md={4}>
                <Select
                  placeholder="Técnico/Contratista"
                  style={{ width: '100%' }}
                  value={filterAssignee}
                  onChange={setFilterAssignee}
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  size={isMobile ? 'large' : 'middle'}
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
              <Col xs={24} sm={12} md={4}>
                <Select
                  placeholder="Ubicación"
                  style={{ width: '100%' }}
                  value={filterLocation}
                  onChange={setFilterLocation}
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  size={isMobile ? 'large' : 'middle'}
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
            {isMobile && (
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
            )}
            {isMobile ? (
              <>
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
              </>
            ) : (
              <>
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
              </>
            )}
          </Row>
          {hasActiveFilters && (
            <div style={{ marginTop: 8, color: '#1890ff', fontSize: isMobile ? 11 : 12 }}>
              Mostrando {filteredOrders.length} de {workOrders.length} órdenes
            </div>
          )}
        </Card>

        {/* Lista */}
        {isMobile ? (
          loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>Cargando...</div>
          ) : filteredOrders.length > 0 ? (
            <div style={{ background: '#E0E0E0', borderRadius: 10, padding: 12 }}>
              {filteredOrders.map(renderMobileCard)}
              <div style={{ textAlign: 'center', marginTop: 8, color: '#bdc3c7', fontSize: 12 }}>
                Total: {filteredOrders.length} ordenes
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }}>
              No hay ordenes de trabajo
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
                showTotal: (total) => `Total: ${total} ordenes`,
                size: 'small',
                showSizeChanger: false,
              }}
            />
          </div>
        )}
      </Card>

      {/* Modals */}
      <CreateWorkOrderModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={loadWorkOrders}
      />

      {selectedOrder && (
        <>
          <ViewWorkOrderModal
            open={viewModalOpen}
            onClose={() => setViewModalOpen(false)}
            workOrder={selectedOrder}
            showEditButton={isJefe && selectedOrder.status === 'CERRADA'}
            onEdit={() => {
              setViewModalOpen(false);
              setEditModalOpen(true);
            }}
          />

          <AssignWorkOrderModal
            open={assignModalOpen}
            onClose={() => setAssignModalOpen(false)}
            onSuccess={loadWorkOrders}
            workOrder={selectedOrder}
          />

          <StartWorkOrderModal
            open={startModalOpen}
            onClose={() => setStartModalOpen(false)}
            onSuccess={loadWorkOrders}
            workOrder={selectedOrder}
          />

          <FinishWorkOrderModal
            open={finishModalOpen}
            onClose={() => setFinishModalOpen(false)}
            onSuccess={loadWorkOrders}
            workOrder={selectedOrder}
          />

          <CloseWorkOrderModal
            open={closeModalOpen}
            onClose={() => setCloseModalOpen(false)}
            onSuccess={loadWorkOrders}
            workOrder={selectedOrder}
          />

          <RejectWorkOrderModal
            open={rejectModalOpen}
            onClose={() => setRejectModalOpen(false)}
            onSuccess={loadWorkOrders}
            workOrder={selectedOrder}
          />

          <UploadPhotosModal
            open={photosModalOpen}
            onClose={() => setPhotosModalOpen(false)}
            onSuccess={loadWorkOrders}
            workOrder={selectedOrder}
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
