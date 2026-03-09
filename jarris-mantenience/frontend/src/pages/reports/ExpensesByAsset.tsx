import React, { useEffect, useState } from 'react';
import { Table, Select, Card, Tag, Spin, message, DatePicker } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { reportsApi, assetsApi } from '../../services/api';

const { RangePicker } = DatePicker;

const ExpensesByAsset: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string | undefined>();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  useEffect(() => {
    loadAssets();
  }, []);

  useEffect(() => {
    if (selectedAsset) {
      loadExpenses();
      loadEvents();
    }
  }, [selectedAsset, dateRange]);

  const loadAssets = async () => {
    try {
      const response = await assetsApi.getAll();
      setAssets(response.data);
    } catch (error) {
      message.error('Error al cargar activos');
    }
  };

  const loadExpenses = async () => {
    if (!selectedAsset) return;

    try {
      setLoading(true);
      const params: any = {};
      
      if (dateRange) {
        params.startDate = dateRange[0];
        params.endDate = dateRange[1];
      }

      const response = await reportsApi.getExpensesByAsset(selectedAsset, params);
      setExpenses(response.data);
    } catch (error) {
      message.error('Error al cargar gastos');
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    if (!selectedAsset) return;

    try {
      const response = await reportsApi.getEventsByAsset(selectedAsset);
      setEvents(response.data);
    } catch (error) {
      message.error('Error al cargar eventos');
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

  const expenseColumns: ColumnsType<any> = [
    {
      title: 'Tipo de Evento',
      dataIndex: 'eventType',
      key: 'eventType',
      render: (type) => {
        const colors: Record<string, string> = {
          MANTENIMIENTO: 'blue',
          REPARACION: 'orange',
          TRASLADO: 'green',
        };
        return <Tag color={colors[type]}>{type}</Tag>;
      },
    },
    {
      title: 'Cantidad',
      dataIndex: 'count',
      key: 'count',
    },
    {
      title: 'Costo Total',
      dataIndex: 'totalCost',
      key: 'totalCost',
      render: (value) => `$${parseInt(value).toLocaleString()}`,
    },
  ];

  const eventColumns: ColumnsType<any> = [
    {
      title: 'Fecha',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString('es-CO'),
    },
    {
      title: 'Tipo',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const colors: Record<string, string> = {
          MANTENIMIENTO: 'blue',
          REPARACION: 'orange',
          TRASLADO: 'green',
        };
        return <Tag color={colors[type]}>{type}</Tag>;
      },
    },
    {
      title: 'Descripción',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Costo',
      dataIndex: 'cost',
      key: 'cost',
      render: (value) => `$${value.toLocaleString()}`,
    },
    {
      title: 'Estado',
      dataIndex: 'active',
      key: 'active',
      render: (active) => (
        <Tag color={active ? 'success' : 'default'}>
          {active ? 'Activo' : 'Anulado'}
        </Tag>
      ),
    },
  ];

  const totalCost = expenses.reduce((sum, item) => sum + parseInt(item.totalCost), 0);

  return (
    <div>
      {/* Filtros */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Select
          placeholder="Selecciona un activo"
          style={{ width: '100%', maxWidth: 400 }}
          showSearch
          optionFilterProp="children"
          onChange={setSelectedAsset}
        >
          {assets.map((asset) => (
            <Select.Option key={asset.id} value={asset.id}>
              {asset.code} - {asset.description}
            </Select.Option>
          ))}
        </Select>

        {selectedAsset && (
          <div style={{ marginTop: 12 }}>
            <RangePicker
              placeholder={['Fecha inicio', 'Fecha fin']}
              onChange={handleDateChange}
              format="YYYY-MM-DD"
            />
          </div>
        )}
      </Card>

      {!selectedAsset ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '50px 0', color: '#8c8c8c' }}>
            Selecciona un activo para ver sus gastos
          </div>
        </Card>
      ) : loading ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Spin />
          </div>
        </Card>
      ) : (
        <>
          {/* Resumen de gastos por tipo */}
          <Card
            title="Gastos por Tipo de Evento"
            size="small"
            style={{ marginBottom: 16 }}
            extra={`Total: $${totalCost.toLocaleString()}`}
          >
            <Table
              columns={expenseColumns}
              dataSource={expenses}
              rowKey="eventType"
              pagination={false}
              size="small"
            />
          </Card>

          {/* Historial completo */}
          <Card title="Historial Completo de Eventos" size="small">
            <Table
              columns={eventColumns}
              dataSource={events}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showTotal: (total) => `Total: ${total} eventos`,
              }}
              size="small"
            />
          </Card>
        </>
      )}
    </div>
  );
};

export default ExpensesByAsset;
