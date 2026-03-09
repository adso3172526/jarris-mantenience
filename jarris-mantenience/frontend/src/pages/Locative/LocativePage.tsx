import React, { useEffect, useState } from 'react';
import {
  Table,
  Card,
  Tag,
  Space,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  Button,
  Divider,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  HomeOutlined,
  SearchOutlined,
  ClearOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { workOrdersApi, locationsApi, usersApi } from '../../services/api';
import { workOrderStatusColors } from '../../config/theme';
import ViewWorkOrderModal from '../WorkOrders/ViewWorkOrderModal';

const { RangePicker } = DatePicker;

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
  };
  location: {
    id: string;
    name: string;
  };
  cost: number;
  createdAt: string;
  finishedAt?: string;
  closedAt?: string;
  workDoneDescription?: string;
}

const locativeCategoryLabels: Record<string, string> = {
  PINTURA: 'Pintura y Acabados',
  ELECTRICO: 'Sistema Eléctrico',
  ESTRUCTURAL: 'Estructura y Obra Civil',
  PLOMERIA: 'Plomería e Hidráulica',
  HVAC: 'Climatización (HVAC)',
  PISOS: 'Pisos y Revestimientos',
  FACHADA: 'Fachada Exterior',
  CARPINTERIA: 'Carpintería y Mobiliario',
  OTROS: 'Otros',
};

const formatCOP = (value: number) => {
  return `$${Math.round(value).toLocaleString('es-CO')}`;
};

