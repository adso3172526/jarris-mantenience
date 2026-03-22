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
  Pagination,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  StopOutlined,
  SearchOutlined,
  ClearOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { assetEventsApi, locationsApi } from '../../services/api';

const { RangePicker } = DatePicker;

interface AssetEvent {
  id: string;
  type: string;
  description: string;
  createdBy?: string;
  createdAt: string;
  cost: number;
  workOrderId?: string;
  asset: {
    id: string;
    code: string;
    description: string;
  };
  fromLocation?: {
    id: string;
    name: string;
  };
  toLocation?: {
    id: string;
    name: string;
  };
}

const RELEVANT_TYPES = ['BAJA', 'REACTIVACION'];

const eventTypeColors: Record<string, string> = {
  BAJA: 'red-inverse',
  REACTIVACION: 'green-inverse',
};

const eventTypeLabels: Record<string, string> = {
  BAJA: 'Baja',
  REACTIVACION: 'Reactivación',
};

const BajasPage: React.FC = () => {
  const [events, setEvents] = useState<AssetEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<AssetEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [mobilePage, setMobilePage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filtros
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<string | undefined>();
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
      const [eventsRes, locationsRes] = await Promise.all([
        assetEventsApi.getAll(),
        locationsApi.getAll(),
      ]);
      const relevantEvents = eventsRes.data.filter(
        (e: AssetEvent) => RELEVANT_TYPES.includes(e.type)
      );
      setEvents(relevantEvents);
      setLocations(locationsRes.data);
    } catch (error: any) {
      console.error('Error loading events:', error);
      message.error('Error al cargar eventos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    applyFilters();
  }, [events, searchText, filterType, filterLocation, dateRange]);

  const applyFilters = () => {
    let filtered = [...events];

    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.id?.toLowerCase().includes(search) ||
          e.asset?.code?.toLowerCase().includes(search) ||
          e.asset?.description?.toLowerCase().includes(search) ||
          e.description?.toLowerCase().includes(search) ||
          e.createdBy?.toLowerCase().includes(search)
      );
    }

    if (filterType) {
      filtered = filtered.filter((e) => e.type === filterType);
    }

    if (filterLocation) {
      filtered = filtered.filter(
        (e) => e.fromLocation?.id === filterLocation || e.toLocation?.id === filterLocation || (e.asset as any)?.location?.id === filterLocation
      );
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
    setDateRange(null);
  };

  const hasActiveFilters = searchText || filterType || filterLocation || dateRange;

  const columns: ColumnsType<AssetEvent> = [
    {
      title: 'Fecha',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 100,
      ellipsis: true,
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: 'descend',
      render: (date: string) => new Date(date).toLocaleDateString('es-CO'),
    },
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      ellipsis: true,
      render: (id: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{id.substring(0, 8)}</span>
      ),
    },
    {
      title: 'Activo',
      key: 'asset',
      width: 100,
      ellipsis: true,
      sorter: (a, b) => (a.asset?.code || '').localeCompare(b.asset?.code || ''),
      render: (_: any, record: AssetEvent) =>
        record.asset?.code || <span style={{ color: '#8c8c8c' }}>N/A</span>,
    },
    {
      title: 'Ubicación',
      key: 'location',
      width: 120,
      ellipsis: true,
      sorter: (a, b) => (a.fromLocation?.name || '').localeCompare(b.fromLocation?.name || ''),
      render: (_: any, record: AssetEvent) => record.fromLocation?.name || record.toLocation?.name || (record.asset as any)?.location?.name || '-',
    },
    {
      title: 'Tipo',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      ellipsis: true,
      sorter: (a, b) => a.type.localeCompare(b.type),
      render: (type: string) => (
        <Tag color={eventTypeColors[type] || 'default'}>
          {eventTypeLabels[type] || type}
        </Tag>
      ),
    },
    {
      title: 'Registrado por',
      dataIndex: 'createdBy',
      key: 'createdBy',
      width: 120,
      ellipsis: true,
      sorter: (a, b) => (a.createdBy || '').localeCompare(b.createdBy || ''),
      render: (email: string) => email || '-',
    },
    {
      title: 'Descripción',
      dataIndex: 'description',
      key: 'description',
      width: 150,
      ellipsis: true,
      sorter: (a, b) => (a.description || '').localeCompare(b.description || ''),
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
          <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 14 }}>
            {record.asset?.code || 'N/A'}
          </span>
          <Tag color={eventTypeColors[record.type] || 'default'}>
            {eventTypeLabels[record.type] || record.type}
          </Tag>
        </div>

        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>
          <span style={{ fontFamily: 'monospace' }}>{record.id.substring(0, 8)}</span>
          {' · '}
          {dayjs(record.createdAt).format('DD/MM/YYYY HH:mm')}
        </div>

        {record.description && (
          <div style={{ fontSize: 13, marginBottom: 8, wordBreak: 'break-word' }}>
            {record.description}
          </div>
        )}

        <div style={{ fontSize: 12, color: '#595959', marginBottom: 4 }}>
          <strong>Ubicación:</strong> {record.fromLocation?.name || record.toLocation?.name || (record.asset as any)?.location?.name || '-'}
        </div>

        {record.createdBy && (
          <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 4 }}>
            Registrado por: {record.createdBy}
          </div>
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
            <StopOutlined style={{ fontSize: isMobile ? 14 : 18, color: '#E60012' }} />
            <span style={{ fontSize: isMobile ? 14 : 18, fontWeight: 600 }}>
              Historial Bajas
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
              Filtros{hasActiveFilters ? ` (${[searchText, filterType, filterLocation, dateRange].filter(Boolean).length})` : ''}
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
                      <Select.Option value="BAJA">Baja</Select.Option>
                      <Select.Option value="REACTIVACION">Reactivación</Select.Option>
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
                    Mostrando {filteredEvents.length} de {events.length} registros
                  </div>
                )}
              </Card>
            )}
          </div>
        ) : (
          <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
            <Row gutter={[8, 8]}>
              <Col sm={12} md={6}>
                <Input
                  placeholder="Buscar por código, descripción..."
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  allowClear
                  size="middle"
                />
              </Col>
              <Col sm={12} md={4}>
                <Select
                  placeholder="Tipo"
                  style={{ width: '100%' }}
                  value={filterType}
                  onChange={setFilterType}
                  allowClear
                  size="middle"
                >
                  <Select.Option value="BAJA">Baja</Select.Option>
                  <Select.Option value="REACTIVACION">Reactivación</Select.Option>
                </Select>
              </Col>
              <Col sm={12} md={5}>
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
              <Col sm={12} md={6}>
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
                Mostrando {filteredEvents.length} de {events.length} registros
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
              No hay registros
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
                showTotal: (total) => `Total: ${total} registros`,
                size: 'small',
                showSizeChanger: false,
              }}
            />
          </div>
        )}
      </Card>
    </div>
  );
};

export default BajasPage;
