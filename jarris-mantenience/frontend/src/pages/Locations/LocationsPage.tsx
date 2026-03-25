import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Card,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  message,
  Divider,
  Tooltip,
  Badge,
  Pagination,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { locationsApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface Location {
  id: string;
  name: string;
  type: string;
  active: boolean;
  createdAt: string;
}

const locationTypeLabels: Record<string, string> = {
  PDV: 'Punto de Venta',
  DEPARTAMENTO: 'Departamento',
  PLANTA: 'Planta de Producción',
};

const LocationsPage: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [form] = Form.useForm();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [mobilePage, setMobilePage] = useState(1);

  const { hasRole } = useAuth();
  const canEdit = hasRole(['ADMIN', 'JEFE_MANTENIMIENTO']);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      setLoading(true);
      const response = await locationsApi.getAll();
      setLocations(response.data);
    } catch (error) {
      message.error('Error al cargar ubicaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingLocation(null);
    form.resetFields();
    form.setFieldsValue({ active: true });
    setModalOpen(true);
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    form.setFieldsValue(location);
    setModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingLocation) {
        await locationsApi.update(editingLocation.id, values);
        message.success('Ubicación actualizada exitosamente');
      } else {
        await locationsApi.create(values);
        message.success('Ubicación creada exitosamente');
      }
      setModalOpen(false);
      form.resetFields();
      loadLocations();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al guardar ubicación');
    }
  };

  const activeCount = locations.filter((l) => l.active).length;
  const inactiveCount = locations.filter((l) => !l.active).length;

  // Mobile Card View
  const renderMobileCard = (record: Location) => (
    <Card key={record.id} style={{ marginBottom: 12 }} size="small">
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <strong style={{ fontSize: 14 }}>{record.name}</strong>
          <Badge status={record.active ? 'success' : 'default'} text={record.active ? 'Activa' : 'Inactiva'} />
        </div>
        <div style={{ fontSize: 12, color: '#8c8c8c' }}>
          {locationTypeLabels[record.type] || record.type}
        </div>
      </div>

      <Divider style={{ margin: '8px 0' }} />

      {canEdit && (
        <Button
          size="small"
          type="link"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        />
      )}
    </Card>
  );

  // Desktop Table Columns
  const columns: ColumnsType<Location> = [
    {
      title: 'Ubicación',
      key: 'location',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{record.name}</div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
            {locationTypeLabels[record.type] || record.type}
          </div>
        </div>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'active',
      key: 'active',
      width: 100,
      align: 'center',
      sorter: (a, b) => Number(a.active) - Number(b.active),
      render: (active) => (
        <Badge status={active ? 'success' : 'default'} text={active ? 'Activa' : 'Inactiva'} />
      ),
    },
    {
      title: 'Creación',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      align: 'center',
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      render: (date) => new Date(date).toLocaleDateString('es-CO'),
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, record) => (
        canEdit ? (
          <Tooltip title="Editar ubicación">
            <Button
              type="text"
              icon={<EditOutlined style={{ color: '#1890ff' }} />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
        ) : null
      ),
    },
  ];

  return (
    <div style={{ height: isMobile ? 'auto' : 'calc(100vh - 112px)', display: 'flex', flexDirection: 'column' }}>
      <Card
        title={
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
          }}>
            <span style={{ fontSize: 16, fontWeight: 600 }}>
              Ubicaciones
            </span>
            {canEdit && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreate}
                size="middle"
              >
                {isMobile ? 'Nueva' : 'Nueva Ubicación'}
              </Button>
            )}
          </div>
        }
        styles={{ body: { padding: isMobile ? 12 : '12px 24px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        {/* Resumen */}
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
          <Space size={12} style={{ fontSize: 13, color: '#595959' }}>
            <Badge status="success" text={`${activeCount} activas`} />
            <Badge status="default" text={`${inactiveCount} inactivas`} />
          </Space>
        </div>

        {/* Lista */}
        {isMobile ? (
          loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>Cargando...</div>
          ) : locations.length > 0 ? (
            <div>
              {locations.slice((mobilePage - 1) * 5, mobilePage * 5).map(renderMobileCard)}
              <Pagination
                current={mobilePage}
                pageSize={5}
                total={locations.length}
                onChange={(page) => setMobilePage(page)}
                size="small"
                simple
                style={{ textAlign: 'center', marginTop: 8 }}
              />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }}>
              No hay ubicaciones
            </div>
          )
        ) : (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Table
              columns={columns}
              dataSource={locations}
              rowKey="id"
              loading={loading}
              size="small"
              scroll={{ y: 'calc(100vh - 290px)' }}
              pagination={{
                pageSize: 5,
                showTotal: (total) => `Total: ${total} ubicaciones`,
                size: 'small',
                showSizeChanger: false,
              }}
            />
          </div>
        )}
      </Card>

      {/* Modal Crear/Editar */}
      <Modal
        title={editingLocation ? 'Editar Ubicación' : 'Nueva Ubicación'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText="Guardar"
        cancelText="Cancelar"
        centered
        width={isMobile ? '100%' : 520}
        styles={{
          body: {
            maxHeight: isMobile ? 'calc(100vh - 110px)' : 'calc(100vh - 200px)',
            overflowY: 'auto',
          },
        }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark={!isMobile}
        >
          <Form.Item
            label="Nombre"
            name="name"
            rules={[{ required: true, message: 'Nombre requerido' }]}
          >
            <Input
              placeholder="Ej: PDV Centro, Planta Principal..."
              size={isMobile ? 'large' : 'middle'}
            />
          </Form.Item>

          <Form.Item
            label="Tipo"
            name="type"
            rules={[{ required: true, message: 'Tipo requerido' }]}
          >
            <Select
              placeholder="Selecciona el tipo de ubicación"
              size={isMobile ? 'large' : 'middle'}
              options={[
                { label: 'Punto de Venta (PDV)', value: 'PDV' },
                { label: 'Departamento Administrativo', value: 'DEPARTAMENTO' },
                { label: 'Planta de Producción', value: 'PLANTA' },
              ]}
            />
          </Form.Item>

          {editingLocation && (
            <Form.Item label="Activo" name="active" valuePropName="checked">
              <Switch />
            </Form.Item>
          )}
        </Form>
      </Modal>

    </div>
  );
};

export default LocationsPage;
