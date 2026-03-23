import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Descriptions, Table, Tag, Image, Spin, message, Card, Divider, Pagination } from 'antd';
import {
  DollarOutlined,
  HistoryOutlined,
  EnvironmentOutlined,
  SwapOutlined,
  StopOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { assetsApi, workOrdersApi, assetEventsApi, usersApi } from '../../services/api';
import { assetStatusColors } from '../../config/theme';

interface ViewAssetDetailModalProps {
  open: boolean;
  onClose: () => void;
  assetId: string;
}

const ViewAssetDetailModal: React.FC<ViewAssetDetailModalProps> = ({
  open,
  onClose,
  assetId,
}) => {
  const [asset, setAsset] = useState<any>(null);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [bajas, setBajas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [woPage, setWoPage] = useState(1);
  const [eventsPage, setEventsPage] = useState(1);
  const [transfersPage, setTransfersPage] = useState(1);
  const [bajasPage, setBajasPage] = useState(1);

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
    if (open && assetId) {
      loadAssetDetail();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, assetId]);

  const loadAssetDetail = async () => {
    try {
      setLoading(true);

      // 1. Cargar activo
      const assetRes = await assetsApi.getById(assetId);
      setAsset(assetRes.data);

      // 2. Cargar eventos PRIMERO (para saber cu��les son reparaciones)
      let allEvents: any[] = [];
      try {
        const eventsRes = await assetEventsApi.getByAsset(assetId);
        allEvents = eventsRes.data;
      } catch (evError) {
        console.warn('Could not load events:', evError);
      }

      // 3. Identificar OT de tipo REPARACION por workOrderId
      const reparacionWorkOrderIds = new Set(
        allEvents
          .filter((event: any) => event.type === 'REPARACION' && event.workOrderId)
          .map((event: any) => event.workOrderId)
      );

      // 4. Cargar OT del activo
      const woRes = await workOrdersApi.getByAsset(assetId);

      // --- NUEVO: mapa para enriquecer eventos de REPARACION con datos de la OT ---
      const allWorkOrders = woRes.data || [];
      const woById = new Map(allWorkOrders.map((wo: any) => [wo.id, wo]));

      // 5. Identificar OT de REPARACION por eventos sin workOrderId (fallback)
      const reparacionEventsWithoutWorkOrder = allEvents.filter(
        (event: any) => event.type === 'REPARACION' && !event.workOrderId
      );

      // Filtrar: Excluir OT que:
      // a) Tienen workOrderId en un evento de REPARACION
      // b) Tienen el mismo costo y fecha cercana a un evento de REPARACION sin workOrderId
      const maintenanceWorkOrders = allWorkOrders.filter((wo: any) => {
        // Si ya est�� en el Set, excluir
        if (reparacionWorkOrderIds.has(wo.id)) return false;

        // Fallback: Verificar si hay un evento de REPARACION con mismo costo y fecha cercana
        const matchingReparacion = reparacionEventsWithoutWorkOrder.find((event: any) => {
          if (!wo.closedAt || !event.createdAt) return false;
          const woCost = Number(wo.cost) || 0;
          const eventCost = Number(event.cost) || 0;
          const timeDiff = Math.abs(
            new Date(wo.closedAt).getTime() - new Date(event.createdAt).getTime()
          );
          // Mismo costo y cerrada dentro de 5 minutos del evento
          return Math.abs(woCost - eventCost) < 10 && timeDiff < 5 * 60 * 1000;
        });

        return !matchingReparacion;
      });

      // 6. Cargar usuarios para mapear email -> nombre
      let usersByEmail: Record<string, string> = {};
      try {
        const usersRes = await usersApi.getAll();
        const users = usersRes.data || [];
        usersByEmail = users.reduce((map: Record<string, string>, u: any) => {
          if (u.email) map[u.email] = u.name || u.email;
          return map;
        }, {});
      } catch (e) {
        console.warn('Could not load users:', e);
      }

      setWorkOrders(maintenanceWorkOrders.map((wo: any) => ({
        ...wo,
        finishedByName: wo.finishedBy ? (usersByEmail[wo.finishedBy] || wo.finishedBy) : null,
      })));

      // 7. Enriquecer eventos con datos de OT y nombre de usuario
      const enrichedEvents = allEvents
        .map((event: any) => {
          const enriched = { ...event };
          if (event.type === 'REPARACION' && event.workOrderId) {
            const wo = woById.get(event.workOrderId);
            enriched.finishedBy = wo?.finishedBy;
            enriched.finishedAt = wo?.finishedAt;
            enriched.closedAt = wo?.closedAt;
            enriched.status = wo?.status;
          }
          if (event.createdBy) {
            enriched.createdByName = usersByEmail[event.createdBy] || event.createdBy;
          }
          return enriched;
        })
        .filter((event: any) => event.type === 'REPARACION');

      setEvents(enrichedEvents);

      // 8. Filtrar traslados (solo TRASLADO)
      const enrichEvent = (event: any) => {
        const enriched = { ...event };
        if (event.createdBy) {
          enriched.createdByName = usersByEmail[event.createdBy] || event.createdBy;
        }
        return enriched;
      };

      const transferEvents = allEvents
        .filter((event: any) => event.type === 'TRASLADO')
        .map(enrichEvent);
      setTransfers(transferEvents);

      // 9. Filtrar bajas y reactivaciones
      const bajaEvents = allEvents
        .filter((event: any) => ['BAJA', 'REACTIVACION'].includes(event.type))
        .map(enrichEvent);
      setBajas(bajaEvents);

    } catch (error: any) {
      console.error('Error loading asset detail:', error);
      message.error('Error al cargar detalles del activo');
    } finally {
      setLoading(false);
    }
  };

  // Mobile Card Renderers
  const renderWorkOrderCard = (record: any) => (
    <Card key={record.id} style={{ marginBottom: 12 }} size="small">
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 18, color: '#8c8c8c' }}>
            {record.id.substring(0, 8)}
          </span>
          <Tag color="orange-inverse">Mantenimiento</Tag>
        </div>
        <div style={{ fontSize: 12, color: '#595959', marginBottom: 4 }}>
          <strong>Ubicación:</strong> {record.location?.name || asset?.location?.name || '-'}
        </div>
        <div style={{ fontSize: 13, marginBottom: 8, lineHeight: 1.4 }}>
          {record.workDoneDescription || 'N/A'}
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#E60012', marginBottom: 8 }}>
          {formatCOP(record.cost)}
        </div>
        <div style={{ fontSize: 11, color: '#8c8c8c' }}>
          <div> {dayjs(record.finishedAt).format('DD/MM/YYYY HH:mm')}</div>
          <div> {record.finishedByName || record.finishedBy || 'N/A'}</div>
        </div>
      </div>
    </Card>
  );

  const renderEventCard = (record: any) => {
    const colors: any = {
      COMPRA: 'green-inverse',
      TRANSFERENCIA: 'blue-inverse',
      TRASLADO: 'pink-inverse',
      BAJA: 'red-inverse',
      REACTIVACION: 'green-inverse',
      REPARACION: 'yellow-inverse',
    };
    const numCost = Number(record.cost || 0);

    // Para REPARACION: mostrar ID de la OT
    const displayId =
      record.type === 'REPARACION' && record.workOrderId ? record.workOrderId : record.id;

    return (
      <Card key={record.id} style={{ marginBottom: 12 }} size="small">
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 18, color: '#8c8c8c' }}>
              {displayId.substring(0, 8)}
            </span>
            <Tag color={colors[record.type] || 'default'}>{record.type}</Tag>
          </div>

          {numCost > 0 && (
            <div style={{ fontSize: 16, fontWeight: 600, color: '#cf1322', marginBottom: 8 }}>
              {formatCOP(numCost)}
            </div>
          )}

          <div style={{ fontSize: 13, marginBottom: 8 }}>{record.description}</div>

          <div style={{ fontSize: 11, color: '#8c8c8c' }}>
            <div> {record.toLocation?.name || record.fromLocation?.name || asset?.location?.name || 'N/A'}</div>
            <div> {dayjs(record.createdAt).format('DD/MM/YYYY HH:mm')}</div>

            {record.type === 'REPARACION' && (
              <div style={{ marginTop: 6 }}>
                <div> {record.finishedBy || 'N/A'}</div>
              </div>
            )}
            {record.type !== 'REPARACION' && record.createdByName && (
              <div style={{ marginTop: 6 }}>
                <div> {record.createdByName}</div>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  // Desktop Table Columns
  const workOrderColumns = [
    {
      title: 'ID OT',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      ellipsis: true,
      render: (id: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{id.substring(0, 8)}</span>
      ),
    },
    {
      title: 'Tipo',
      key: 'type',
      width: 100,
      ellipsis: true,
      render: () => <Tag color="orange-inverse">Mantenimiento</Tag>,
    },
    {
      title: 'Ubicación',
      key: 'location',
      width: 110,
      ellipsis: true,
      sorter: (a: any, b: any) => (a.location?.name || '').localeCompare(b.location?.name || ''),
      render: (_: any, record: any) => record.location?.name || asset?.location?.name || '-',
    },
    {
      title: 'Descripcion',
      dataIndex: 'workDoneDescription',
      key: 'workDoneDescription',
      width: 150,
      ellipsis: true,
      sorter: (a: any, b: any) => (a.workDoneDescription || '').localeCompare(b.workDoneDescription || ''),
      render: (text: string) => text || 'N/A',
    },
    {
      title: 'Valor',
      dataIndex: 'cost',
      key: 'cost',
      width: 100,
      ellipsis: true,
      sorter: (a: any, b: any) => Number(a.cost || 0) - Number(b.cost || 0),
      render: (cost: number) => (
        <span style={{ fontWeight: 600, color: '#E60012' }}>{formatCOP(cost)}</span>
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'finishedAt',
      key: 'finishedAt',
      width: 120,
      ellipsis: true,
      sorter: (a: any, b: any) => new Date(a.finishedAt).getTime() - new Date(b.finishedAt).getTime(),
      defaultSortOrder: 'descend' as const,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Realizado Por',
      key: 'finishedBy',
      width: 130,
      ellipsis: true,
      sorter: (a: any, b: any) => (a.finishedByName || a.finishedBy || '').localeCompare(b.finishedByName || b.finishedBy || ''),
      render: (_: any, record: any) => record.finishedByName || record.finishedBy || 'N/A',
    },
  ];

  const eventColumns = [
    {
      title: 'ID OT',
      key: 'id',
      width: 70,
      ellipsis: true,
      render: (_: any, record: any) => {
        const displayId =
          record.type === 'REPARACION' && record.workOrderId ? record.workOrderId : record.id;
        return (
          <span style={{ fontFamily: 'monospace', fontSize: 13 }}>
            {displayId.substring(0, 8)}
          </span>
        );
      },
    },
    {
      title: 'Tipo',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      ellipsis: true,
      sorter: (a: any, b: any) => (a.type || '').localeCompare(b.type || ''),
      render: (type: string) => {
        const colors: any = {
          COMPRA: 'green-inverse',
          TRANSFERENCIA: 'blue-inverse',
          TRASLADO: 'pink-inverse',
          BAJA: 'red-inverse',
          REACTIVACION: 'green-inverse',
          REPARACION: 'yellow-inverse',
        };
        return <Tag color={colors[type] || 'default'}>{type}</Tag>;
      },
    },
    {
      title: 'Descripcion',
      dataIndex: 'description',
      key: 'description',
      width: 150,
      ellipsis: true,
      sorter: (a: any, b: any) => (a.description || '').localeCompare(b.description || ''),
    },
    {
      title: 'Ubicacion',
      key: 'location',
      width: 110,
      ellipsis: true,
      sorter: (a: any, b: any) => {
        const aLoc = a.toLocation?.name || a.fromLocation?.name || '';
        const bLoc = b.toLocation?.name || b.fromLocation?.name || '';
        return aLoc.localeCompare(bLoc);
      },
      render: (_: any, record: any) => record.toLocation?.name || record.fromLocation?.name || asset?.location?.name || 'N/A',
    },
    {
      title: 'Fecha',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      ellipsis: true,
      sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: 'descend' as const,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Costo',
      dataIndex: 'cost',
      key: 'cost',
      width: 90,
      ellipsis: true,
      sorter: (a: any, b: any) => Number(a.cost || 0) - Number(b.cost || 0),
      render: (cost: number) => {
        const numCost = Number(cost || 0);
        if (numCost === 0) return <span style={{ color: '#8c8c8c' }}>$0</span>;
        return <span style={{ color: '#cf1322', fontWeight: 600 }}>{formatCOP(numCost)}</span>;
      },
    },
    {
      title: 'Realizado Por',
      key: 'responsable',
      width: 120,
      ellipsis: true,
      sorter: (a: any, b: any) => {
        const aVal = a.type === 'REPARACION' ? (a.finishedBy || '') : (a.createdByName || '');
        const bVal = b.type === 'REPARACION' ? (b.finishedBy || '') : (b.createdByName || '');
        return aVal.localeCompare(bVal);
      },
      render: (_: any, record: any) => {
        if (record.type === 'REPARACION') return record.finishedBy || 'N/A';
        return record.createdByName || '-';
      },
    },
  ];

  const transferTypeColors: Record<string, string> = {
    TRASLADO: 'pink-inverse',
  };

  const bajaTypeColors: Record<string, string> = {
    BAJA: 'red-inverse',
    REACTIVACION: 'green-inverse',
  };

  const bajaTypeLabels: Record<string, string> = {
    BAJA: 'Baja',
    REACTIVACION: 'Reactivación',
  };

  const transferColumns = [
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
      title: 'Fecha',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      ellipsis: true,
      sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: 'descend' as const,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Tipo',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      ellipsis: true,
      sorter: (a: any, b: any) => (a.type || '').localeCompare(b.type || ''),
      render: (type: string) => <Tag color={transferTypeColors[type] || 'default'}>{type}</Tag>,
    },
    {
      title: 'Descripción',
      dataIndex: 'description',
      key: 'description',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'Origen',
      key: 'fromLocation',
      width: 110,
      ellipsis: true,
      render: (_: any, record: any) => record.fromLocation?.name || '-',
    },
    {
      title: 'Destino',
      key: 'toLocation',
      width: 110,
      ellipsis: true,
      render: (_: any, record: any) => record.toLocation?.name || '-',
    },
    {
      title: 'Costo',
      dataIndex: 'cost',
      key: 'cost',
      width: 100,
      ellipsis: true,
      sorter: (a: any, b: any) => Number(a.cost || 0) - Number(b.cost || 0),
      render: (cost: number) => {
        const numCost = Number(cost || 0);
        if (numCost === 0) return <span style={{ color: '#8c8c8c' }}>-</span>;
        return <span style={{ color: '#cf1322', fontWeight: 600 }}>{formatCOP(numCost)}</span>;
      },
    },
    {
      title: 'Registrado por',
      key: 'createdBy',
      width: 120,
      ellipsis: true,
      render: (_: any, record: any) => record.createdByName || '-',
    },
  ];

  const renderTransferCard = (record: any) => (
    <Card key={record.id} style={{ marginBottom: 12 }} size="small">
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#8c8c8c' }}>
            {record.id.substring(0, 8)}
          </span>
          <Tag color={transferTypeColors[record.type] || 'default'}>{record.type}</Tag>
        </div>
        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>
          {dayjs(record.createdAt).format('DD/MM/YYYY HH:mm')}
        </div>
        {record.description && (
          <div style={{ fontSize: 13, marginBottom: 8 }}>{record.description}</div>
        )}
        {(record.fromLocation || record.toLocation) && (
          <div style={{ fontSize: 12, color: '#595959', marginBottom: 4 }}>
            {record.fromLocation && <span><strong>De:</strong> {record.fromLocation.name}</span>}
            {record.fromLocation && record.toLocation && ' → '}
            {record.toLocation && <span><strong>A:</strong> {record.toLocation.name}</span>}
          </div>
        )}
        {Number(record.cost || 0) > 0 && (
          <div style={{ fontSize: 12, color: '#cf1322', fontWeight: 600, marginTop: 4 }}>
            <strong>Costo:</strong> {formatCOP(Number(record.cost))}
          </div>
        )}
        {record.createdByName && (
          <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 4 }}>
            Registrado por: {record.createdByName}
          </div>
        )}
      </div>
    </Card>
  );

  const bajaColumns = [
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
      title: 'Fecha',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      ellipsis: true,
      sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: 'descend' as const,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Tipo',
      dataIndex: 'type',
      key: 'type',
      width: 110,
      ellipsis: true,
      render: (type: string) => <Tag color={bajaTypeColors[type] || 'default'}>{bajaTypeLabels[type] || type}</Tag>,
    },
    {
      title: 'Descripción',
      dataIndex: 'description',
      key: 'description',
      width: 180,
      ellipsis: true,
    },
    {
      title: 'Ubicación',
      key: 'location',
      width: 120,
      ellipsis: true,
      render: (_: any, record: any) => record.fromLocation?.name || record.toLocation?.name || asset?.location?.name || '-',
    },
    {
      title: 'Registrado por',
      key: 'createdBy',
      width: 120,
      ellipsis: true,
      render: (_: any, record: any) => record.createdByName || '-',
    },
  ];

  const renderBajaCard = (record: any) => (
    <Card key={record.id} style={{ marginBottom: 12 }} size="small">
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#8c8c8c' }}>
            {record.id.substring(0, 8)}
          </span>
          <Tag color={bajaTypeColors[record.type] || 'default'}>{bajaTypeLabels[record.type] || record.type}</Tag>
        </div>
        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>
          {dayjs(record.createdAt).format('DD/MM/YYYY HH:mm')}
        </div>
        {record.description && (
          <div style={{ fontSize: 13, marginBottom: 8, wordBreak: 'break-word' }}>{record.description}</div>
        )}
        <div style={{ fontSize: 12, color: '#595959', marginBottom: 4 }}>
          <strong>Ubicación:</strong> {record.fromLocation?.name || record.toLocation?.name || asset?.location?.name || '-'}
        </div>
        {record.createdByName && (
          <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 4 }}>
            Registrado por: {record.createdByName}
          </div>
        )}
      </div>
    </Card>
  );

  const tabItems = [
    {
      key: 'info',
      label: isMobile ? 'Info' : 'Informacion',
      children: asset && (
        <div>
          {isMobile ? (
            <div>
              <Card size="small" style={{ marginBottom: 12 }}>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 20, color: '#8c8c8c' }}>Codigo</div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 18 }}>
                    {asset.code}
                  </div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: '#8c8c8c' }}>Estado</div>
                  <Tag color={assetStatusColors[asset.status]}>{asset.status}</Tag>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: '#8c8c8c' }}>Descripcion</div>
                  <div style={{ fontSize: 13 }}>{asset.description}</div>
                </div>
                <Divider style={{ margin: '12px 0' }} />
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: '#8c8c8c' }}>Categoria</div>
                  <div style={{ fontSize: 13 }}>{asset.category?.name}</div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: '#8c8c8c' }}>Ubicacion Actual</div>
                  <div style={{ fontSize: 13 }}>{asset.location?.name}</div>
                </div>
                <Divider style={{ margin: '12px 0' }} />
                {asset.brand && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: '#8c8c8c' }}>Marca</div>
                    <div style={{ fontSize: 13 }}>{asset.brand}</div>
                  </div>
                )}
                {asset.reference && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: '#8c8c8c' }}>Referencia</div>
                    <div style={{ fontSize: 13 }}>{asset.reference}</div>
                  </div>
                )}
                {asset.serial && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: '#8c8c8c' }}>Serial</div>
                    <div style={{ fontSize: 13 }}>{asset.serial}</div>
                  </div>
                )}
                <Divider style={{ margin: '12px 0' }} />
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: '#8c8c8c' }}>Valor</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#E60012' }}>
                    {formatCOP(asset.value)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#8c8c8c' }}>Fecha de Ingreso</div>
                  <div style={{ fontSize: 13 }}>{dayjs(asset.createdAt).format('DD/MM/YYYY')}</div>
                </div>
              </Card>

              {asset.photos && asset.photos.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Fotos:</div>
                  <Image.PreviewGroup>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {asset.photos.map((photo: string, index: number) => (
                        <Image
                          key={index}
                          width={100}
                          height={100}
                          src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${photo}`}
                          style={{ objectFit: 'cover', borderRadius: 8 }}
                        />
                      ))}
                    </div>
                  </Image.PreviewGroup>
                </div>
              )}
            </div>
          ) : (
            <div>
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="Codigo" span={1}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{asset.code}</span>
                </Descriptions.Item>
                <Descriptions.Item label="Estado" span={1}>
                  <Tag color={assetStatusColors[asset.status]}>{asset.status}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Descripcion" span={2}>
                  {asset.description}
                </Descriptions.Item>
                <Descriptions.Item label="Categoria" span={1}>
                  {asset.category?.name}
                </Descriptions.Item>
                <Descriptions.Item label="Ubicacion Actual" span={1}>
                  {asset.location?.name}
                </Descriptions.Item>
                <Descriptions.Item label="Marca" span={1}>
                  {asset.brand || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Referencia" span={1}>
                  {asset.reference || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Serial" span={1}>
                  {asset.serial || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Valor" span={1}>
                  {formatCOP(asset.value)}
                </Descriptions.Item>
                <Descriptions.Item label="Fecha de Ingreso" span={2}>
                  {dayjs(asset.createdAt).format('DD/MM/YYYY')}
                </Descriptions.Item>
              </Descriptions>

              {asset.photos && asset.photos.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h4>Fotos:</h4>
                  <Image.PreviewGroup>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {asset.photos.map((photo: string, index: number) => (
                        <Image
                          key={index}
                          width={120}
                          height={120}
                          src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${photo}`}
                          style={{ objectFit: 'cover', borderRadius: 8 }}
                        />
                      ))}
                    </div>
                  </Image.PreviewGroup>
                </div>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'history',
      label: isMobile ? 'Mantto' : 'Mantenimientos',
      children: (
        <div style={{ minHeight: 350 }}>
          {isMobile ? (
            workOrders.length > 0 ? (
              <div>
                {workOrders.slice((woPage - 1) * 5, woPage * 5).map(renderWorkOrderCard)}
                <Pagination
                  current={woPage}
                  pageSize={5}
                  total={workOrders.length}
                  onChange={(page) => setWoPage(page)}
                  size="small"
                  simple
                  style={{ textAlign: 'center', marginTop: 8 }}
                />
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }}>
                No hay mantenimientos registrados
              </div>
            )
          ) : (
            <Table
              columns={workOrderColumns}
              dataSource={workOrders}
              rowKey="id"
              size="small"
              tableLayout="fixed"
              pagination={{
                pageSize: 5,
                size: 'small',
                showTotal: (total) => `Total: ${total} registros`,
              }}
              locale={{ emptyText: 'No hay mantenimientos registrados' }}
            />
          )}
        </div>
      ),
    },
    {
      key: 'events',
      label: isMobile ? 'Reparaciones' : 'Reparaciones',
      children: (
        <div style={{ minHeight: 350 }}>
          {isMobile ? (
            events.length > 0 ? (
              <div>
                {events.slice((eventsPage - 1) * 5, eventsPage * 5).map(renderEventCard)}
                <Pagination
                  current={eventsPage}
                  pageSize={5}
                  total={events.length}
                  onChange={(page) => setEventsPage(page)}
                  size="small"
                  simple
                  style={{ textAlign: 'center', marginTop: 8 }}
                />
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }}>
                No hay eventos registrados
              </div>
            )
          ) : (
            <Table
              columns={eventColumns}
              dataSource={events}
              rowKey="id"
              size="small"
              tableLayout="fixed"
              pagination={{
                pageSize: 5,
                size: 'small',
                showTotal: (total) => `Total: ${total} eventos`,
              }}
              locale={{ emptyText: 'No hay eventos registrados' }}
            />
          )}
        </div>
      ),
    },
    {
      key: 'transfers',
      label: isMobile ? 'Traslados' : 'Traslados',
      children: (
        <div style={{ minHeight: 350 }}>
          {isMobile ? (
            transfers.length > 0 ? (
              <div>
                {transfers.slice((transfersPage - 1) * 5, transfersPage * 5).map(renderTransferCard)}
                <Pagination
                  current={transfersPage}
                  pageSize={5}
                  total={transfers.length}
                  onChange={(page) => setTransfersPage(page)}
                  size="small"
                  simple
                  style={{ textAlign: 'center', marginTop: 8 }}
                />
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }}>
                No hay traslados registrados
              </div>
            )
          ) : (
            <Table
              columns={transferColumns}
              dataSource={transfers}
              rowKey="id"
              size="small"
              tableLayout="fixed"
              pagination={{
                pageSize: 5,
                size: 'small',
                showTotal: (total) => `Total: ${total} traslados`,
              }}
              locale={{ emptyText: 'No hay traslados registrados' }}
            />
          )}
        </div>
      ),
    },
    {
      key: 'bajas',
      label: isMobile ? 'Bajas' : 'Historial Bajas',
      children: (
        <div style={{ minHeight: 350 }}>
          {isMobile ? (
            bajas.length > 0 ? (
              <div>
                {bajas.slice((bajasPage - 1) * 5, bajasPage * 5).map(renderBajaCard)}
                <Pagination
                  current={bajasPage}
                  pageSize={5}
                  total={bajas.length}
                  onChange={(page) => setBajasPage(page)}
                  size="small"
                  simple
                  style={{ textAlign: 'center', marginTop: 8 }}
                />
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }}>
                No hay bajas registradas
              </div>
            )
          ) : (
            <Table
              columns={bajaColumns}
              dataSource={bajas}
              rowKey="id"
              size="small"
              tableLayout="fixed"
              pagination={{
                pageSize: 5,
                size: 'small',
                showTotal: (total) => `Total: ${total} registros`,
              }}
              locale={{ emptyText: 'No hay bajas registradas' }}
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <Modal
      title={
        <span style={{ fontSize: isMobile ? 18 : 20 }}>
          {asset ? `Detalle del Activo - ${asset.code}` : 'Cargando...'}
        </span>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={isMobile ? 'calc(100vw - 24px)' : 1000}
      centered
      style={isMobile ? { maxWidth: 'calc(100vw - 24px)' } : {}}
      styles={{
        body: {
          maxHeight: isMobile ? 'calc(100vh - 120px)' : 'calc(100vh - 200px)',
          overflowY: 'auto',
          padding: isMobile ? 12 : undefined,
        },
      }}
    >
      <Spin spinning={loading}>
        {asset && (
          <Tabs
            items={tabItems}
            defaultActiveKey="info"
            size={isMobile ? 'small' : 'middle'}
          />
        )}
      </Spin>

    </Modal>
  );
};

export default ViewAssetDetailModal;