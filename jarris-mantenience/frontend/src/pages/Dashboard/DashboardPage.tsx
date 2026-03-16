import React, { useState, useEffect } from 'react';
import { Card, Select, DatePicker, Button, Row, Col, Spin, message, Segmented } from 'antd';
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
  ComposedChart,
} from 'recharts';
import { ClearOutlined, BarChartOutlined, DollarOutlined } from '@ant-design/icons';
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
    cantidadOTEquipo: 0,
    valorOTEquipo: 0,
    cantidadOTLocativo: 0,
    valorOTLocativo: 0,
  });
  const [datosGrafico, setDatosGrafico] = useState<any[]>([]);
  const [vistaGrafico, setVistaGrafico] = useState<'cantidades' | 'costos'>('cantidades');

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
            cantidadEquipo: item.cantidadEquipo,
            costoEquipo: item.costoEquipo,
            cantidadLocativo: item.cantidadLocativo,
            costoLocativo: item.costoLocativo,
          }))
        );
      } else {
        setDatosGrafico(
          res.data.porUbicacion.map((item: any) => ({
            nombre: item.ubicacion,
            cantidadEquipo: item.cantidadEquipo,
            costoEquipo: item.costoEquipo,
            cantidadLocativo: item.cantidadLocativo,
            costoLocativo: item.costoLocativo,
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
    <div style={{ height: isMobile ? 'auto' : 'calc(100vh - 112px)', display: 'flex', flexDirection: 'column' }}>
      <Card
        title="Dashboard"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        styles={{
          body: { padding: isMobile ? 12 : '12px 24px', flex: 1, display: 'flex', flexDirection: 'column', overflow: isMobile ? 'auto' : 'hidden' }
        }}
      >
        {/* Filtros */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end', marginBottom: 8 }}>
          <div style={{ minWidth: 150, flex: '1 1 150px', maxWidth: 200 }}>
            <div style={{ marginBottom: 4, fontWeight: 500, fontSize: 12 }}>Fecha Desde:</div>
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
            <div style={{ marginBottom: 4, fontWeight: 500, fontSize: 12 }}>Fecha Hasta:</div>
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
            <div style={{ marginBottom: 4, fontWeight: 500, fontSize: 12 }}>Ubicación:</div>
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

        <Spin spinning={loading} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Métricas */}
          <Row gutter={[8, 8]} style={{ marginBottom: 8 }}>
            <Col xs={12} sm={12} md={6}>
              <Card size="small" styles={{ body: { padding: '6px 8px' } }} style={{ borderLeft: '3px solid #1890ff' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>
                    {metricas.cantidadOTEquipo}
                  </div>
                  <div style={{ color: '#595959', fontSize: 12 }}>OT Equipo Cerradas</div>
                </div>
              </Card>
            </Col>

            <Col xs={12} sm={12} md={6}>
              <Card size="small" styles={{ body: { padding: '6px 8px' } }} style={{ borderLeft: '3px solid #1890ff' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>
                    {formatCOP(metricas.valorOTEquipo)}
                  </div>
                  <div style={{ color: '#595959', fontSize: 12 }}>Valor OT Equipo</div>
                </div>
              </Card>
            </Col>

            <Col xs={12} sm={12} md={6}>
              <Card size="small" styles={{ body: { padding: '6px 8px' } }} style={{ borderLeft: '3px solid #722ed1' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>
                    {metricas.cantidadOTLocativo}
                  </div>
                  <div style={{ color: '#595959', fontSize: 12 }}>OT Locativo Cerradas</div>
                </div>
              </Card>
            </Col>

            <Col xs={12} sm={12} md={6}>
              <Card size="small" styles={{ body: { padding: '6px 8px' } }} style={{ borderLeft: '3px solid #722ed1' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>
                    {formatCOP(metricas.valorOTLocativo)}
                  </div>
                  <div style={{ color: '#595959', fontSize: 12 }}>Valor OT Locativo</div>
                </div>
              </Card>
            </Col>
          </Row>

          {/* Gráfico único con toggle */}
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 14 }}>
                  {vistaGrafico === 'cantidades'
                    ? (ubicacionId ? 'Cantidades por Mes' : 'Cantidades por Ubicación')
                    : (ubicacionId ? 'Costos por Mes' : 'Costos por Ubicación')
                  }
                </span>
                <Segmented
                  size="small"
                  value={vistaGrafico}
                  onChange={(val) => setVistaGrafico(val as 'cantidades' | 'costos')}
                  options={[
                    { label: <span><BarChartOutlined /> Cantidades</span>, value: 'cantidades' },
                    { label: <span><DollarOutlined /> Costos</span>, value: 'costos' },
                  ]}
                />
              </div>
            }
            size="small"
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            styles={{ body: { flex: 1, padding: '8px 12px 0', minHeight: 0 } }}
          >
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
              <ComposedChart data={datosGrafico} barCategoryGap={ubicacionId ? '40%' : '20%'} barGap={4}>
                <defs>
                  <linearGradient id="gradOT" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1890ff" stopOpacity={1} />
                    <stop offset="100%" stopColor="#096dd9" stopOpacity={0.85} />
                  </linearGradient>
                  <linearGradient id="gradEventos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#722ed1" stopOpacity={1} />
                    <stop offset="100%" stopColor="#531dab" stopOpacity={0.85} />
                  </linearGradient>
                  <linearGradient id="gradOTCerradas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#69c0ff" stopOpacity={1} />
                    <stop offset="100%" stopColor="#40a9ff" stopOpacity={0.85} />
                  </linearGradient>
                  <linearGradient id="gradCostoEventos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#b37feb" stopOpacity={1} />
                    <stop offset="100%" stopColor="#9254de" stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="nombre"
                  angle={isMobile ? -45 : -25}
                  textAnchor="end"
                  height={isMobile ? 80 : 50}
                  tick={{ fontSize: isMobile ? 10 : 12, fill: '#595959' }}
                  axisLine={{ stroke: '#d9d9d9' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: isMobile ? 10 : 12, fill: '#8c8c8c' }}
                  axisLine={false}
                  tickLine={false}
                  width={vistaGrafico === 'costos' ? 50 : 30}
                  tickFormatter={vistaGrafico === 'costos' ? (v) => `$${(v / 1000).toFixed(0)}k` : undefined}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.04)', radius: 4 }}
                  content={({ payload }) => {
                    if (!payload?.length) return null;
                    const seen = new Set<string>();
                    const items = payload.filter((entry: any) => {
                      if (seen.has(entry.dataKey)) return false;
                      seen.add(entry.dataKey);
                      return true;
                    });
                    return (
                      <div style={{
                        backgroundColor: '#fff',
                        borderRadius: 10,
                        boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
                        padding: '10px 14px',
                      }}>
                        {items.map((entry: any, i: number) => (
                          <div key={i} style={{ padding: '2px 0', color: entry.color, fontSize: 13 }}>
                            <span style={{ fontWeight: 500 }}>{entry.name}: </span>
                            {vistaGrafico === 'costos' ? formatCOP(entry.value) : entry.value}
                          </div>
                        ))}
                      </div>
                    );
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: isMobile ? 11 : 13, paddingTop: 8 }}
                  iconType="square"
                  iconSize={12}
                />
                {vistaGrafico === 'cantidades' ? (
                  <>
                    <Bar
                      dataKey="cantidadEquipo"
                      fill="url(#gradOT)"
                      name="Equipo"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={50}
                    />
                    <Bar
                      dataKey="cantidadLocativo"
                      fill="url(#gradEventos)"
                      name="Locativo"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={50}
                    />
                    <Line
                      type="monotone"
                      dataKey="cantidadEquipo"
                      stroke="#1890ff"
                      strokeWidth={2}
                      dot={{ fill: '#1890ff', r: 3 }}
                      activeDot={{ r: 5 }}
                      connectNulls
                      legendType="none"
                    />
                    <Line
                      type="monotone"
                      dataKey="cantidadLocativo"
                      stroke="#722ed1"
                      strokeWidth={2}
                      dot={{ fill: '#722ed1', r: 3 }}
                      activeDot={{ r: 5 }}
                      connectNulls
                      legendType="none"
                    />
                  </>
                ) : (
                  <>
                    <Bar
                      dataKey="costoEquipo"
                      fill="url(#gradOTCerradas)"
                      name="Equipo"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={50}
                    />
                    <Bar
                      dataKey="costoLocativo"
                      fill="url(#gradCostoEventos)"
                      name="Locativo"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={50}
                    />
                    <Line
                      type="monotone"
                      dataKey="costoEquipo"
                      stroke="#1890ff"
                      strokeWidth={2}
                      dot={{ fill: '#1890ff', r: 3 }}
                      activeDot={{ r: 5 }}
                      connectNulls
                      legendType="none"
                    />
                    <Line
                      type="monotone"
                      dataKey="costoLocativo"
                      stroke="#722ed1"
                      strokeWidth={2}
                      dot={{ fill: '#722ed1', r: 3 }}
                      activeDot={{ r: 5 }}
                      connectNulls
                      legendType="none"
                    />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </Spin>
      </Card>
    </div>
  );
};

export default DashboardPage;

