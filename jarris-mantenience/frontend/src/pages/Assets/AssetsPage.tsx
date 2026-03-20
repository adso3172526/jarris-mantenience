import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Tag,
  Space,
  Input,
  Select,
  Card,
  Modal,
  Image,
  Tooltip,
  message,
  Popconfirm,
  Row,
  Col,
  Divider,
  DatePicker,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  EditOutlined,
  QrcodeOutlined,
  SwapOutlined,
  DeleteOutlined,
  SearchOutlined,
  HistoryOutlined,
  ClearOutlined,
  CheckCircleOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { assetsApi, locationsApi, categoriesApi } from '../../services/api';
import { assetStatusColors } from '../../config/theme';
import { useAuth } from '../../contexts/AuthContext';
import CreateAssetModal from './CreateAssetModal';
import EditAssetModal from './EditAssetModal';
import TransferAssetModal from './TransferAssetModal';
import ViewAssetDetailModal from './ViewAssetDetailModal';

interface Asset {
  id: string;
  code: string;
  description: string;
  brand?: string;
  reference?: string;
  serial?: string;
  model?: string;
  value: number;
  status: string;
  category: {
    id: string;
    name: string;
  };
  location: {
    id: string;
    name: string;
  };
  createdAt: string;
  photos?: string[];
}

