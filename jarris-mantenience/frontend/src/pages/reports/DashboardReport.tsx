import React, { useEffect, useState } from 'react';
import { Row, Col, Statistic, Card, Table, Tag, Spin } from 'antd';
import {
  DollarOutlined,
  ToolOutlined,
  FileTextOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import { reportsApi } from '../../services/api';
import { workOrderStatusColors } from '../../config/theme';
import type { ColumnsType } from 'antd/es/table';

const DashboardReport: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await reportsApi.getDashboard();
      setData(response.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const woColumns: ColumnsType<any> = [
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={workOrderStatusColors[status as keyof typeof workOrderStatusColors]}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Cantidad',
      dataIndex: 'count',
      key: 'count',
    },
  ];

  const assetColumns: ColumnsType<any> = [
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
    },
    {
      title: 'Cantidad',
      dataIndex: 'count',
      key: 'count',
    },
  ];

  const locationColumns: ColumnsType<any> = [
    {
      title: 'Ubicación',
      dataIndex: 'locationName',
      key: 'locationName',
    },
    {
      title: 'Gastos',
      dataIndex: 'totalCost',
      key: 'totalCost',
      render: (value) => `$${parseInt(value).toLocaleString()}`,
    },
  ];

  return (
    <div>
      {/* Estadísticas principales */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total de Activos"
              value={data.assets.total}
              prefix={<ToolOutlined style={{ color: '#E60012' }} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="OT Cerradas (Mes)"
              value={data.workOrders.closedThisMonth}
              prefix={<FileTextOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Gastos del Mes"
              value={data.workOrders.monthlyExpenses}
              prefix={<DollarOutlined style={{ color: '#faad14' }} />}
              precision={0}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Eventos"
              value={data.events.total}
              prefix={<EnvironmentOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Tablas */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Órdenes de Trabajo por Estado" size="small">
            <Table
              dataSource={data.workOrders.byStatus}
              columns={woColumns}
              pagination={false}
              size="small"
              rowKey="status"
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Activos por Estado" size="small">
            <Table
              dataSource={data.assets.byStatus}
              columns={assetColumns}
              pagination={false}
              size="small"
              rowKey="status"
            />
          </Card>
        </Col>

        <Col xs={24}>
          <Card title="Top 5 Ubicaciones por Gastos" size="small">
            <Table
              dataSource={data.topLocations || []}
              columns={locationColumns}
              pagination={false}
              size="small"
              rowKey="locationName"
            />
          </Card>
        </Col>
      </Row>

      {/* Resumen de costos */}
      <Card
        title="Resumen de Costos"
        style={{ marginTop: 16 }}
        size="small"
      >
        <Row gutter={16}>
          <Col span={12}>
            <Statistic
              title="Gastos Totales (Eventos)"
              value={data.events.totalCost}
              prefix="$"
              precision={0}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title="Promedio por Evento"
              value={data.events.total > 0 ? data.events.totalCost / data.events.total : 0}
              prefix="$"
              precision={0}
            />
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default DashboardReport;
