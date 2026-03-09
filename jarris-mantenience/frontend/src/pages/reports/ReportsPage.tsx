import React, { useState } from 'react';
import { Card, DatePicker, Button, message, Tabs } from 'antd';
import { DownloadOutlined, FileExcelOutlined, ToolOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';

const ReportsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [fechaDesde, setFechaDesde] = useState<Dayjs>(dayjs().startOf('month'));
  const [fechaHasta, setFechaHasta] = useState<Dayjs>(dayjs().endOf('month'));

  const handleDownload = async () => {
    try {
      setLoading(true);

      const desde = fechaDesde.format('YYYY-MM-DD');
      const hasta = fechaHasta.format('YYYY-MM-DD');

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/reports/excel/download?fechaDesde=${desde}&fechaHasta=${hasta}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Error al descargar el reporte');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Reporte_OT_${desde}_a_${hasta}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      message.success('Reporte descargado exitosamente');
    } catch (error: any) {
      console.error('Error downloading report:', error);
      message.error('Error al descargar el reporte');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAssets = async () => {
    try {
      setLoadingAssets(true);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/reports/excel/assets-download`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Error al descargar el reporte de activos');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Reporte_Inventario_Activos.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      message.success('Reporte de activos descargado exitosamente');
    } catch (error: any) {
      console.error('Error downloading assets report:', error);
      message.error('Error al descargar el reporte de activos');
    } finally {
      setLoadingAssets(false);
    }
  };

  const tabItems = [
    {
      key: 'ot',
      label: (
        <span>
           Ordenes de Trabajo
        </span>
      ),
      children: (
        <div style={{ padding: '24px 0' }}>
          <p style={{ color: '#666', marginBottom: 24 }}>
            Genera un reporte Excel de todas las ordenes de trabajo y eventos en el rango de fechas seleccionado.
          </p>

          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>Fecha Desde:</div>
            <DatePicker
              value={fechaDesde}
              onChange={(date) => date && setFechaDesde(date)}
              format="DD/MM/YYYY"
              style={{ width: '100%' }}
              size="large"
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>Fecha Hasta:</div>
            <DatePicker
              value={fechaHasta}
              onChange={(date) => date && setFechaHasta(date)}
              format="DD/MM/YYYY"
              style={{ width: '100%' }}
              size="large"
            />
          </div>

          <Button
            type="primary"
            size="large"
            icon={<DownloadOutlined />}
            onClick={handleDownload}
            loading={loading}
            style={{ height: 48, fontSize: 16, width: '100%' }}
          >
            Descargar Reporte OT
          </Button>
        </div>
      ),
    },
    {
      key: 'assets',
      label: (
        <span>
          Inventario de Activos
        </span>
      ),
      children: (
        <div style={{ padding: '24px 0' }}>
          <p style={{ color: '#666', marginBottom: 24 }}>
            Descarga el inventario completo de activos con todos sus estados
            (Activo, Mantenimiento y Baja), incluyendo ubicación, categoría y valor.
          </p>

          <Button
            type="primary"
            size="large"
            icon={<DownloadOutlined />}
            onClick={handleDownloadAssets}
            loading={loadingAssets}
            style={{ height: 48, fontSize: 16, width: '100%' }}
          >
            Descargar Inventario Excel
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title="Generación de Reportes"
        style={{ maxWidth: 600, margin: '0 auto' }}
      >
        <Tabs defaultActiveKey="ot" items={tabItems} />
      </Card>
    </div>
  );
};

export default ReportsPage;