const AssetsPage: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  
  // Selected
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [qrCode, setQrCode] = useState<string>('');
  
  // Filters
  const [searchText, setSearchText] = useState('');
  const [filterLocation, setFilterLocation] = useState<string | undefined>();
  const [filterCategory, setFilterCategory] = useState<string | undefined>();
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [filterBrand, setFilterBrand] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);

  const { hasRole, user } = useAuth();
  const isPDV = hasRole(['PDV']);
  const canEdit = hasRole(['ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO']);
  const canDeactivate = hasRole(['ADMIN', 'JEFE_MANTENIMIENTO']);

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
    loadData();
  }, [isPDV, user?.locationId]);

  useEffect(() => {
    applyFilters();
  }, [assets, searchText, filterLocation, filterCategory, filterStatus, filterBrand, dateRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      const assetsRequest = isPDV && user?.locationId
        ? assetsApi.getByLocation(user.locationId)
        : assetsApi.getAll();
      const [assetsRes, locationsRes, categoriesRes] = await Promise.all([
        assetsRequest,
        locationsApi.getAll(),
        categoriesApi.getAll(),
      ]);

      setAssets(assetsRes.data);
      setFilteredAssets(assetsRes.data);
      setLocations(locationsRes.data);
      setCategories(categoriesRes.data);
    } catch (error: any) {
      message.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...assets];

    if (filterStatus) {
      filtered = filtered.filter((asset) => asset.status === filterStatus);
    }

    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(
        (asset) =>
          asset.code?.toLowerCase().includes(search) ||
          asset.description?.toLowerCase().includes(search) ||
          asset.brand?.toLowerCase().includes(search) ||
          asset.serial?.toLowerCase().includes(search) ||
          asset.model?.toLowerCase().includes(search) ||
          asset.reference?.toLowerCase().includes(search)
      );
    }

    if (filterLocation) {
      filtered = filtered.filter((asset) => asset.location?.id === filterLocation);
    }

    if (filterCategory) {
      filtered = filtered.filter((asset) => asset.category?.id === filterCategory);
    }

    if (filterBrand) {
      const brandSearch = filterBrand.toLowerCase();
      filtered = filtered.filter((asset) =>
        asset.brand?.toLowerCase().includes(brandSearch)
      );
    }

    if (dateRange && dateRange[0] && dateRange[1]) {
      const start = dateRange[0].startOf('day');
      const end = dateRange[1].endOf('day');
      filtered = filtered.filter((asset) => {
        const date = dayjs(asset.createdAt);
        return date.isAfter(start) && date.isBefore(end);
      });
    }

    setFilteredAssets(filtered);
  };

  const handleClearFilters = () => {
    setSearchText('');
    setFilterLocation(undefined);
    setFilterCategory(undefined);
    setFilterStatus(undefined);
    setFilterBrand('');
    setDateRange(null);
  };

  const hasActiveFilters =
    searchText || filterLocation || filterCategory || filterStatus || filterBrand || dateRange;

  const handleViewQR = async (asset: Asset) => {
    try {
      const response = await assetsApi.getQR(asset.id);
      setQrCode(response.data.qrCode);
      setSelectedAsset(asset);
      setQrModalOpen(true);
    } catch (error) {
      message.error('Error al cargar codigo QR');
    }
  };

  const handleViewDetail = (asset: Asset) => {
    setSelectedAsset(asset);
    setDetailModalOpen(true);
  };

  const handleEdit = (asset: Asset) => {
    setSelectedAsset(asset);
    setEditModalOpen(true);
  };

  const handleTransfer = (asset: Asset) => {
    setSelectedAsset(asset);
    setTransferModalOpen(true);
  };

  const handleDeactivate = async (assetId: string) => {
    try {
      await assetsApi.deactivate(assetId, { createdBy: user?.email || '' });
      message.success('Activo dado de baja exitosamente');
      loadData();
    } catch (error) {
      message.error('Error al dar de baja el activo');
    }
  };

  const handleReactivate = async (assetId: string) => {
    try {
      await assetsApi.reactivate(assetId, { createdBy: user?.email || '' });
      message.success('Activo reactivado exitosamente');
      loadData();
    } catch (error) {
      message.error('Error al reactivar el activo');
    }
  };

  // Mobile Card View
  const renderMobileCard = (record: Asset) => (
    <Card
      key={record.id}
      style={{ marginBottom: 12 }}
      size="small"
    >
      <div style={{ marginBottom: 12, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 14 }}>
            {record.code}
          </span>
          <Tag color={assetStatusColors[record.status as keyof typeof assetStatusColors]}>
            {record.status}
          </Tag>
        </div>

        {/* Description */}
        <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8, wordBreak: 'break-word' }}>
          {record.description}
        </div>

        {/* Category & Location */}
        <div style={{ marginBottom: 8 }}>
          <Tag color="blue" style={{ marginBottom: 4 }}>
            {record.category?.name || 'Sin categoria'}
          </Tag>
          <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
             {record.location?.name || 'Sin ubicacion'}
          </div>
        </div>

        {/* Brand & Serial */}
        {(record.brand || record.serial) && (
          <div style={{ fontSize: 12, color: '#595959', marginBottom: 8, wordBreak: 'break-word' }}>
            {record.brand && <div><strong>Marca:</strong> {record.brand}</div>}
            {record.serial && <div><strong>Serial:</strong> {record.serial}</div>}
          </div>
        )}

        {/* Value */}
        {record.value > 0 && (
          <div style={{ fontSize: 14, fontWeight: 600, color: '#E60012', marginBottom: 8 }}>
            {formatCOP(record.value)}
          </div>
        )}

      </div>

      <Divider style={{ margin: '8px 0' }} />

      {/* Actions */}
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        <Button
          type="default"
          icon={<HistoryOutlined />}
          onClick={() => handleViewDetail(record)}
          block
        >
          Ver Historial
        </Button>

        {!isPDV && (record.status === 'BAJA' ? (
          canDeactivate && (
            <Popconfirm
              title="Reactivar este activo?"
              description="El estado cambiara de BAJA a ACTIVO"
              onConfirm={() => handleReactivate(record.id)}
              okText="Si"
              cancelText="No"
            >
              <Button
                icon={<CheckCircleOutlined />}
                block
                style={{ background: '#52c41a', borderColor: '#52c41a', color: '#fff' }}
              >
                Reactivar
              </Button>
            </Popconfirm>
          )
        ) : (
          <>
            <Button
              type="default"
              icon={<QrcodeOutlined />}
              onClick={() => handleViewQR(record)}
              block
            >
              Ver QR
            </Button>

            {canEdit && (
              <>
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(record)}
                  block
                >
                  Editar
                </Button>

                <Button
                  type="default"
                  icon={<SwapOutlined />}
                  onClick={() => handleTransfer(record)}
                  block
                >
                  Trasladar
                </Button>

                <Popconfirm
                  title="Dar de baja este activo?"
                  description="Esta accion cambiara el estado a BAJA"
                  onConfirm={() => handleDeactivate(record.id)}
                  okText="Si"
                  cancelText="No"
                >
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    block
                  >
                    Dar de Baja
                  </Button>
                </Popconfirm>
              </>
            )}
          </>
        ))}
      </Space>
    </Card>
  );

  // Desktop Table Columns
  const columns: ColumnsType<Asset> = [
    {
      title: 'Ingreso',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 100,
      ellipsis: true,
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      render: (date) => new Date(date).toLocaleDateString('es-CO'),
    },
    {
      title: 'Codigo',
      dataIndex: 'code',
      key: 'code',
      width: 80,
      ellipsis: true,
      sorter: (a, b) => (a.code || '').localeCompare(b.code || ''),
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      ellipsis: true,
      sorter: (a, b) => (a.status || '').localeCompare(b.status || ''),
      render: (status) => (
        <Tag color={assetStatusColors[status as keyof typeof assetStatusColors]}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Ubicacion',
      dataIndex: ['location', 'name'],
      key: 'location',
      width: 120,
      ellipsis: true,
      sorter: (a, b) => (a.location?.name || '').localeCompare(b.location?.name || ''),
    },
    {
      title: 'Categoria',
      dataIndex: ['category', 'name'],
      key: 'category',
      width: 100,
      ellipsis: true,
      sorter: (a, b) => (a.category?.name || '').localeCompare(b.category?.name || ''),
    },
    {
      title: 'Descripcion',
      dataIndex: 'description',
      key: 'description',
      width: 150,
      ellipsis: true,
      sorter: (a, b) => (a.description || '').localeCompare(b.description || ''),
    },
    {
      title: 'Marca',
      dataIndex: 'brand',
      key: 'brand',
      width: 80,
      ellipsis: true,
      sorter: (a, b) => (a.brand || '').localeCompare(b.brand || ''),
    },
    {
      title: 'Serial',
      dataIndex: 'serial',
      key: 'serial',
      width: 100,
      ellipsis: true,
      sorter: (a, b) => (a.serial || '').localeCompare(b.serial || ''),
    },
    {
      title: 'Valor',
      dataIndex: 'value',
      key: 'value',
      width: 100,
      ellipsis: true,
      sorter: (a, b) => Number(a.value || 0) - Number(b.value || 0),
      render: (value) => value ? formatCOP(value) : 'N/A',
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Ver Historial">
            <Button
              type="text"
              icon={<HistoryOutlined />}
              onClick={() => handleViewDetail(record)}
              style={{ color: '#722ed1' }}
            />
          </Tooltip>

          {!isPDV && (record.status === 'BAJA' ? (
            canDeactivate && (
              <Tooltip title="Reactivar">
                <Popconfirm
                  title="Reactivar este activo?"
                  description="El estado cambiara de BAJA a ACTIVO"
                  onConfirm={() => handleReactivate(record.id)}
                  okText="Si"
                  cancelText="No"
                >
                  <Button type="text" icon={<CheckCircleOutlined />} style={{ color: '#52c41a' }} />
                </Popconfirm>
              </Tooltip>
            )
          ) : (
            <>
              <Tooltip title="Ver QR">
                <Button
                  type="text"
                  icon={<QrcodeOutlined />}
                  onClick={() => handleViewQR(record)}
                />
              </Tooltip>

              {canEdit && (
                <>
                  <Tooltip title="Editar">
                    <Button
                      type="text"
                      icon={<EditOutlined style={{ color: '#1890ff' }} />}
                      onClick={() => handleEdit(record)}
                    />
                  </Tooltip>

                  <Tooltip title="Trasladar">
                    <Button
                      type="text"
                      icon={<SwapOutlined />}
                      onClick={() => handleTransfer(record)}
                    />
                  </Tooltip>

                  <Tooltip title="Dar de baja">
                    <Popconfirm
                      title="Dar de baja este activo?"
                      description="Esta accion cambiara el estado a BAJA"
                      onConfirm={() => handleDeactivate(record.id)}
                      okText="Si"
                      cancelText="No"
                    >
                      <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Tooltip>
                </>
              )}
            </>
          ))}
        </Space>
      ),
    },
  ];

  const renderFiltersAndList = () => (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: isMobile ? 'visible' : 'hidden', minHeight: 0 }}>
      {/* Filtros */}
      <Card size="small" style={{ marginBottom: 16, background: '#fafafa', flexShrink: 0 }}>
        <Row gutter={[8, 8]}>
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder={isMobile ? "Buscar..." : "Buscar codigo, descripcion, serial..."}
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              size={isMobile ? "large" : "middle"}
            />
          </Col>
          {!isPDV && (
            <Col xs={24} sm={12} md={4}>
              <Select
                placeholder="Ubicacion"
                style={{ width: '100%' }}
                value={filterLocation}
                onChange={setFilterLocation}
                allowClear
                size={isMobile ? "large" : "middle"}
              >
                {locations.map((loc) => (
                  <Select.Option key={loc.id} value={loc.id}>
                    {loc.name}
                  </Select.Option>
                ))}
              </Select>
            </Col>
          )}
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Categoria"
              style={{ width: '100%' }}
              value={filterCategory}
              onChange={setFilterCategory}
              allowClear
              size={isMobile ? "large" : "middle"}
            >
              {categories.map((cat) => (
                <Select.Option key={cat.id} value={cat.id}>
                  {cat.name}
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
              size={isMobile ? "large" : "middle"}
            >
              <Select.Option value="ACTIVO">Activo</Select.Option>
              <Select.Option value="BAJA">Baja</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={3}>
            <Input
              placeholder="Filtrar por marca"
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
              allowClear
              size={isMobile ? "large" : "middle"}
            />
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
              <DatePicker.RangePicker
                style={{ width: '100%' }}
                value={dateRange}
                onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
                format="DD/MM/YYYY"
                size="middle"
              />
            </Col>
          )}
          <Col xs={24} sm={12} md={2}>
            <Button
              icon={<ClearOutlined />}
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
              block
              size={isMobile ? "large" : "middle"}
            >
              Limpiar
            </Button>
          </Col>
        </Row>
        {hasActiveFilters && (
          <div style={{ marginTop: 8, color: '#1890ff', fontSize: isMobile ? 11 : 12 }}>
            Mostrando {filteredAssets.length} de {assets.length} activos
          </div>
        )}
      </Card>

      {/* Lista */}
      {isMobile ? (
        loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>Cargando...</div>
        ) : filteredAssets.length > 0 ? (
          <div style={{ background: '#E0E0E0', borderRadius: 10, padding: 12 }}>
            {filteredAssets.map(renderMobileCard)}
            <div style={{ textAlign: 'center', marginTop: 8, color: '#8c8c8c', fontSize: 12 }}>
              Total: {filteredAssets.length} activos
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }}>
            No hay activos
          </div>
        )
      ) : (
        <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
          <Table
            columns={columns}
            dataSource={filteredAssets}
            rowKey="id"
            loading={loading}
            size="small"
            tableLayout="fixed"
            scroll={{ y: 'calc(100vh - 310px)' }}
            pagination={{
              total: filteredAssets.length,
              pageSize: 8,
              showTotal: (total) => `Total: ${total} activos`,
              size: 'small',
              showSizeChanger: false,
            }}
          />
        </div>
      )}
    </div>
  );

  return (
    <div style={{ height: isMobile ? 'auto' : 'calc(100vh - 112px)', display: 'flex', flexDirection: 'column' }}>
      <Card
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: isMobile ? 'auto' : 'hidden' }}
        styles={{ body: { padding: isMobile ? 12 : '12px 24px', flex: 1, display: 'flex', flexDirection: 'column', overflow: isMobile ? 'auto' : 'hidden' } }}
        title={
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8
          }}>
            <Space>
              <ToolOutlined style={{ fontSize: 18, color: '#E60012' }} />
              <span style={{ fontSize: isMobile ? 16 : 18, fontWeight: 600 }}>Activos</span>
            </Space>
            {canEdit && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateModalOpen(true)}
                size={isMobile ? "middle" : "middle"}
              >
                {isMobile ? "Nuevo" : "Nuevo Activo"}
              </Button>
            )}
          </div>
        }
      >
        {renderFiltersAndList()}
      </Card>

      {/* Modals */}
      <CreateAssetModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={loadData}
        locations={locations}
        categories={categories}
      />

      {selectedAsset && (
        <>
          <EditAssetModal
            open={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            onSuccess={loadData}
            asset={selectedAsset}
            categories={categories}
          />

          <TransferAssetModal
            open={transferModalOpen}
            onClose={() => setTransferModalOpen(false)}
            onSuccess={loadData}
            asset={selectedAsset}
            locations={locations}
          />

          <ViewAssetDetailModal
            open={detailModalOpen}
            onClose={() => setDetailModalOpen(false)}
            assetId={selectedAsset.id}
          />
        </>
      )}

      {/* Modal QR */}
      <Modal
        title={`Codigo QR - ${selectedAsset?.code}`}
        open={qrModalOpen}
        onCancel={() => setQrModalOpen(false)}
        footer={null}
        centered
        width={isMobile ? '90%' : 520}
      >
        <div style={{ textAlign: 'center', padding: isMobile ? '10px 0' : '20px 0' }}>
          <Image src={qrCode} alt="QR Code" style={{ maxWidth: '100%' }} />
          <div style={{ marginTop: 16, fontSize: isMobile ? 13 : 14 }}>
            <p><strong>Equipo:</strong> {selectedAsset?.description}</p>
            <p><strong>Codigo:</strong> {selectedAsset?.code}</p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AssetsPage;
