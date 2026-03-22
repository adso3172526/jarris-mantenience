import React, { useState, useEffect } from 'react';
import { Modal, Table, Tag, Spin, message, Card, Divider } from 'antd';
import { HomeOutlined, DollarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { locationsApi } from '../../services/api';

interface ViewLocationExpensesModalProps {
  open: boolean;
  onClose: () => void;
  locationId: string;
  locationName: string;
}

const ViewLocationExpensesModal: React.FC<ViewLocationExpensesModalProps> = ({
  open,
  onClose,
  locationId,
  locationName,
}) => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (open && locationId) {
      loadExpenses();
    }
  }, [open, locationId]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const response = await locationsApi.getExpenses(locationId);
      setExpenses(response.data);
      
      const total = response.data.reduce(
        (sum: number, wo: any) => sum + (Number(wo.cost) || 0), 
        0
      );
      setTotalExpenses(total);
    } catch (error: any) {
      console.error('Error loading expenses:', error);
      message.error('Error al cargar gastos');
    } finally {
      setLoading(false);
    }
  };

  const formatCOP = (value: number) => {
    return `$${Math.round(value).toLocaleString('es-CO')}`;
  };

  // Mobile Card View
  const renderMobileCard = (record: any) => (
    <Card 
      key={record.id} 
      style={{ marginBottom: 12 }}
      size="small"
    >
      <div style={{ marginBottom: 8 }}>
        {/* Header: ID + Category */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#8c8c8c' }}>
            #{record.id.substring(0, 8)}
          </span>
          <Tag color="green" icon={<HomeOutlined />} style={{ margin: 0 }}>
            {record.locativeCategory?.name || 'Locativo'}
          </Tag>
        </div>

        {/* Description */}
        <div style={{ fontSize: 13, marginBottom: 8, lineHeight: 1.4 }}>
          {record.workDoneDescription || 'N/A'}
        </div>

        {/* Cost */}
        <div style={{ fontSize: 16, fontWeight: 600, color: '#E60012', marginBottom: 8 }}>
          {formatCOP(record.cost)}
        </div>

        {/* Date & Closed By */}
        <div style={{ fontSize: 11, color: '#8c8c8c' }}>
          <div style={{ marginBottom: 4 }}>
             {dayjs(record.closedAt).format('DD/MM/YYYY HH:mm')}
          </div>
          <div>
             {record.finishedBy || 'N/A'}
          </div>
        </div>
      </div>
    </Card>
  );

  // Desktop Table Columns
  const columns = [
    {
      title: 'ID OT',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: 11 }}>
          {id.substring(0, 8)}
        </span>
      ),
    },
    {
      title: 'Categoría',
      key: 'locativeCategory',
      width: 150,
      render: (_: any, record: any) => (
        <Tag color="green" icon={<HomeOutlined />}>
          {record.locativeCategory?.name || 'Locativo'}
        </Tag>
      ),
    },
    {
      title: 'Descripción',
      dataIndex: 'workDoneDescription',
      key: 'workDoneDescription',
      width: 300,
      render: (text: string) => text || 'N/A',
    },
    {
      title: 'Valor',
      dataIndex: 'cost',
      key: 'cost',
      width: 120,
      render: (cost: number) => (
        <span style={{ fontWeight: 600, color: '#E60012' }}>
          {formatCOP(cost)}
        </span>
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'closedAt',
      key: 'closedAt',
      width: 150,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Realizado Por',
      dataIndex: 'finishedBy',
      key: 'finishedBy',
      width: 150,
      render: (finishedBy: string) => finishedBy || 'N/A',
    },
  ];

  return (
    <Modal
      title={
        <span style={{ fontSize: isMobile ? 14 : 16 }}>
          Historial - {locationName}
        </span>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={isMobile ? '100%' : 1100}
      style={isMobile ? { top: 0, paddingBottom: 0, maxHeight: '100vh' } : { }}
      bodyStyle={isMobile ? { 
        maxHeight: 'calc(100vh - 55px)', 
        overflowY: 'auto',
        padding: '12px'
      } : {}}
      centered={!isMobile}
    >
      <Spin spinning={loading}>
        {/* Statistics Cards */}
       
        

        {/* List */}
        {isMobile ? (
          expenses.length > 0 ? (
            <div>
              {expenses.map(renderMobileCard)}
              <div style={{ textAlign: 'center', marginTop: 12, color: '#8c8c8c', fontSize: 12 }}>
                Total: {expenses.length} gastos
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }}>
              No hay gastos registrados
            </div>
          )
        ) : (
          <Table
            columns={columns}
            dataSource={expenses}
            rowKey="id"
            pagination={{
              pageSize: 5,
              showTotal: (total) => `Total: ${total} gastos`,
            }}
            locale={{ emptyText: 'No hay gastos registrados' }}
          />
        )}
      </Spin>
    </Modal>
  );
};

export default ViewLocationExpensesModal;