const LocativePage: React.FC = () => {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Modal
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);

  // Filtros
  const [searchText, setSearchText] = useState('');
  const [filterAssignee, setFilterAssignee] = useState<string | undefined>();
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [filterLocation, setFilterLocation] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordersRes, locationsRes, techRes] = await Promise.all([
        workOrdersApi.getAll(),
        locationsApi.getAll(),
        usersApi.getTechniciansAndContractors(),
      ]);
      const locativeOrders = ordersRes.data.filter(
        (wo: WorkOrder) => wo.maintenanceType === 'LOCATIVO'
      );
      setOrders(locativeOrders);
      setLocations(locationsRes.data);
      setTechnicians(techRes.data);
    } catch (error: any) {
      console.error('Error loading locative orders:', error);
      message.error('Error al cargar órdenes locativas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    applyFilters();
  }, [orders, searchText, filterAssignee, filterStatus, filterLocation, dateRange]);

  const applyFilters = () => {
    let filtered = [...orders];

    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(
        (wo) =>
          wo.id?.toLowerCase().includes(search) ||
          wo.title?.toLowerCase().includes(search) ||
          wo.locativeCategory?.toLowerCase().includes(search) ||
          wo.assigneeName?.toLowerCase().includes(search) ||
          wo.location?.name?.toLowerCase().includes(search)
      );
    }

    if (filterAssignee) {
      filtered = filtered.filter((wo) => wo.assigneeEmail === filterAssignee);
    }

    if (filterStatus) {
      filtered = filtered.filter((wo) => wo.status === filterStatus);
    }

    if (filterLocation) {
      filtered = filtered.filter((wo) => wo.location?.id === filterLocation);
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

  const handleClearFilters = () => {
    setSearchText('');
    setFilterAssignee(undefined);
    setFilterStatus(undefined);
    setFilterLocation(undefined);
    setDateRange(null);
  };

  const hasActiveFilters = searchText || filterAssignee || filterStatus || filterLocation || dateRange;

  const handleView = (record: WorkOrder) => {
    setSelectedOrder(record);
    setViewModalOpen(true);
  };

  const columns: ColumnsType<WorkOrder> = [
    {
      title: 'OT',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      ellipsis: true,
      render: (id: string) => (
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
      ellipsis: true,
      sorter: (a, b) => (a.location?.name || '').localeCompare(b.location?.name || ''),
    },
    {
      title: 'Asignado a',
      key: 'assignee',
      width: 120,
      ellipsis: true,
      sorter: (a, b) => (a.assigneeName || '').localeCompare(b.assigneeName || ''),
      render: (_: any, record: WorkOrder) =>
        record.assigneeName ? record.assigneeName : (
          <span style={{ color: '#8c8c8c' }}>Sin asignar</span>
        ),
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      ellipsis: true,
      sorter: (a, b) => a.status.localeCompare(b.status),
      render: (status: string) => (
        <Tag color={workOrderStatusColors[status as keyof typeof workOrderStatusColors]}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Categoría',
      dataIndex: 'locativeCategory',
      key: 'locativeCategory',
      width: 140,
      ellipsis: true,
      sorter: (a, b) => (a.locativeCategory || '').localeCompare(b.locativeCategory || ''),
      render: (cat: string) => (
        <Tag color="green">{locativeCategoryLabels[cat] || cat}</Tag>
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
      title: 'Costo',
      dataIndex: 'cost',
      key: 'cost',
      width: 100,
      ellipsis: true,
      sorter: (a, b) => Number(a.cost || 0) - Number(b.cost || 0),
      render: (cost: number) => cost ? formatCOP(cost) : '-',
    },
    {
      title: 'Creada',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 100,
      ellipsis: true,
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: 'descend',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 80,
      render: (_: any, record: WorkOrder) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleView(record)}
          size="small"
        >
          Ver
        </Button>
      ),
    },
  ];

  const renderMobileCard = (record: WorkOrder) => (
    <Card key={record.id} style={{ marginBottom: 12 }} size="small">
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 8,
        }}>
          <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#8c8c8c' }}>
            OT-{record.id.substring(0, 8)}
          </span>
          <Tag color={workOrderStatusColors[record.status as keyof typeof workOrderStatusColors]}>
            {record.status}
          </Tag>
        </div>

        <div style={{ fontSize: 12, color: '#595959', marginBottom: 4 }}>
          <strong>Ubicación:</strong> {record.location?.name}
        </div>

        <div style={{ fontSize: 12, marginBottom: 8 }}>
          <strong>Asignado:</strong>{' '}
          {record.assigneeName ? (
            <>
              {record.assigneeName}{' '}
              <Tag color={record.assigneeType === 'INTERNO' ? 'blue' : 'orange'}>
                {record.assigneeType}
              </Tag>
            </>
          ) : (
            <span style={{ color: '#8c8c8c' }}>Sin asignar</span>
          )}
        </div>

        <div style={{ marginBottom: 8 }}>
          <Tag color="green">
            <HomeOutlined /> {locativeCategoryLabels[record.locativeCategory || ''] || record.locativeCategory}
          </Tag>
        </div>

        <div style={{ fontSize: 13, marginBottom: 4, wordBreak: 'break-word' }}>
          <strong>Solicitud:</strong> {record.title}
        </div>

        {record.cost > 0 && (
          <div style={{ fontSize: 13, fontWeight: 600, color: '#E60012', marginBottom: 4 }}>
            {formatCOP(record.cost)}
          </div>
        )}

        <div style={{ fontSize: 11, color: '#8c8c8c' }}>
          {dayjs(record.createdAt).format('DD/MM/YYYY')}
        </div>

        <Divider style={{ margin: '8px 0' }} />

        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleView(record)}
          size="small"
          style={{ padding: 0 }}
        >
          Ver detalle
        </Button>
      </div>
    </Card>
  );

  return (
    <div style={{
      height: isMobile ? 'auto' : 'calc(100vh - 112px)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <Card
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: isMobile ? 'auto' : 'hidden',
        }}
        styles={{
          body: {
            padding: isMobile ? 12 : '12px 24px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: isMobile ? 'auto' : 'hidden',
          },
        }}
        title={
          <Space>
            <HomeOutlined style={{ fontSize: 18, color: '#E60012' }} />
            <span style={{ fontSize: isMobile ? 16 : 18, fontWeight: 600 }}>
              Locativo
            </span>
          </Space>
        }
      >
        {/* Filtros */}
        <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
          <Row gutter={[8, 8]}>
            <Col xs={24} sm={12} md={5}>
              <Input
                placeholder={isMobile ? 'Buscar...' : 'Buscar por solicitud, asignado...'}
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                size={isMobile ? 'large' : 'middle'}
              />
            </Col>
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
                {technicians.map((t: any) => (
                  <Select.Option key={t.email} value={t.email}>
                    {t.name}
                  </Select.Option>
                ))}
              </Select>
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
                <Select.Option value="CREADA">Creada</Select.Option>
                <Select.Option value="ASIGNADA">Asignada</Select.Option>
                <Select.Option value="EN_PROGRESO">En Progreso</Select.Option>
                <Select.Option value="FINALIZADA">Finalizada</Select.Option>
                <Select.Option value="CERRADA">Cerrada</Select.Option>
                <Select.Option value="RECHAZADA">Rechazada</Select.Option>
              </Select>
            </Col>
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
                {locations.map((loc: any) => (
                  <Select.Option key={loc.id} value={loc.id}>
                    {loc.name}
                  </Select.Option>
                ))}
              </Select>
            </Col>
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
              <Col sm={12} md={5}>
                <RangePicker
                  style={{ width: '100%' }}
                  value={dateRange}
                  onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
                  format="DD/MM/YYYY"
                  size="middle"
                />
              </Col>
            )}
            <Col xs={24} sm={12} md={3}>
              <Button
                icon={<ClearOutlined />}
                onClick={handleClearFilters}
                disabled={!hasActiveFilters}
                block
                size={isMobile ? 'large' : 'middle'}
              >
                Limpiar
              </Button>
            </Col>
          </Row>
          {hasActiveFilters && (
            <div style={{ marginTop: 8, color: '#1890ff', fontSize: isMobile ? 11 : 12 }}>
              Mostrando {filteredOrders.length} de {orders.length} órdenes
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
              <div style={{
                textAlign: 'center',
                marginTop: 8,
                color: '#8c8c8c',
                fontSize: 12,
              }}>
                Total: {filteredOrders.length} órdenes
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }}>
              No hay órdenes locativas registradas
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
              scroll={{ y: 'calc(100vh - 350px)' }}
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

      {/* Modal Ver OT */}
      {selectedOrder && (
        <ViewWorkOrderModal
          open={viewModalOpen}
          onClose={() => {
            setViewModalOpen(false);
            setSelectedOrder(null);
          }}
          workOrder={selectedOrder}
        />
      )}
    </div>
  );
};

export default LocativePage;
