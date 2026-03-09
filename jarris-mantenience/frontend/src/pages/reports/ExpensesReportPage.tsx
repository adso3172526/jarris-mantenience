import React, { useState, useEffect } from 'react';
import { Card, Form, Select, DatePicker, Button, Table, Space, Tag, message } from 'antd';
import { DownloadOutlined, SearchOutlined, DollarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { workOrdersApi, assetsApi, locationsApi } from '../../services/api';

const { RangePicker } = DatePicker;

interface ExpenseRecord {
  id: string;
  date: string;
  assetCode: string;
  assetDescription: string;
  locationName: string;
  workDoneDescription: string;
  cost: number;
  finishedBy: string;
  invoiceFileName?: string;
}

const ExpensesReportPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);

  useEffect(() => {
    loadFilters();
  }, []);

  const loadFilters = async () => {
    try {
      const [assetsRes, locationsRes] = await Promise.all([
        assetsApi.getAll(),
        locationsApi.getAll(),
      ]);
      setAssets(assetsRes.data);
      setLocations(locationsRes.data);
    } catch (error) {
      message.error('Error al cargar filtros');
    }
  };

  const handleSearch = async (values: any) => {
    try {
      setLoading(true);
      
      // Obtener todas las OT cerradas o terminadas
      const response = await workOrdersApi.getAll();
      let workOrders = response.data.filter((wo: any) => 
        (wo.status === 'CERRADA' || wo.status === 'TERMINADA') && wo.cost > 0
      );

      // Filtrar por activo
      if (values.assetId) {
        workOrders = workOrders.filter((wo: any) => wo.asset.id === values.assetId);
      }

      // Filtrar por ubicación
      if (values.locationId) {
        workOrders = workOrders.filter((wo: any) => wo.location.id === values.locationId);
      }

      // Filtrar por fecha
      if (values.dateRange) {
        const [start, end] = values.dateRange;
        workOrders = workOrders.filter((wo: any) => {
          const woDate = dayjs(wo.finishedAt);
          return woDate.isAfter(start.startOf('day')) && woDate.isBefore(end.endOf('day'));
        });
      }

      // Mapear a formato de reporte
      const expensesData: ExpenseRecord[] = workOrders.map((wo: any) => ({
        id: wo.id,
        date: dayjs(wo.finishedAt).format('DD/MM/YYYY'),
        assetCode: wo.asset.code,
        assetDescription: wo.asset.description,
        locationName: wo.location.name,
        workDoneDescription: wo.workDoneDescription || 'N/A',
        cost: wo.cost,
        finishedBy: wo.finishedBy || 'N/A',
        invoiceFileName: wo.invoiceFileName,
      }));

      setExpenses(expensesData);
      
      // Calcular total
      const total = expensesData.reduce((sum, exp) => sum + exp.cost, 0);
      setTotalExpenses(total);

      message.success(`Se encontraron ${expensesData.length} registros`);
    } catch (error) {
      message.error('Error al generar reporte');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (expenses.length === 0) {
      message.warning('No hay datos para exportar');
      return;
    }

    // Preparar datos para Excel
    const excelData = expenses.map((exp) => ({
      'Fecha': exp.date,
      'Código Activo': exp.assetCode,
      'Descripción Activo': exp.assetDescription,
      'Ubicación': exp.locationName,
      'Trabajo Realizado': exp.workDoneDescription,
      'Costo': exp.cost,
      'Realizado Por': exp.finishedBy,
      'Factura': exp.invoiceFileName || 'N/A',
    }));

    // Agregar fila de total
    excelData.push({
      'Fecha': '',
      'Código Activo': '',
      'Descripción Activo': '',
      'Ubicación': '',
      'Trabajo Realizado': '',
      'Costo': totalExpenses,
      'Realizado Por': 'TOTAL',
      'Factura': '',
    });

    // Crear libro de Excel
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Gastos');

    // Descargar archivo
    const fileName = `Reporte_Gastos_${dayjs().format('YYYY-MM-DD')}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    message.success('Reporte exportado exitosamente');
  };

  const columns = [
    {
      title: 'Fecha',
      dataIndex: 'date',
      key: 'date',
      width: 110,
    },
    {
      title: 'Activo',
      key: 'asset',
      width: 200,
      render: (_: any, record: ExpenseRecord) => (
        <div>
          <div style={{ fontWeight: 600 }}>{record.assetCode}</div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>{record.assetDescription}</div>
        </div>
      ),
    },
    {
      title: 'Ubicación',
      dataIndex: 'locationName',
      key: 'locationName',
      width: 150,
    },
    {
      title: 'Trabajo Realizado',
      dataIndex: 'workDoneDescription',
      key: 'workDoneDescription',
      width: 250,
      ellipsis: true,
    },
    {
      title: 'Costo',
      dataIndex: 'cost',
      key: 'cost',
      width: 120,
      render: (cost: number) => (
        <span style={{ fontWeight: 600, color: '#E60012' }}>
          ${cost.toLocaleString()}
        </span>
      ),
    },
    {
      title: 'Realizado Por',
      dataIndex: 'finishedBy',
      key: 'finishedBy',
      width: 150,
    },
    {
      title: 'Factura',
      dataIndex: 'invoiceFileName',
      key: 'invoiceFileName',
      width: 100,
      render: (fileName: string) => (
        fileName ? <Tag color="green">Sí</Tag> : <Tag color="default">No</Tag>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <DollarOutlined style={{ fontSize: 20, color: '#E60012' }} />
            <span style={{ fontSize: 18, fontWeight: 600 }}>Historial de Gastos</span>
          </div>
        }
      >
        <Form
          form={form}
          layout="inline"
          onFinish={handleSearch}
          style={{ marginBottom: 24 }}
        >
          <Form.Item name="assetId" style={{ width: 250 }}>
            <Select
              placeholder="Filtrar por Activo"
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {assets.map((asset) => (
                <Select.Option key={asset.id} value={asset.id}>
                  {asset.code} - {asset.description}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="locationId" style={{ width: 200 }}>
            <Select placeholder="Filtrar por Ubicación" allowClear>
              {locations.map((loc) => (
                <Select.Option key={loc.id} value={loc.id}>
                  {loc.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="dateRange">
            <RangePicker
              placeholder={['Fecha Inicio', 'Fecha Fin']}
              format="DD/MM/YYYY"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={loading}>
              Buscar
            </Button>
          </Form.Item>

          <Form.Item>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExportExcel}
              disabled={expenses.length === 0}
            >
              Exportar Excel
            </Button>
          </Form.Item>
        </Form>

        {expenses.length > 0 && (
          <div style={{ marginBottom: 16, padding: 16, background: '#f0f2f5', borderRadius: 8 }}>
            <Space size="large">
              <div>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>Total de Registros</div>
                <div style={{ fontSize: 24, fontWeight: 600 }}>{expenses.length}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>Total Gastado</div>
                <div style={{ fontSize: 24, fontWeight: 600, color: '#E60012' }}>
                  ${totalExpenses.toLocaleString()}
                </div>
              </div>
            </Space>
          </div>
        )}

        <Table
          columns={columns}
          dataSource={expenses}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Total: ${total} registros`,
            showSizeChanger: true,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
};

export default ExpensesReportPage;
