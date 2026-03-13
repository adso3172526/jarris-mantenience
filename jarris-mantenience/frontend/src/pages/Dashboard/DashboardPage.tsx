import React, { useState, useEffect } from 'react';
import { Card, Select, DatePicker, Button, Row, Col, Spin, message } from 'antd';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import {
  FileTextOutlined,
  DollarOutlined,
  ToolOutlined,
  ThunderboltOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { reportsApi, locationsApi } from '../../services/api';

const { Option } = Select;

const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  // Filtros
  const [fechaDesde, setFechaDesde] = useState<Dayjs>(dayjs().startOf('month'));
  const [fechaHasta, setFechaHasta] = useState<Dayjs>(dayjs().endOf('month'));
  const [ubicacionId, setUbicacionId] = useState<string | undefined>(undefined);

  // Datos
  const [metricas, setMetricas] = useState<any>({
    totalOT: 0,
    totalEventos: 0,
    totalGastado: 0,
    totalGastadoEventos: 0,
    totalActivos: 0,
    eventosEspeciales: 0,
  });
  const [datosGrafico, setDatosGrafico] = useState<any[]>([]);

  useEffect(() => {
    loadLocations();
    loadDashboard();
    
    // Detectar cambios de tamaño
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadLocations = async () => {
    try {
      const res = await locationsApi.getAll();
      setLocations(res.data);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const loadDashboard = async (overrides?: { desde?: Dayjs; hasta?: Dayjs; ubicacion?: string }) => {
    try {
      setLoading(true);

      const desde = overrides?.desde || fechaDesde;
      const hasta = overrides?.hasta || fechaHasta;
      const ubic = overrides ? overrides.ubicacion : ubicacionId;

      const params: any = {
        fechaDesde: desde.format('YYYY-MM-DD'),
        fechaHasta: hasta.format('YYYY-MM-DD'),
      };

      if (ubic) {
        params.ubicacionId = ubic;
      }

      const res = await reportsApi.getDashboard(params);

      setMetricas(res.data.metricas);

      // Decidir qué datos mostrar en el gráfico
      if (ubic) {
        setDatosGrafico(
          res.data.porMes.map((item: any) => ({
            nombre: dayjs(item.mes).format('MMM YYYY'),
            cantidadOT: item.cantidadOT,
            costoOTCerradas: item.costoOTCerradas,
            cantidadEventos: item.cantidadEventos,
            costoEventos: item.costoEventos,
          }))
        );
      } else {
        setDatosGrafico(
          res.data.porUbicacion.map((item: any) => ({
            nombre: item.ubicacion,
            cantidadOT: item.cantidadOT,
            costoOTCerradas: item.costoOTCerradas,
            cantidadEventos: item.cantidadEventos,
            costoEventos: item.costoEventos,
          }))
        );
      }
    } catch (error: any) {
      message.error('Error al cargar dashboard');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatCOP = (value: number) => {
    return `$${Math.round(value).toLocaleString('es-CO')}`;
  };

  return (
    <div style={{ padding: '0' }}>
      <Card 
        title="Dashboard de Mantenimiento"
        styles={{
          body: { padding: isMobile ? 12 : 24 }
        }}
      >
        {/* Filtros */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', marginBottom: 16 }}>
          <div style={{ minWidth: 150, flex: '1 1 150px', maxWidth: 200 }}>
            <div style={{ marginBottom: 6, fontWeight: 500, fontSize: 13 }}>Fecha Desde:</div>
            <DatePicker
              value={fechaDesde}
              onChange={(date) => date && setFechaDesde(date)}
              format="DD/MM/YYYY"
              style={{ width: '100%' }}
              placeholder="Seleccionar fecha"
              size={isMobile ? 'large' : 'middle'}
            />
          </div>

          <div style={{ minWidth: 150, flex: '1 1 150px', maxWidth: 200 }}>
            <div style={{ marginBottom: 6, fontWeight: 500, fontSize: 13 }}>Fecha Hasta:</div>
            <DatePicker
              value={fechaHasta}
              onChange={(date) => date && setFechaHasta(date)}
              format="DD/MM/YYYY"
              style={{ width: '100%' }}
              placeholder="Seleccionar fecha"
              size={isMobile ? 'large' : 'middle'}
            />
          </div>

          <div style={{ minWidth: 180, flex: '1 1 180px', maxWidth: 240 }}>
            <div style={{ marginBottom: 6, fontWeight: 500, fontSize: 13 }}>Ubicación:</div>
            <Select
              value={ubicacionId}
              onChange={setUbicacionId}
              style={{ width: '100%' }}
              allowClear
              placeholder="Todas"
              size={isMobile ? 'large' : 'middle'}
            >
              {locations.map((loc) => (
                <Option key={loc.id} value={loc.id}>
                  {loc.name}
                </Option>
              ))}
            </Select>
          </div>

          <div>
            <Button
              icon={<ClearOutlined />}
              onClick={() => {
                const desde = dayjs().startOf('month');
                const hasta = dayjs().endOf('month');
                setFechaDesde(desde);
                setFechaHasta(hasta);
                setUbicacionId(undefined);
                loadDashboard({ desde, hasta, ubicacion: undefined });
              }}
              size={isMobile ? 'large' : 'middle'}
            >
              Limpiar
            </Button>
          </div>
          <div>
            <Button
              type="primary"
              onClick={() => loadDashboard()}
              size={isMobile ? 'large' : 'middle'}
            >
              Aplicar
            </Button>
          </div>
        </div>

        <Spin spinning={loading}>
          {/* Métricas */}
          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            <Col xs={12} sm={8} md={4}>
              <Card size="small">
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <div style={{ fontSize: 24, fontWeight: 600 }}>
                    {metricas.totalOT}
                  </div>
                  <div style={{ color: '#595959', fontSize: 14, marginTop: 4 }}>OT</div>
                </div>
              </Card>
            </Col>

            <Col xs={12} sm={8} md={6}>
              <Card size="small">
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <div style={{ fontSize: 24, fontWeight: 600 }}>
                    {formatCOP(metricas.totalGastado)}
                  </div>
                  <div style={{ color: '#595959', fontSize: 14, marginTop: 4 }}>OT Cerradas</div>
                </div>
              </Card>
            </Col>

            <Col xs={12} sm={8} md={4}>
              <Card size="small">
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <div style={{ fontSize: 24, fontWeight: 600 }}>
                    {metricas.totalEventos}
                  </div>
                  <div style={{ color: '#595959', fontSize: 14, marginTop: 4 }}>Eventos</div>
                </div>
              </Card>
            </Col>

            <Col xs={12} sm={8} md={6}>
              <Card size="small">
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <div style={{ fontSize: 24, fontWeight: 600 }}>
                    {formatCOP(metricas.totalGastadoEventos)}
                  </div>
                  <div style={{ color: '#595959', fontSize: 14, marginTop: 4 }}>Eventos</div>
                </div>
              </Card>
            </Col>

            <Col xs={12} sm={8} md={4}>
              <Card size="small">
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <div style={{ fontSize: 24, fontWeight: 600 }}>
                    {metricas.totalActivos}
                  </div>
                  <div style={{ color: '#595959', fontSize: 14, marginTop: 4 }}>Activos</div>
                </div>
              </Card>
            </Col>
          </Row>

          {/* Gráfico */}
          <Card
            title={
              <span style={{ fontSize: isMobile ? 14 : 16 }}>
                {ubicacionId ? 'Actividad por Mes' : 'Actividad por Ubicación'}
              </span>
            }
            size="small"
          >
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 320}>
              <BarChart data={datosGrafico} barCategoryGap={ubicacionId ? '40%' : '20%'} barGap={2}>
                <defs>
                  <linearGradient id="gradOT" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8d9bab" stopOpacity={1} />
                    <stop offset="100%" stopColor="#7a8a9e" stopOpacity={0.85} />
                  </linearGradient>
                  <linearGradient id="gradOTCerradas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a5b1be" stopOpacity={1} />
                    <stop offset="100%" stopColor="#95a3b2" stopOpacity={0.85} />
                  </linearGradient>
                  <linearGradient id="gradEventos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#bcc6d0" stopOpacity={1} />
                    <stop offset="100%" stopColor="#adb9c5" stopOpacity={0.85} />
                  </linearGradient>
                  <linearGradient id="gradCostoEventos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d3dae1" stopOpacity={1} />
                    <stop offset="100%" stopColor="#c5ced7" stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="nombre"
                  angle={isMobile ? -45 : 0}
                  textAnchor={isMobile ? 'end' : 'middle'}
                  height={isMobile ? 80 : 30}
                  tick={{ fontSize: isMobile ? 10 : 12, fill: '#595959' }}
                  axisLine={{ stroke: '#d9d9d9' }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  tick={{ fontSize: isMobile ? 10 : 12, fill: '#8c8c8c' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: isMobile ? 10 : 12, fill: '#8c8c8c' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.04)', radius: 4 }}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
                    padding: '12px 16px',
                  }}
                  formatter={(value: any, name: string) => {
                    if (name === 'OT Cerradas' || name === 'Costo Eventos') return [formatCOP(value), name];
                    return [value, name];
                  }}
                  labelFormatter={() => ''}
                  labelStyle={{ display: 'none' }}
                  itemStyle={{ padding: '2px 0' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: isMobile ? 11 : 14, paddingTop: 12 }}
                  iconType="square"
                  iconSize={12}
                />
                <Bar
                  yAxisId="left"
                  dataKey="cantidadOT"
                  fill="url(#gradOT)"
                  name="OT"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  yAxisId="right"
                  dataKey="costoOTCerradas"
                  fill="url(#gradOTCerradas)"
                  name="OT Cerradas"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  yAxisId="left"
                  dataKey="cantidadEventos"
                  fill="url(#gradEventos)"
                  name="Eventos"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  yAxisId="right"
                  dataKey="costoEventos"
                  fill="url(#gradCostoEventos)"
                  name="Costo Eventos"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Spin>
      </Card>
    </div>
  );
};

export default DashboardPage;

