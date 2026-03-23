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
  Pagination,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  UnorderedListOutlined,
  SearchOutlined,
  ClearOutlined,
  EyeOutlined,
  FilterOutlined,
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
    finishedAt?: string;
    closedAt?: string;
    assigneeName?: string;
    assigneeEmail?: string;
    location?: {
      id: string;
      name: string;
    };
  };
}

const formatCOP = (value: number) => {
  return `$${Math.round(value).toLocaleString('es-CO')}`;
};

const EventsPage: React.FC = () => {
  const [events, setEvents] = useState<AssetEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<AssetEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [mobilePage, setMobilePage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

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
          e.fromLocation?.name?.toLowerCase().includes(search) ||
          e.workOrder?.location?.name?.toLowerCase().includes(search)
      );
    }

    if (filterType) {
      filtered = filtered.filter((e) => e.type === filterType);
    }

    if (filterLocation) {
      filtered = filtered.filter((e) => e.fromLocation?.id === filterLocation || e.workOrder?.location?.id === filterLocation);
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
    setMobilePage(1);
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
      title: 'Fecha Creación',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 110,
      ellipsis: true,
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: 'descend',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Fecha Terminación',
      key: 'finishedAt',
      width: 110,
      ellipsis: true,
      sorter: (a, b) => {
        const aDate = a.workOrder?.finishedAt || a.workOrder?.closedAt || '';
        const bDate = b.workOrder?.finishedAt || b.workOrder?.closedAt || '';
        return new Date(aDate).getTime() - new Date(bDate).getTime();
      },
      render: (_: any, record: AssetEvent) => {
        const date = record.workOrder?.finishedAt || record.workOrder?.closedAt;
        return date ? dayjs(date).format('DD/MM/YYYY') : <span style={{ color: '#8c8c8c' }}>—</span>;
      },
    },
    {
      title: 'OT',
      key: 'workOrderId',
      width: 80,
      ellipsis: true,
      render: (_: any, record: AssetEvent) =>
        record.workOrderId ? (
          <span style={{ fontFamily: 'monospace', fontSize: 13 }}>
            {record.workOrderId.substring(0, 8)}
          </span>
        ) : (
          <span style={{ color: '#8c8c8c' }}>-</span>
        ),
    },
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
      title: 'Ubicación',
      key: 'location',
      width: 120,
      ellipsis: true,
      sorter: (a, b) => (a.fromLocation?.name || a.workOrder?.location?.name || '').localeCompare(b.fromLocation?.name || b.workOrder?.location?.name || ''),
      render: (_: any, record: AssetEvent) =>
        record.fromLocation?.name || record.workOrder?.location?.name || '-',
    },
    {
      title: 'Tipo',
      dataIndex: 'type',
      key: 'type',
      width: 110,
      ellipsis: true,
      sorter: (a, b) => a.type.localeCompare(b.type),
      render: (type: string) => (
        <Tag color={type === 'MANTENIMIENTO' ? 'volcano-inverse' : 'yellow-inverse'}>
          {type === 'MANTENIMIENTO' ? 'Mantenimiento' : 'Reparación'}
        </Tag>
      ),
    },
    {
      title: 'Activo',
      key: 'asset_code',
      width: 100,
      ellipsis: true,
      sorter: (a, b) => (a.asset?.code || '').localeCompare(b.asset?.code || ''),
      render: (_: any, record: AssetEvent) =>
        record.asset?.code || <span style={{ color: '#8c8c8c' }}>N/A</span>,
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
      title: 'Descripción',
      dataIndex: 'description',
      key: 'description',
      width: 150,
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
        {record.workOrderId && (
          <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 4 }}>
            OT-{record.workOrderId.substring(0, 8)}
          </div>
        )}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 8,
        }}>
          <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>
            {record.asset?.code || 'N/A'}
          </span>
          <Tag color={record.type === 'MANTENIMIENTO' ? 'volcano-inverse' : 'yellow-inverse'}>
            {record.type === 'MANTENIMIENTO' ? 'Mantenimiento' : 'Reparación'}
          </Tag>
        </div>

        {record.asset && (
          <div style={{ fontSize: 12, marginBottom: 4 }}>
            <strong>Activo:</strong> {record.asset.description}
          </div>
        )}

        <div style={{ fontSize: 12, color: '#595959', marginBottom: 4 }}>
          <strong>Ubicación:</strong> {record.fromLocation?.name || record.workOrder?.location?.name || '-'}
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
          <div><strong>Creación:</strong> {dayjs(record.createdAt).format('DD/MM/YYYY')}</div>
          {(record.workOrder?.finishedAt || record.workOrder?.closedAt) && (
            <div><strong>Terminación:</strong> {dayjs(record.workOrder.finishedAt || record.workOrder.closedAt).format('DD/MM/YYYY')}</div>
          )}
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
          header: isMobile ? { padding: '0 12px', minHeight: 40 } : {},
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
            <UnorderedListOutlined style={{ fontSize: isMobile ? 14 : 18, color: '#E60012' }} />
            <span style={{ fontSize: isMobile ? 14 : 18, fontWeight: 600 }}>
              Eventos
            </span>
          </Space>
        }
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
              Filtros{hasActiveFilters ? ` (${[searchText, filterType, filterLocation, filterTechnician, dateRange].filter(Boolean).length})` : ''}
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
                      placeholder="Técnico/Contratista"
                      style={{ width: '100%' }}
                      value={filterTechnician}
                      onChange={setFilterTechnician}
                      allowClear
                      showSearch
                      optionFilterProp="children"
                      size="large"
                    >
                      {technicians.map((t: any) => (
                        <Select.Option key={t.email} value={t.email}>
                          {t.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Col>
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
                      {locations.map((loc: any) => (
                        <Select.Option key={loc.id} value={loc.id}>
                          {loc.name}
                        </Select.Option>
                      ))}
                    </Select>
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
                      <Select.Option value="MANTENIMIENTO">Mantenimiento</Select.Option>
                      <Select.Option value="REPARACION">Reparación</Select.Option>
                    </Select>
                  </Col>
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
                    Mostrando {filteredEvents.length} de {events.length} eventos
                  </div>
                )}
              </Card>
            )}
          </div>
        ) : (
          <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
            <Row gutter={[8, 8]}>
              <Col sm={12} md={4}>
                <Input
                  placeholder="Buscar por activo, descripción..."
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  allowClear
                  size="middle"
                />
              </Col>
              <Col sm={12} md={4}>
                <Select
                  placeholder="Técnico/Contratista"
                  style={{ width: '100%' }}
                  value={filterTechnician}
                  onChange={setFilterTechnician}
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  size="middle"
                >
                  {technicians.map((t: any) => (
                    <Select.Option key={t.email} value={t.email}>
                      {t.name}
                    </Select.Option>
                  ))}
                </Select>
              </Col>
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
                  {locations.map((loc: any) => (
                    <Select.Option key={loc.id} value={loc.id}>
                      {loc.name}
                    </Select.Option>
                  ))}
                </Select>
              </Col>
              <Col sm={12} md={3}>
                <Select
                  placeholder="Tipo"
                  style={{ width: '100%' }}
                  value={filterType}
                  onChange={setFilterType}
                  allowClear
                  size="middle"
                >
                  <Select.Option value="MANTENIMIENTO">Mantenimiento</Select.Option>
                  <Select.Option value="REPARACION">Reparación</Select.Option>
                </Select>
              </Col>
              <Col sm={12} md={4}>
                <RangePicker
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
                Mostrando {filteredEvents.length} de {events.length} eventos
              </div>
            )}
          </Card>
        )}

        {/* Lista */}
        {isMobile ? (
          loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>Cargando...</div>
          ) : filteredEvents.length > 0 ? (
            <div style={{ background: '#E0E0E0', borderRadius: 10, padding: 12 }}>
              {filteredEvents.slice((mobilePage - 1) * 5, mobilePage * 5).map(renderMobileCard)}
              <Pagination
                current={mobilePage}
                pageSize={5}
                total={filteredEvents.length}
                onChange={(page) => setMobilePage(page)}
                size="small"
                simple
                style={{ textAlign: 'center', marginTop: 8 }}
              />
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
              scroll={{ y: 'calc(100vh - 310px)' }}
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

export default EventsPage;
