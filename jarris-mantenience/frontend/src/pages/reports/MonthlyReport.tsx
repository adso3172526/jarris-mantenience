import React, { useState } from 'react';
import { Card, DatePicker, Button, Descriptions, Table, Tag, Spin, Row, Col, Statistic } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import { reportsApi } from '../../services/api';
import { workOrderStatusColors } from '../../config/theme';
import dayjs from 'dayjs';

const MonthlyReport: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs());

  const loadReport = async () => {
    try {
      setLoading(true);
      const year = selectedDate.year();
      const month = selectedDate.month() + 1;
      
      const response = await reportsApi.getMonthly(year, month);
      setReport(response.data);
    } catch (error) {
      console.error('Error loading monthly report:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const expenseColumns: ColumnsType<any> = [
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
      {/* Selector de mes */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <DatePicker
            picker="month"
            value={selectedDate}
            onChange={(date) => date && setSelectedDate(date)}
            format="MMMM YYYY"
            style={{ width: 200 }}
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={loadReport}
          >
            Generar Reporte
          </Button>
        </div>
      </Card>

      {loading ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <Spin size="large" />
          </div>
        </Card>
      ) : !report ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '50px 0', color: '#8c8c8c' }}>
            Selecciona un mes y haz clic en "Generar Reporte"
          </div>
        </Card>
      ) : (
        <>
          {/* Encabezado */}
          <Card
            title={`Reporte Mensual - ${selectedDate.format('MMMM YYYY')}`}
            extra={
              <Button icon={<DownloadOutlined />}>
                Descargar PDF
              </Button>
            }
            style={{ marginBottom: 16 }}
          >
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Período">
                {selectedDate.format('MMMM YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Fecha de generación">
                {new Date().toLocaleDateString('es-CO')}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Estadísticas principales */}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="OT Creadas"
                  value={report.workOrders.created}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="OT Cerradas"
                  value={report.workOrders.closed}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Gastos del Mes"
                  value={report.expenses.total}
                  prefix="$"
                  precision={0}
                  valueStyle={{ color: '#E60012' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Eventos Totales"
                  value={report.events.total}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Desglose de OT */}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} lg={12}>
              <Card title="Órdenes de Trabajo por Estado" size="small">
                <Table
                  dataSource={report.workOrders.byStatus}
                  columns={woColumns}
                  pagination={false}
                  size="small"
                  rowKey="status"
                />
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card title="Gastos por Ubicación" size="small">
                <Table
                  dataSource={report.expenses.byLocation}
                  columns={expenseColumns}
                  pagination={false}
                  size="small"
                  rowKey="locationName"
                />
              </Card>
            </Col>
          </Row>

          {/* Desglose de eventos */}
          <Card title="Eventos del Mes" size="small">
            <Descriptions bordered column={3} size="small">
              <Descriptions.Item label="Mantenimientos">
                {report.events.maintenance}
              </Descriptions.Item>
              <Descriptions.Item label="Reparaciones">
                {report.events.repairs}
              </Descriptions.Item>
              <Descriptions.Item label="Traslados">
                {report.events.transfers}
              </Descriptions.Item>
              <Descriptions.Item label="Costo Mantenimientos" span={1}>
                ${report.events.maintenanceCost.toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Costo Reparaciones" span={1}>
                ${report.events.repairsCost.toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Costo Traslados" span={1}>
                ${report.events.transfersCost.toLocaleString()}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Resumen */}
          <Card
            title="Resumen Ejecutivo"
            size="small"
            style={{ marginTop: 16 }}
          >
            <div style={{ lineHeight: 2 }}>
              <p>
                Durante {selectedDate.format('MMMM YYYY')} se crearon{' '}
                <strong>{report.workOrders.created}</strong> órdenes de trabajo,
                de las cuales <strong>{report.workOrders.closed}</strong> fueron cerradas.
              </p>
              <p>
                Se registraron <strong>{report.events.total}</strong> eventos en total,
                distribuidos en {report.events.maintenance} mantenimientos,{' '}
                {report.events.repairs} reparaciones y {report.events.transfers} traslados.
              </p>
              <p>
                Los gastos totales del mes ascendieron a{' '}
                <strong>${report.expenses.total.toLocaleString()}</strong>,
                con un promedio de{' '}
                <strong>
                  ${(report.expenses.total / (report.events.total || 1)).toFixed(0)}
                </strong>{' '}
                por evento.
              </p>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default MonthlyReport;
