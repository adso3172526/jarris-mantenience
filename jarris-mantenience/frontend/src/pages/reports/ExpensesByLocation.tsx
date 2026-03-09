import React, { useEffect, useState } from 'react';
import { Table, Select, DatePicker, Space, Card, Statistic, Row, Col, Spin, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { reportsApi, locationsApi } from '../../services/api';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const ExpensesByLocation: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [selectedLocation, dateRange]);

  const loadLocations = async () => {
    try {
      const response = await locationsApi.getAll();
      setLocations(response.data);
    } catch (error) {
      message.error('Error al cargar ubicaciones');
    }
  };

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const params: any = {};
      
      if (selectedLocation) {
        params.locationId = selectedLocation;
      }
      
      if (dateRange) {
        params.startDate = dateRange[0];
        params.endDate = dateRange[1];
      }

      const response = await reportsApi.getExpensesByLocation(params);
      setExpenses(response.data);
    } catch (error) {
      message.error('Error al cargar gastos');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (dates: any) => {
    if (dates && dates.length === 2) {
      setDateRange([
        dates[0].format('YYYY-MM-DD'),
        dates[1].format('YYYY-MM-DD'),
      ]);
    } else {
      setDateRange(null);
    }
  };

  const columns: ColumnsType<any> = [
    {
      title: 'Ubicación',
      dataIndex: 'locationName',
      key: 'locationName',
      fixed: 'left',
      width: 200,
    },
    {
      title: 'Total Eventos',
      dataIndex: 'eventCount',
      key: 'eventCount',
      width: 130,
      sorter: (a, b) => parseInt(a.eventCount) - parseInt(b.eventCount),
    },
    {
      title: 'Mantenimientos',
      dataIndex: 'maintenanceCount',
      key: 'maintenanceCount',
      width: 140,
    },
    {
      title: 'Reparaciones',
      dataIndex: 'repairCount',
      key: 'repairCount',
      width: 130,
    },
    {
      title: 'Traslados',
      dataIndex: 'transferCount',
      key: 'transferCount',
      width: 110,
    },
    {
      title: 'Costo Total',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 150,
      render: (value) => `$${parseInt(value).toLocaleString()}`,
      sorter: (a, b) => parseInt(a.totalCost) - parseInt(b.totalCost),
    },
  ];

  const totalExpenses = expenses.reduce((sum, item) => sum + parseInt(item.totalCost), 0);
  const totalEvents = expenses.reduce((sum, item) => sum + parseInt(item.eventCount), 0);

  return (
    <div>
      {/* Filtros */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            placeholder="Filtrar por ubicación"
            style={{ width: 200 }}
            allowClear
            onChange={setSelectedLocation}
          >
            {locations.map((loc) => (
              <Select.Option key={loc.id} value={loc.id}>
                {loc.name}
              </Select.Option>
            ))}
          </Select>

          <RangePicker
            placeholder={['Fecha inicio', 'Fecha fin']}
            onChange={handleDateChange}
            format="YYYY-MM-DD"
          />
        </Space>
      </Card>

      {/* Resumen */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="Gastos Totales"
              value={totalExpenses}
              prefix="$"
              precision={0}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="Total de Eventos"
              value={totalEvents}
            />
          </Card>
        </Col>
      </Row>

      {/* Tabla */}
      <Card size="small">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Spin />
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={expenses}
            rowKey="locationName"
            pagination={{
              pageSize: 10,
              showTotal: (total) => `Total: ${total} ubicaciones`,
            }}
            scroll={{ x: 900 }}
          />
        )}
      </Card>
    </div>
  );
};

export default ExpensesByLocation;
