import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Descriptions, Table, Tag, Image, Spin, message, Card, Divider, Pagination, Segmented } from 'antd';
import dayjs from 'dayjs';
import { assetsApi, workOrdersApi, assetEventsApi, usersApi } from '../../services/api';
import { assetStatusColors, eventTypeStyles, eventTypeLabels } from '../../config/theme';

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
  const [activeTab, setActiveTab] = useState('info');

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

      // Cargar todo en paralelo
      const [assetRes, eventsRes, woRes, usersRes] = await Promise.all([
        assetsApi.getById(assetId),
        assetEventsApi.getByAsset(assetId).catch(() => ({ data: [] })),
        workOrdersApi.getByAsset(assetId),
        usersApi.getAll().catch(() => ({ data: [] })),
      ]);

      setAsset(assetRes.data);
      const allEvents = eventsRes.data || [];
      const allWorkOrders = woRes.data || [];

      // Mapa de usuarios
      const usersByEmail: Record<string, string> = (usersRes.data || []).reduce(
        (map: Record<string, string>, u: any) => {
          if (u.email) map[u.email] = u.name || u.email;
          return map;
        }, {}
      );

      // Mapa de OTs
      const woById: Map<string, any> = new Map(allWorkOrders.map((wo: any) => [wo.id, wo]));

      // Identificar OT de tipo REPARACION por workOrderId
      const reparacionWorkOrderIds = new Set(
        allEvents
          .filter((event: any) => event.type === 'REPARACION' && event.workOrderId)
          .map((event: any) => event.workOrderId)
      );

      const reparacionEventsWithoutWorkOrder = allEvents.filter(
        (event: any) => event.type === 'REPARACION' && !event.workOrderId
      );

      // Filtrar OT de mantenimiento (excluir las que ya son reparaciones)
      const maintenanceWorkOrders = allWorkOrders.filter((wo: any) => {
        if (reparacionWorkOrderIds.has(wo.id)) return false;
        const matchingReparacion = reparacionEventsWithoutWorkOrder.find((event: any) => {
          if (!wo.closedAt || !event.createdAt) return false;
          const woCost = Number(wo.cost) || 0;
          const eventCost = Number(event.cost) || 0;
          const timeDiff = Math.abs(
            new Date(wo.closedAt).getTime() - new Date(event.createdAt).getTime()
          );
          return Math.abs(woCost - eventCost) < 10 && timeDiff < 5 * 60 * 1000;
        });
        return !matchingReparacion;
      });

      setWorkOrders(maintenanceWorkOrders.map((wo: any) => ({
        ...wo,
        finishedByName: wo.finishedBy ? (usersByEmail[wo.finishedBy] || wo.finishedBy) : null,
      })));

      // 7. Enriquecer eventos con datos de OT y nombre de usuario
      const enrichedEvents = allEvents
        .map((event: any) => {
          const enriched: any = { ...event };
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

  // Estilos unificados para cards mobile
  const cardStyle = { marginBottom: 12 };
  const headerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 };
  const idStyle: React.CSSProperties = { fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: '#8c8c8c' };
  const descStyle: React.CSSProperties = { fontSize: 13, marginBottom: 6, lineHeight: 1.4, wordBreak: 'break-word' };
  const locationStyle: React.CSSProperties = { fontSize: 12, color: '#595959', marginBottom: 4 };
  const costStyle: React.CSSProperties = { fontSize: 14, fontWeight: 600, color: '#E60012', marginBottom: 6 };
  const metaStyle: React.CSSProperties = { fontSize: 11, color: '#8c8c8c' };

  const getEventTag = (type: string, label?: string) => {
    const eStyle = eventTypeStyles[type];
    return eStyle
      ? <Tag style={{ backgroundColor: eStyle.bg, color: eStyle.color, border: 'none' }}>{label || eventTypeLabels[type] || type}</Tag>
      : <Tag>{label || eventTypeLabels[type] || type}</Tag>;
  };

  // Mobile Card Renderers
  const renderWorkOrderCard = (record: any) => (
    <Card key={record.id} style={cardStyle} size="small">
      <div style={headerStyle}>
        <span style={idStyle}>OT-{record.id.substring(0, 8)}</span>
        {getEventTag('MANTENIMIENTO', 'Mantenimiento')}
      </div>
      <div style={descStyle}>{record.workDoneDescription || 'N/A'}</div>
      <div style={locationStyle}>
        <strong>Ubicación:</strong> {record.location?.name || asset?.location?.name || '-'}
      </div>
      {Number(record.cost || 0) > 0 && (
        <div style={costStyle}>{formatCOP(record.cost)}</div>
      )}
      <div style={metaStyle}>
        <div><strong>Creación:</strong> {dayjs(record.createdAt).format('DD/MM/YYYY HH:mm')}</div>
        {record.finishedAt && (
          <div><strong>Terminación:</strong> {dayjs(record.finishedAt).format('DD/MM/YYYY HH:mm')}</div>
        )}
        <div><strong>Realizó:</strong> {record.finishedByName || record.finishedBy || 'N/A'}</div>
      </div>
    </Card>
  );

  const renderEventCard = (record: any) => {
    const numCost = Number(record.cost || 0);
    const displayId =
      record.type === 'REPARACION' && record.workOrderId ? record.workOrderId : record.id;
    const responsable = record.type === 'REPARACION'
      ? (record.finishedBy || 'N/A')
      : (record.createdByName || 'N/A');

    return (
      <Card key={record.id} style={cardStyle} size="small">
        <div style={headerStyle}>
          <span style={idStyle}>OT-{displayId.substring(0, 8)}</span>
          {getEventTag(record.type)}
        </div>
        <div style={descStyle}>{record.description || 'N/A'}</div>
        <div style={locationStyle}>
          <strong>Ubicación:</strong> {record.toLocation?.name || record.fromLocation?.name || asset?.location?.name || 'N/A'}
        </div>
        {numCost > 0 && (
          <div style={costStyle}>{formatCOP(numCost)}</div>
        )}
        <div style={metaStyle}>
          <div><strong>Creación:</strong> {dayjs(record.createdAt).format('DD/MM/YYYY HH:mm')}</div>
          {(record.finishedAt || record.closedAt) && (
            <div><strong>Terminación:</strong> {dayjs(record.finishedAt || record.closedAt).format('DD/MM/YYYY HH:mm')}</div>
          )}
          <div><strong>Realizó:</strong> {responsable}</div>
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
      width: 130,
      ellipsis: true,
      render: () => <Tag style={{ backgroundColor: eventTypeStyles['MANTENIMIENTO']?.bg, color: eventTypeStyles['MANTENIMIENTO']?.color, border: 'none' }}>Mantenimiento</Tag>,
    },
    {
      title: 'Ubicación',
      key: 'location',
      width: 90,
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
      title: 'Fecha Creación',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      ellipsis: true,
      sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: 'descend' as const,
      render: (date: string) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : <span style={{ color: '#8c8c8c' }}>—</span>,
    },
    {
      title: 'Fecha Terminación',
      dataIndex: 'finishedAt',
      key: 'finishedAt',
      width: 120,
      ellipsis: true,
      sorter: (a: any, b: any) => new Date(a.finishedAt || 0).getTime() - new Date(b.finishedAt || 0).getTime(),
      render: (date: string) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : <span style={{ color: '#8c8c8c' }}>—</span>,
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
      width: 130,
      ellipsis: true,
      sorter: (a: any, b: any) => (a.type || '').localeCompare(b.type || ''),
      render: (type: string) => {
        const colors: any = {
          COMPRA: 'green-inverse',
          TRANSFERENCIA: 'blue-inverse',
        };
        const eStyle = eventTypeStyles[type];
        const tagProps = eStyle
          ? { style: { backgroundColor: eStyle.bg, color: eStyle.color, border: 'none' } }
          : { color: colors[type] || 'default' };
        return <Tag {...tagProps}>{eventTypeLabels[type] || type}</Tag>;
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
      width: 90,
      ellipsis: true,
      sorter: (a: any, b: any) => {
        const aLoc = a.toLocation?.name || a.fromLocation?.name || '';
        const bLoc = b.toLocation?.name || b.fromLocation?.name || '';
        return aLoc.localeCompare(bLoc);
      },
      render: (_: any, record: any) => record.toLocation?.name || record.fromLocation?.name || asset?.location?.name || 'N/A',
    },
    {
      title: 'Fecha Creación',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      ellipsis: true,
      sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: 'descend' as const,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Fecha Terminación',
      key: 'finishedAt',
      width: 120,
      ellipsis: true,
      sorter: (a: any, b: any) => {
        const aDate = a.finishedAt || a.closedAt || '';
        const bDate = b.finishedAt || b.closedAt || '';
        return new Date(aDate).getTime() - new Date(bDate).getTime();
      },
      render: (_: any, record: any) => {
        const date = record.finishedAt || record.closedAt;
        return date ? dayjs(date).format('DD/MM/YYYY HH:mm') : <span style={{ color: '#8c8c8c' }}>—</span>;
      },
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
      render: (type: string) => {
        const eStyle = eventTypeStyles[type];
        return eStyle
          ? <Tag style={{ backgroundColor: eStyle.bg, color: eStyle.color, border: 'none' }}>{eventTypeLabels[type] || type}</Tag>
          : <Tag color={transferTypeColors[type] || 'default'}>{eventTypeLabels[type] || type}</Tag>;
      },
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
    <Card key={record.id} style={cardStyle} size="small">
      <div style={headerStyle}>
        <span style={idStyle}>{record.id.substring(0, 8)}</span>
        {getEventTag(record.type)}
      </div>
      {record.description && (
        <div style={descStyle}>{record.description}</div>
      )}
      {(record.fromLocation || record.toLocation) && (
        <div style={locationStyle}>
          {record.fromLocation && <span><strong>De:</strong> {record.fromLocation.name}</span>}
          {record.fromLocation && record.toLocation && ' → '}
          {record.toLocation && <span><strong>A:</strong> {record.toLocation.name}</span>}
        </div>
      )}
      {Number(record.cost || 0) > 0 && (
        <div style={costStyle}>{formatCOP(Number(record.cost))}</div>
      )}
      <div style={metaStyle}>
        <div><strong>Fecha:</strong> {dayjs(record.createdAt).format('DD/MM/YYYY HH:mm')}</div>
        <div><strong>Registró:</strong> {record.createdByName || 'N/A'}</div>
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
      render: (type: string) => {
        const eStyle = eventTypeStyles[type];
        return eStyle
          ? <Tag style={{ backgroundColor: eStyle.bg, color: eStyle.color, border: 'none' }}>{bajaTypeLabels[type] || type}</Tag>
          : <Tag color={bajaTypeColors[type] || 'default'}>{bajaTypeLabels[type] || type}</Tag>;
      },
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

  const renderBajaCard = (record: any) => {
    const eStyle = eventTypeStyles[record.type];
    const bajaTag = eStyle
      ? <Tag style={{ backgroundColor: eStyle.bg, color: eStyle.color, border: 'none' }}>{bajaTypeLabels[record.type] || record.type}</Tag>
      : <Tag color={bajaTypeColors[record.type] || 'default'}>{bajaTypeLabels[record.type] || record.type}</Tag>;

    return (
      <Card key={record.id} style={cardStyle} size="small">
        <div style={headerStyle}>
          <span style={idStyle}>{record.id.substring(0, 8)}</span>
          {bajaTag}
        </div>
        {record.description && (
          <div style={descStyle}>{record.description}</div>
        )}
        <div style={locationStyle}>
          <strong>Ubicación:</strong> {record.fromLocation?.name || record.toLocation?.name || asset?.location?.name || '-'}
        </div>
        <div style={metaStyle}>
          <div><strong>Fecha:</strong> {dayjs(record.createdAt).format('DD/MM/YYYY HH:mm')}</div>
          <div><strong>Registró:</strong> {record.createdByName || 'N/A'}</div>
        </div>
      </Card>
    );
  };

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
                  <Tag color={assetStatusColors[asset.status as keyof typeof assetStatusColors]}>{asset.status}</Tag>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: '#8c8c8c' }}>Nombre</div>
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
                <div style={{ marginTop: 12, marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Fotos:</div>
                  <Image.PreviewGroup>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', overflow: 'hidden' }}>
                      {asset.photos.map((photo: string, index: number) => (
                        <Image
                          key={index}
                          width={80}
                          height={80}
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
                  <Tag color={assetStatusColors[asset.status as keyof typeof assetStatusColors]}>{asset.status}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Nombre" span={2}>
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
      width={isMobile ? 'calc(100% - 16px)' : 1000}
      centered
      style={isMobile ? { maxWidth: 'calc(100% - 16px)', padding: 0 } : {}}
      styles={{
        body: {
          maxHeight: isMobile ? 'calc(100vh - 120px)' : 'calc(100vh - 200px)',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: isMobile ? 12 : undefined,
        },
        content: isMobile ? { borderRadius: 8 } : {},
      }}
    >
      <Spin spinning={loading}>
        {asset && (
          isMobile ? (
            <div>
              <Segmented
                block
                size="middle"
                value={activeTab}
                onChange={(val) => setActiveTab(val as string)}
                options={tabItems.map((item) => ({ label: item.label, value: item.key }))}
                style={{ marginBottom: 12 }}
              />
              {tabItems.find((item) => item.key === activeTab)?.children}
            </div>
          ) : (
            <Tabs
              items={tabItems}
              defaultActiveKey="info"
              size="middle"
            />
          )
        )}
      </Spin>

    </Modal>
  );
};

export default ViewAssetDetailModal;