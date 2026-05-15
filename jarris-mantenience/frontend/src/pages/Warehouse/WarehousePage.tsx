import React, { useState, useEffect, useCallback } from 'react';
import {
  Tabs,
  Button,
  Table,
  Tag,
  Select,
  DatePicker,
  Space,
  Input,
  message,
  Card,
  Tooltip,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  ImportOutlined,
  SwapOutlined,
  WarningOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { warehouseApi, locationsApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import CreateWarehouseModal from './CreateWarehouseModal';
import EditWarehouseModal from './EditWarehouseModal';
import CreateItemModal from './CreateItemModal';
import EditItemModal from './EditItemModal';
import StockEntryModal from './StockEntryModal';
import CreateTransferModal from './CreateTransferModal';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const UNIT_LABELS: Record<string, string> = {
  UNIDADES: 'Und',
  METROS: 'Mts',
  KILOGRAMOS: 'Kg',
  LITROS: 'Lts',
  GALONES: 'Gal',
  PIEZAS: 'Pzas',
  CAJAS: 'Cajas',
  PARES: 'Pares',
};

const MOVEMENT_TYPE_CONFIG: Record<string, { color: string; label: string }> = {
  INGRESO: { color: 'green', label: 'Ingreso' },
  CONSUMO: { color: 'red', label: 'Consumo' },
  TRASLADO_ENTRADA: { color: 'blue', label: 'Traslado Entrada' },
  TRASLADO_SALIDA: { color: 'orange', label: 'Traslado Salida' },
  AJUSTE: { color: 'purple', label: 'Ajuste' },
};

const WarehousePage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const isMobile = window.innerWidth < 768;

  // ─── State ─────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('warehouses');
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Selected warehouse
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');

  // Modals
  const [createWarehouseOpen, setCreateWarehouseOpen] = useState(false);
  const [editWarehouseOpen, setEditWarehouseOpen] = useState(false);
  const [editWarehouseData, setEditWarehouseData] = useState<any>(null);
  const [createItemOpen, setCreateItemOpen] = useState(false);
  const [editItemOpen, setEditItemOpen] = useState(false);
  const [editItemData, setEditItemData] = useState<any>(null);
  const [stockEntryOpen, setStockEntryOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  // Item search
  const [itemSearch, setItemSearch] = useState('');

  // Movement filters
  const [movFilterWarehouse, setMovFilterWarehouse] = useState<string>('');
  const [movFilterItem, setMovFilterItem] = useState<string>('');
  const [movFilterType, setMovFilterType] = useState<string>('');
  const [movFilterDates, setMovFilterDates] = useState<any>(null);

  // ─── Data Loading ──────────────────────────────────

  const loadWarehouses = useCallback(async () => {
    try {
      const res = await warehouseApi.getAll();
      setWarehouses(res.data);
    } catch {
      message.error('Error cargando almacenes');
    }
  }, []);

  const loadLocations = useCallback(async () => {
    try {
      const res = await locationsApi.getAll();
      setLocations(res.data);
    } catch {
      /* ignore */
    }
  }, []);

  const loadItems = useCallback(async (warehouseId: string) => {
    if (!warehouseId) { setItems([]); return; }
    setLoading(true);
    try {
      const res = await warehouseApi.getItems(warehouseId);
      setItems(res.data);
    } catch {
      message.error('Error cargando items');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMovements = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (movFilterWarehouse) params.warehouseId = movFilterWarehouse;
      if (movFilterItem) params.itemId = movFilterItem;
      if (movFilterType) params.type = movFilterType;
      if (movFilterDates?.[0]) params.dateFrom = movFilterDates[0].startOf('day').toISOString();
      if (movFilterDates?.[1]) params.dateTo = movFilterDates[1].endOf('day').toISOString();
      const res = await warehouseApi.getMovements(params);
      setMovements(res.data);
    } catch {
      message.error('Error cargando movimientos');
    } finally {
      setLoading(false);
    }
  }, [movFilterWarehouse, movFilterItem, movFilterType, movFilterDates]);

  const loadLowStock = useCallback(async () => {
    try {
      const res = await warehouseApi.getLowStockItems();
      setLowStockItems(res.data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadWarehouses();
    loadLocations();
    loadLowStock();
  }, [loadWarehouses, loadLocations, loadLowStock]);

  useEffect(() => {
    if (selectedWarehouseId) loadItems(selectedWarehouseId);
  }, [selectedWarehouseId, loadItems]);

  useEffect(() => {
    if (activeTab === 'movements') loadMovements();
    if (activeTab === 'alerts') loadLowStock();
  }, [activeTab, loadMovements, loadLowStock]);

  // ─── Handlers ──────────────────────────────────────

  const handleWarehouseSelect = (wh: any) => {
    setSelectedWarehouseId(wh.id);
    setActiveTab('items');
  };

  const handleCreateWarehouseClose = (saved?: boolean) => {
    setCreateWarehouseOpen(false);
    if (saved) loadWarehouses();
  };

  const handleEditWarehouseClose = (saved?: boolean) => {
    setEditWarehouseOpen(false);
    setEditWarehouseData(null);
    if (saved) loadWarehouses();
  };

  const handleCreateItemClose = (saved?: boolean) => {
    setCreateItemOpen(false);
    if (saved) { loadItems(selectedWarehouseId); loadLowStock(); }
  };

  const handleEditItemClose = (saved?: boolean) => {
    setEditItemOpen(false);
    setEditItemData(null);
    if (saved) { loadItems(selectedWarehouseId); loadLowStock(); }
  };

  const handleStockEntryClose = (saved?: boolean) => {
    setStockEntryOpen(false);
    if (saved) { loadItems(selectedWarehouseId); loadLowStock(); }
  };

  const handleTransferClose = (saved?: boolean) => {
    setTransferOpen(false);
    if (saved) { loadWarehouses(); if (selectedWarehouseId) loadItems(selectedWarehouseId); loadLowStock(); }
  };

  const existingWarehouseLocationIds = warehouses.map((w: any) => w.locationId);

  // ─── Warehouses Tab ────────────────────────────────

  const warehouseColumns = [
    {
      title: 'CO',
      key: 'co',
      width: 80,
      render: (_: any, r: any) => r.location?.operationalCenter ?? '-',
    },
    { title: 'Nombre', dataIndex: 'name', key: 'name' },
    {
      title: 'Ubicación',
      key: 'location',
      render: (_: any, r: any) => r.location?.name || '-',
    },
    {
      title: 'Estado',
      key: 'active',
      render: (_: any, r: any) =>
        r.active ? <Tag color="green">Activo</Tag> : <Tag color="red">Inactivo</Tag>,
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_: any, r: any) => (
        <Button
          size="small"
          icon={<EditOutlined />}
          onClick={(e) => { e.stopPropagation(); setEditWarehouseData(r); setEditWarehouseOpen(true); }}
        />
      ),
    },
  ];

  const renderWarehousesTab = () => (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: isMobile ? 14 : 16, fontWeight: 600 }}>Almacenes</span>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateWarehouseOpen(true)} size="middle">
            {isMobile ? 'Nuevo' : 'Crear Almacén'}
          </Button>
        </div>
      }
      styles={{ body: { padding: isMobile ? 12 : '12px 24px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {warehouses.map((wh: any) => (
            <Card
              key={wh.id}
              size="small"
              hoverable
              onClick={() => handleWarehouseSelect(wh)}
              extra={
                <Button size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); setEditWarehouseData(wh); setEditWarehouseOpen(true); }} />
              }
            >
              <div><strong>{wh.name}</strong></div>
              <div style={{ color: '#888', fontSize: 12 }}>
                {wh.location?.operationalCenter != null && <span style={{ fontWeight: 600 }}>CO {wh.location.operationalCenter} - </span>}
                {wh.location?.name || '-'}
              </div>
              {wh.active ? <Tag color="green">Activo</Tag> : <Tag color="red">Inactivo</Tag>}
            </Card>
          ))}
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Table
            dataSource={warehouses}
            columns={warehouseColumns}
            rowKey="id"
            pagination={{
              total: warehouses.length,
              pageSize: 10,
              showTotal: (total) => `Total: ${total} almacenes`,
              size: 'small',
              showSizeChanger: false,
            }}
            size="small"
            onRow={(record) => ({ onClick: () => handleWarehouseSelect(record), style: { cursor: 'pointer' } })}
          />
        </div>
      )}
    </Card>
  );

  // ─── Items Tab ─────────────────────────────────────

  const itemColumns = [
    { title: 'Nombre', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: 'Marca', dataIndex: 'brand', key: 'brand', render: (v: any) => v || '-' },
    { title: 'Unidad', dataIndex: 'unitOfMeasure', key: 'unit', render: (v: string) => UNIT_LABELS[v] || v },
    { title: 'Medida/Peso', dataIndex: 'weightOrSize', key: 'weight', render: (v: any) => v || '-' },
    {
      title: 'Costo Unit.',
      dataIndex: 'unitCost',
      key: 'unitCost',
      render: (v: any) => `$${Number(v).toLocaleString('es-CO', { minimumFractionDigits: 0 })}`,
    },
    {
      title: 'Stock',
      key: 'stock',
      render: (_: any, r: any) => {
        const isLow = Number(r.minimumStock) > 0 && Number(r.stock) < Number(r.minimumStock);
        return (
          <span style={{ color: isLow ? '#ff4d4f' : undefined, fontWeight: isLow ? 600 : undefined }}>
            {Number(r.stock).toLocaleString('es-CO', { minimumFractionDigits: 0 })}
          </span>
        );
      },
    },
    {
      title: 'Stock Mín.',
      dataIndex: 'minimumStock',
      key: 'min',
      render: (v: any) => Number(v) > 0 ? Number(v).toLocaleString('es-CO') : '-',
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_: any, r: any) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => { setEditItemData(r); setEditItemOpen(true); }} />
      ),
    },
  ];

  const renderItemsTab = () => (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: isMobile ? 14 : 16, fontWeight: 600 }}>Items</span>
            <Select
              style={{ minWidth: 180 }}
              placeholder="Seleccione almacén"
              value={selectedWarehouseId || undefined}
              onChange={(val) => { setSelectedWarehouseId(val); setItemSearch(''); }}
              options={warehouses.map((w: any) => ({ label: w.name, value: w.id }))}
              allowClear
              size={isMobile ? 'small' : 'middle'}
            />
          </div>
          <Space wrap>
            <Button icon={<PlusOutlined />} disabled={!selectedWarehouseId} onClick={() => setCreateItemOpen(true)} size="middle">
              {isMobile ? 'Item' : 'Crear Item'}
            </Button>
            <Button type="primary" icon={<ImportOutlined />} disabled={!selectedWarehouseId || items.length === 0} onClick={() => setStockEntryOpen(true)} size="middle">
              {isMobile ? 'Ingreso' : 'Ingreso Stock'}
            </Button>
          </Space>
        </div>
      }
      styles={{ body: { padding: isMobile ? 12 : '12px 24px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {!selectedWarehouseId ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
          Seleccione un almacén para ver sus items
        </div>
      ) : (() => {
        const search = itemSearch.toLowerCase();
        const filteredItems = search
          ? items.filter((i: any) => i.name.toLowerCase().includes(search) || (i.brand && i.brand.toLowerCase().includes(search)))
          : items;
        return (
          <>
            <Input
              placeholder="Buscar por nombre o marca..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              allowClear
              size={isMobile ? 'middle' : 'middle'}
              style={{ marginBottom: 12, maxWidth: isMobile ? '100%' : 300 }}
            />
            {isMobile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredItems.map((item: any) => {
                  const isLow = Number(item.minimumStock) > 0 && Number(item.stock) < Number(item.minimumStock);
                  return (
                    <Card
                      key={item.id}
                      size="small"
                      style={isLow ? { borderLeft: '3px solid #ff4d4f' } : undefined}
                      extra={
                        <Button size="small" icon={<EditOutlined />} onClick={() => { setEditItemData(item); setEditItemOpen(true); }} />
                      }
                    >
                      <div><strong>{item.name}</strong></div>
                      {item.brand && <div style={{ color: '#888', fontSize: 12 }}>Marca: {item.brand}</div>}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                        <span>{UNIT_LABELS[item.unitOfMeasure] || item.unitOfMeasure}</span>
                        <span>Costo: ${Number(item.unitCost).toLocaleString('es-CO')}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                        <span style={{ color: isLow ? '#ff4d4f' : undefined, fontWeight: isLow ? 600 : undefined }}>
                          Stock: {Number(item.stock).toLocaleString('es-CO')}
                        </span>
                        {Number(item.minimumStock) > 0 && <span>Mín: {Number(item.minimumStock).toLocaleString('es-CO')}</span>}
                      </div>
                    </Card>
                  );
                })}
                {filteredItems.length === 0 && <div style={{ textAlign: 'center', padding: 20, color: '#888' }}>{itemSearch ? 'Sin resultados' : 'No hay items'}</div>}
              </div>
            ) : (
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <Table
                  dataSource={filteredItems}
                  columns={itemColumns}
                  rowKey="id"
                  pagination={{
                    total: filteredItems.length,
                    pageSize: 10,
                    showTotal: (total) => `Total: ${total} items`,
                    size: 'small',
                    showSizeChanger: false,
                  }}
                  size="small"
                  loading={loading}
                />
              </div>
            )}
          </>
        );
      })()}
    </Card>
  );

  // ─── Movements Tab ─────────────────────────────────

  const movementColumns = [
    {
      title: 'Fecha',
      dataIndex: 'createdAt',
      key: 'date',
      width: 140,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Tipo',
      dataIndex: 'type',
      key: 'type',
      render: (v: string) => {
        const cfg = MOVEMENT_TYPE_CONFIG[v] || { color: 'default', label: v };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: 'Almacén',
      key: 'warehouse',
      render: (_: any, r: any) => r.warehouse?.name || '-',
    },
    {
      title: 'Item',
      key: 'item',
      render: (_: any, r: any) => r.item?.name || '-',
      ellipsis: true,
    },
    {
      title: 'Cantidad',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (v: any) => Number(v).toLocaleString('es-CO', { minimumFractionDigits: 0 }),
    },
    {
      title: 'Costo Unit.',
      dataIndex: 'unitCostAtTime',
      key: 'unitCost',
      render: (v: any) => `$${Number(v).toLocaleString('es-CO', { minimumFractionDigits: 0 })}`,
    },
    {
      title: 'Costo Total',
      dataIndex: 'totalCost',
      key: 'totalCost',
      render: (v: any) => `$${Number(v).toLocaleString('es-CO', { minimumFractionDigits: 0 })}`,
    },
    {
      title: 'OT',
      dataIndex: 'workOrderId',
      key: 'wo',
      render: (v: string) => v ? <Tooltip title={v}>{v.substring(0, 8)}...</Tooltip> : '-',
    },
    { title: 'Usuario', dataIndex: 'createdBy', key: 'user', ellipsis: true },
    { title: 'Observación', dataIndex: 'observation', key: 'obs', ellipsis: true, render: (v: any) => v || '-' },
  ];

  // Build item options for movement filter (from all items across warehouses or just the filtered warehouse)
  const [movFilterItemOptions, setMovFilterItemOptions] = useState<any[]>([]);
  useEffect(() => {
    if (movFilterWarehouse) {
      warehouseApi.getItems(movFilterWarehouse).then(res => setMovFilterItemOptions(res.data)).catch(() => {});
    } else {
      setMovFilterItemOptions([]);
    }
  }, [movFilterWarehouse]);

  const renderMovementsTab = () => (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: isMobile ? 14 : 16, fontWeight: 600 }}>Movimientos (Kardex)</span>
        </div>
      }
      styles={{ body: { padding: isMobile ? 12 : '12px 24px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <Select
          style={{ minWidth: 180 }}
          placeholder="Almacén"
          value={movFilterWarehouse || undefined}
          onChange={(val) => { setMovFilterWarehouse(val || ''); setMovFilterItem(''); }}
          options={warehouses.map((w: any) => ({ label: w.name, value: w.id }))}
          allowClear
          size={isMobile ? 'small' : 'middle'}
        />
        <Select
          style={{ minWidth: 180 }}
          placeholder="Item"
          value={movFilterItem || undefined}
          onChange={(val) => setMovFilterItem(val || '')}
          options={movFilterItemOptions.map((i: any) => ({ label: i.name, value: i.id }))}
          allowClear
          disabled={!movFilterWarehouse}
          size={isMobile ? 'small' : 'middle'}
        />
        <Select
          style={{ minWidth: 160 }}
          placeholder="Tipo"
          value={movFilterType || undefined}
          onChange={(val) => setMovFilterType(val || '')}
          options={Object.entries(MOVEMENT_TYPE_CONFIG).map(([k, v]) => ({ label: v.label, value: k }))}
          allowClear
          size={isMobile ? 'small' : 'middle'}
        />
        {!isMobile && (
          <RangePicker
            onChange={(dates) => setMovFilterDates(dates)}
            value={movFilterDates}
            format="DD/MM/YYYY"
          />
        )}
        <Button icon={<SearchOutlined />} type="primary" onClick={loadMovements} size="middle">
          {isMobile ? '' : 'Buscar'}
        </Button>
        <Button icon={<ReloadOutlined />} onClick={() => { setMovFilterWarehouse(''); setMovFilterItem(''); setMovFilterType(''); setMovFilterDates(null); }} size="middle">
          {isMobile ? '' : 'Limpiar'}
        </Button>
      </div>

      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {movements.map((m: any) => {
            const cfg = MOVEMENT_TYPE_CONFIG[m.type] || { color: 'default', label: m.type };
            return (
              <Card key={m.id} size="small">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Tag color={cfg.color}>{cfg.label}</Tag>
                  <span style={{ fontSize: 12, color: '#888' }}>{dayjs(m.createdAt).format('DD/MM/YY HH:mm')}</span>
                </div>
                <div><strong>{m.item?.name || '-'}</strong></div>
                <div style={{ fontSize: 12, color: '#888' }}>{m.warehouse?.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span>Cant: {Number(m.quantity).toLocaleString('es-CO')}</span>
                  <span>Total: ${Number(m.totalCost).toLocaleString('es-CO')}</span>
                </div>
                {m.workOrderId && <div style={{ fontSize: 12, color: '#888' }}>OT: {m.workOrderId.substring(0, 8)}...</div>}
                <div style={{ fontSize: 11, color: '#999' }}>{m.createdBy}</div>
              </Card>
            );
          })}
          {movements.length === 0 && <div style={{ textAlign: 'center', padding: 20, color: '#888' }}>No hay movimientos</div>}
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Table
            dataSource={movements}
            columns={movementColumns}
            rowKey="id"
            pagination={{
              total: movements.length,
              pageSize: 10,
              showTotal: (total) => `Total: ${total} movimientos`,
              size: 'small',
              showSizeChanger: false,
            }}
            size="small"
            loading={loading}
            scroll={{ x: 1100 }}
          />
        </div>
      )}
    </Card>
  );

  // ─── Transfers Tab ─────────────────────────────────

  const renderTransfersTab = () => {
    const transferMovements = movements.filter(
      (m: any) => m.type === 'TRASLADO_SALIDA' || m.type === 'TRASLADO_ENTRADA',
    );

    // Group by transferId
    const transferGroups: Record<string, any[]> = {};
    transferMovements.forEach((m: any) => {
      if (m.transferId) {
        if (!transferGroups[m.transferId]) transferGroups[m.transferId] = [];
        transferGroups[m.transferId].push(m);
      }
    });

    return (
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: isMobile ? 14 : 16, fontWeight: 600 }}>Traslados</span>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={loadMovements} size="middle">
                {isMobile ? '' : 'Recargar'}
              </Button>
              <Button type="primary" icon={<SwapOutlined />} onClick={() => setTransferOpen(true)} disabled={warehouses.length < 2 || !hasPermission(['GESTIONAR_INVENTARIO', 'CREAR_TRASLADOS_ALMACEN'])} size="middle">
                {isMobile ? 'Nuevo' : 'Crear Traslado'}
              </Button>
            </Space>
          </div>
        }
        styles={{ body: { padding: isMobile ? 12 : '0 24px 12px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        {Object.entries(transferGroups).length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
            No hay traslados registrados. Consulte la pestaña Movimientos para ver todos los movimientos.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(transferGroups).map(([transferId, movs]) => {
              const salida = movs.find((m: any) => m.type === 'TRASLADO_SALIDA');
              const entrada = movs.find((m: any) => m.type === 'TRASLADO_ENTRADA');
              return (
                <Card key={transferId} size="small">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: '#888' }}>ID: {transferId.substring(0, 8)}...</span>
                    <span style={{ fontSize: 12, color: '#888' }}>{dayjs(salida?.createdAt).format('DD/MM/YYYY HH:mm')}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <div>
                      <Tag color="orange">Origen: {salida?.warehouse?.name || '-'}</Tag>
                    </div>
                    <span>→</span>
                    <div>
                      <Tag color="blue">Destino: {entrada?.warehouse?.name || '-'}</Tag>
                    </div>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <strong>{salida?.item?.name || '-'}</strong> — Cantidad: {Number(salida?.quantity || 0).toLocaleString('es-CO')}
                  </div>
                  {salida?.observation && <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{salida.observation}</div>}
                  <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Por: {salida?.createdBy}</div>
                </Card>
              );
            })}
          </div>
        )}
      </Card>
    );
  };

  // ─── Alerts Tab ────────────────────────────────────

  const alertColumns = [
    {
      title: 'Almacén',
      key: 'warehouse',
      render: (_: any, r: any) => r.warehouse?.name || '-',
    },
    { title: 'Item', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: 'Marca', dataIndex: 'brand', key: 'brand', render: (v: any) => v || '-' },
    { title: 'Unidad', dataIndex: 'unitOfMeasure', key: 'unit', render: (v: string) => UNIT_LABELS[v] || v },
    {
      title: 'Stock Actual',
      dataIndex: 'stock',
      key: 'stock',
      render: (v: any) => (
        <span style={{ color: '#ff4d4f', fontWeight: 600 }}>
          {Number(v).toLocaleString('es-CO', { minimumFractionDigits: 0 })}
        </span>
      ),
    },
    {
      title: 'Stock Mínimo',
      dataIndex: 'minimumStock',
      key: 'min',
      render: (v: any) => Number(v).toLocaleString('es-CO'),
    },
    {
      title: 'Costo Unit.',
      dataIndex: 'unitCost',
      key: 'unitCost',
      render: (v: any) => `$${Number(v).toLocaleString('es-CO', { minimumFractionDigits: 0 })}`,
    },
  ];

  const renderAlertsTab = () => (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <WarningOutlined style={{ color: '#faad14' }} />
            <span style={{ fontSize: isMobile ? 14 : 16, fontWeight: 600 }}>
              Items con Stock Bajo ({lowStockItems.length})
            </span>
          </div>
          <Button icon={<ReloadOutlined />} onClick={loadLowStock} size="middle">
            {isMobile ? '' : 'Actualizar'}
          </Button>
        </div>
      }
      styles={{ body: { padding: isMobile ? 12 : '0 24px 12px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {lowStockItems.length === 0 ? (
        <Empty description="No hay items con stock bajo" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lowStockItems.map((item: any) => (
            <Card
              key={item.id}
              size="small"
              style={{ borderLeft: '3px solid #ff4d4f' }}
            >
              <div style={{ fontSize: 12, color: '#888' }}>{item.warehouse?.name || '-'}</div>
              <div><strong>{item.name}</strong></div>
              {item.brand && <div style={{ color: '#888', fontSize: 12 }}>Marca: {item.brand}</div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ color: '#ff4d4f', fontWeight: 600 }}>
                  Stock: {Number(item.stock).toLocaleString('es-CO')}
                </span>
                <span>Mínimo: {Number(item.minimumStock).toLocaleString('es-CO')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span>{UNIT_LABELS[item.unitOfMeasure] || item.unitOfMeasure}</span>
                <span>Costo: ${Number(item.unitCost).toLocaleString('es-CO')}</span>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Table
            dataSource={lowStockItems}
            columns={alertColumns}
            rowKey="id"
            pagination={{
              total: lowStockItems.length,
              pageSize: 10,
              showTotal: (total) => `Total: ${total} alertas`,
              size: 'small',
              showSizeChanger: false,
            }}
            size="small"
          />
        </div>
      )}
    </Card>
  );

  // ─── Tabs ──────────────────────────────────────────

  const tabItems = [
    { key: 'warehouses', label: 'Almacenes', children: renderWarehousesTab() },
    { key: 'items', label: 'Items', children: renderItemsTab() },
    {
      key: 'movements',
      label: 'Movimientos',
      children: renderMovementsTab(),
    },
    { key: 'transfers', label: 'Traslados', children: renderTransfersTab() },
    {
      key: 'alerts',
      label: (
        <span>
          Alertas
          {lowStockItems.length > 0 && (
            <span style={{ marginLeft: 6, background: '#ff4d4f', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>
              {lowStockItems.length}
            </span>
          )}
        </span>
      ),
      children: renderAlertsTab(),
    },
  ];

  return (
    <div style={{ height: isMobile ? 'auto' : '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{`
        .warehouse-tabs { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .warehouse-tabs > .ant-tabs-content-holder { flex: 1; overflow: hidden; }
        .warehouse-tabs .ant-tabs-content { height: 100%; }
        .warehouse-tabs .ant-tabs-tabpane-active { height: 100%; display: flex; flex-direction: column; }
        ${isMobile ? `
          .warehouse-tabs .ant-tabs-tab { color: rgba(255,255,255,0.65) !important; }
          .warehouse-tabs .ant-tabs-tab-active .ant-tabs-tab-btn { color: #fff !important; }
          .warehouse-tabs .ant-tabs-ink-bar { background: #E60012 !important; }
          .warehouse-tabs .ant-tabs-nav::before { border-bottom-color: rgba(255,255,255,0.15) !important; }
        ` : ''}
      `}</style>
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key)}
        items={tabItems}
        className="warehouse-tabs"
        size={isMobile ? 'small' : 'middle'}
      />

      {/* Modals */}
      <CreateWarehouseModal
        open={createWarehouseOpen}
        onClose={handleCreateWarehouseClose}
        locations={locations}
        existingWarehouseLocationIds={existingWarehouseLocationIds}
      />
      <EditWarehouseModal
        open={editWarehouseOpen}
        onClose={handleEditWarehouseClose}
        warehouse={editWarehouseData}
      />
      <CreateItemModal
        open={createItemOpen}
        onClose={handleCreateItemClose}
        warehouseId={selectedWarehouseId}
      />
      <EditItemModal
        open={editItemOpen}
        onClose={handleEditItemClose}
        item={editItemData}
      />
      <StockEntryModal
        open={stockEntryOpen}
        onClose={handleStockEntryClose}
        items={items}
        userEmail={user?.email || ''}
      />
      <CreateTransferModal
        open={transferOpen}
        onClose={handleTransferClose}
        warehouses={warehouses}
        userEmail={user?.email || ''}
      />
    </div>
  );
};

export default WarehousePage;
