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
  UnorderedListOutlined,
  SearchOutlined,
  ClearOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { assetEventsApi, locationsApi, usersApi, workOrdersApi } from '../../services/api';
import ViewWorkOrderModal from '../WorkOrders/ViewWorkOrderModal';

const { RangePicker } = DatePicker;

interface AssetEvent {
  id: string;
  type: string;
  description: string;
  cost: number;
  createdAt: string;
  createdBy?: string;
  workOrderId?: string;
  asset?: {
    id: string;
    code: string;
    description: string;
    location?: {
      id: string;
      name: string;
    };
  };
  fromLocation?: {
    id: string;
    name: string;
  };
  toLocation?: {
    id: string;
    name: string;
  };
  workOrder?: {
    id: string;
    finishedBy?: string;
    assigneeName?: string;
    assigneeEmail?: string;
  };
}

const formatCOP = (value: number) => {
  return `$${Math.round(value).toLocaleString('es-CO')}`;
};

const EventosPage: React.FC = () => {
  const [events, setEvents] = useState<AssetEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<AssetEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Modal
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<any | null>(null);
  const [loadingWO, setLoadingWO] = useState(false);

  // Filtros
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<string | undefined>();
  const [filterLocation, setFilterLocation] = useState<string | undefined>();
  const [filterTechnician, setFilterTechnician] = useState<string | undefined>();
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
      const [eventsRes, locationsRes, techRes] = await Promise.all([
        assetEventsApi.getAll(),
        locationsApi.getAll(),
        usersApi.getTechniciansAndContractors(),
      ]);
      // Filtrar solo MANTENIMIENTO y REPARACION
      const maintenanceEvents = eventsRes.data.filter(
        (e: AssetEvent) => e.type === 'MANTENIMIENTO' || e.type === 'REPARACION'
      );
      setEvents(maintenanceEvents);
      setLocations(locationsRes.data);
      setTechnicians(techRes.data);
    } catch (error: any) {
      console.error('Error loading events:', error);
      message.error('Error al cargar eventos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    applyFilters();
  }, [events, searchText, filterType, filterLocation, filterTechnician, dateRange]);

  const applyFilters = () => {
    let filtered = [...events];

    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.id?.toLowerCase().includes(search) ||
          e.description?.toLowerCase().includes(search) ||
          e.asset?.code?.toLowerCase().includes(search) ||
          e.asset?.description?.toLowerCase().includes(search) ||
          e.createdBy?.toLowerCase().includes(search) ||
          e.fromLocation?.name?.toLowerCase().includes(search)
      );
    }

    if (filterType) {
      filtered = filtered.filter((e) => e.type === filterType);
    }

    if (filterLocation) {
      filtered = filtered.filter((e) => e.fromLocation?.id === filterLocation);
    }

    if (filterTechnician) {
      filtered = filtered.filter((e) => e.workOrder?.assigneeEmail === filterTechnician);
    }

    if (dateRange && dateRange[0] && dateRange[1]) {
      const start = dateRange[0].startOf('day');
      const end = dateRange[1].endOf('day');
      filtered = filtered.filter((e) => {
        const date = dayjs(e.createdAt);
        return date.isAfter(start) && date.isBefore(end);
      });
    }

    setFilteredEvents(filtered);
  };

  const handleClearFilters = () => {
    setSearchText('');
    setFilterType(undefined);
    setFilterLocation(undefined);
    setFilterTechnician(undefined);
    setDateRange(null);
  };

  const hasActiveFilters = searchText || filterType || filterLocation || filterTechnician || dateRange;

  const handleView = async (record: AssetEvent) => {
    if (!record.workOrderId) {
      message.info('Este evento no tiene una orden de trabajo asociada');
      return;
    }
    try {
      setLoadingWO(true);
      const res = await workOrdersApi.getById(record.workOrderId);
      setSelectedWorkOrder(res.data);
      setViewModalOpen(true);
    } catch (error: any) {
      message.error('Error al cargar la orden de trabajo');
    } finally {
      setLoadingWO(false);
    }
  };

  const columns: ColumnsType<AssetEvent> = [
    {
      title: 'ID',
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
      title: 'Activo',
      key: 'asset_code',
      width: 100,
      ellipsis: true,
      sorter: (a, b) => (a.asset?.code || '').localeCompare(b.asset?.code || ''),
      render: (_: any, record: AssetEvent) =>
        record.asset ? (
          <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>
            {record.asset.code}
          </span>
        ) : (
          <span style={{ color: '#8c8c8c' }}>N/A</span>
        ),
    },
    {
      title: 'Descripción Activo',
      key: 'asset_desc',
      width: 150,
      ellipsis: true,
      sorter: (a, b) => (a.asset?.description || '').localeCompare(b.asset?.description || ''),
      render: (_: any, record: AssetEvent) =>
        record.asset?.description || '-',
    },
    {
      title: 'Ubicación',
      key: 'location',
      width: 120,
      ellipsis: true,
      sorter: (a, b) => (a.fromLocation?.name || '').localeCompare(b.fromLocation?.name || ''),
      render: (_: any, record: AssetEvent) =>
        record.fromLocation?.name || '-',
    },
    {
      title: 'Técnico',
      key: 'technician',
      width: 120,
      ellipsis: true,
      sorter: (a, b) => (a.workOrder?.assigneeName || '').localeCompare(b.workOrder?.assigneeName || ''),
      render: (_: any, record: AssetEvent) =>
        record.workOrder?.assigneeName || (
          <span style={{ color: '#8c8c8c' }}>-</span>
        ),
    },
    {
      title: 'Tipo',
      dataIndex: 'type',
      key: 'type',
      width: 110,
      ellipsis: true,
      sorter: (a, b) => a.type.localeCompare(b.type),
      render: (type: string) => (
        <Tag color={type === 'MANTENIMIENTO' ? 'blue' : 'orange'}>
          {type === 'MANTENIMIENTO' ? 'Mantenimiento' : 'Reparación'}
        </Tag>
      ),
    },
    {
      title: 'Descripción',
      dataIndex: 'description',
      key: 'description',
      width: 180,
      ellipsis: true,
      sorter: (a, b) => (a.description || '').localeCompare(b.description || ''),
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
      title: 'Fecha',
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
      render: (_: any, record: AssetEvent) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleView(record)}
          size="small"
          disabled={!record.workOrderId}
          loading={loadingWO}
        />
      ),
    },
  ];

  const renderMobileCard = (record: AssetEvent) => (
    <Card key={record.id} style={{ marginBottom: 12 }} size="small">
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 8,
        }}>
          <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>
            {record.asset?.code || 'N/A'}
          </span>
          <Tag color={record.type === 'MANTENIMIENTO' ? 'blue' : 'orange'}>
            {record.type === 'MANTENIMIENTO' ? 'Mantenimiento' : 'Reparación'}
          </Tag>
        </div>

        {record.asset && (
          <div style={{ fontSize: 12, marginBottom: 4 }}>
            <strong>Activo:</strong> {record.asset.description}
          </div>
        )}

        <div style={{ fontSize: 12, color: '#595959', marginBottom: 4 }}>
          <strong>Ubicación:</strong> {record.fromLocation?.name || '-'}
        </div>

        <div style={{ fontSize: 12, marginBottom: 4 }}>
          <strong>Técnico:</strong> {record.workOrder?.assigneeName || '-'}
        </div>

        <div style={{ fontSize: 13, marginBottom: 4, wordBreak: 'break-word' }}>
          <strong>Descripción:</strong> {record.description}
        </div>

        {Number(record.cost) > 0 && (
          <div style={{ fontSize: 13, fontWeight: 600, color: '#E60012', marginBottom: 4 }}>
            {formatCOP(Number(record.cost))}
          </div>
        )}

        <div style={{ fontSize: 11, color: '#8c8c8c' }}>
          {dayjs(record.createdAt).format('DD/MM/YYYY')}
        </div>

        {record.workOrderId && (
          <>
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ textAlign: 'center' }}>
              <Button
                type="link"
                icon={<EyeOutlined />}
                onClick={() => handleView(record)}
                size="small"
                loading={loadingWO}
              >
                Ver
              </Button>
            </div>
          </>
        )}
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
            <UnorderedListOutlined style={{ fontSize: 18, color: '#E60012' }} />
            <span style={{ fontSize: isMobile ? 16 : 18, fontWeight: 600 }}>
              Eventos
            </span>
          </Space>
        }
      >
        {/* Filtros */}
        <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
          <Row gutter={[8, 8]}>
            <Col xs={24} sm={12} md={4}>
              <Input
                placeholder={isMobile ? 'Buscar...' : 'Buscar por activo, descripción...'}
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                size={isMobile ? 'large' : 'middle'}
              />
            </Col>
            <Col xs={24} sm={12} md={3}>
              <Select
                placeholder="Tipo"
                style={{ width: '100%' }}
                value={filterType}
                onChange={setFilterType}
                allowClear
                size={isMobile ? 'large' : 'middle'}
              >
                <Select.Option value="MANTENIMIENTO">Mantenimiento</Select.Option>
                <Select.Option value="REPARACION">Reparación</Select.Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Select
                placeholder="Técnico/Contratista"
                style={{ width: '100%' }}
                value={filterTechnician}
                onChange={setFilterTechnician}
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
              <Col sm={12} md={4}>
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
              Mostrando {filteredEvents.length} de {events.length} eventos
            </div>
          )}
        </Card>

        {/* Lista */}
        {isMobile ? (
          loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>Cargando...</div>
          ) : filteredEvents.length > 0 ? (
            <div style={{ background: '#E0E0E0', borderRadius: 10, padding: 12 }}>
              {filteredEvents.map(renderMobileCard)}
              <div style={{
                textAlign: 'center',
                marginTop: 8,
                color: '#8c8c8c',
                fontSize: 12,
              }}>
                Total: {filteredEvents.length} eventos
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }}>
              No hay eventos de mantenimiento registrados
            </div>
          )
        ) : (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Table
              columns={columns}
              dataSource={filteredEvents}
              rowKey="id"
              loading={loading}
              size="small"
              tableLayout="fixed"
              scroll={{ y: 'calc(100vh - 350px)' }}
              pagination={{
                total: filteredEvents.length,
                pageSize: 10,
                showTotal: (total) => `Total: ${total} eventos`,
                size: 'small',
                showSizeChanger: false,
              }}
            />
          </div>
        )}
      </Card>

      {/* Modal Ver OT */}
      {selectedWorkOrder && (
        <ViewWorkOrderModal
          open={viewModalOpen}
          onClose={() => {
            setViewModalOpen(false);
            setSelectedWorkOrder(null);
          }}
          workOrder={selectedWorkOrder}
        />
      )}
    </div>
  );
};

export default EventosPage;
