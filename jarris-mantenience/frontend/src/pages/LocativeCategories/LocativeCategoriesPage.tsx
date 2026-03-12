import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Card,
  Space,
  Modal,
  Form,
  Input,
  Switch,
  message,
  Divider,
  Tooltip,
  Badge,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { locativeCategoriesApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface LocativeCategory {
  id: string;
  name: string;
  active: boolean;
}

const LocativeCategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<LocativeCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<LocativeCategory | null>(null);
  const [form] = Form.useForm();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const { hasRole } = useAuth();
  const canEdit = hasRole(['ADMIN', 'JEFE_MANTENIMIENTO']);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await locativeCategoriesApi.getAll();
      setCategories(response.data);
    } catch (error) {
      message.error('Error al cargar categorías locativas');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCategory(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (category: LocativeCategory) => {
    setEditingCategory(category);
    form.setFieldsValue(category);
    setModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingCategory) {
        await locativeCategoriesApi.update(editingCategory.id, values);
        message.success('Categoría locativa actualizada');
      } else {
        await locativeCategoriesApi.create(values);
        message.success('Categoría locativa creada');
      }
      setModalOpen(false);
      form.resetFields();
      loadCategories();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al guardar categoría locativa');
    }
  };

  const activeCount = categories.filter((c) => c.active).length;
  const inactiveCount = categories.filter((c) => !c.active).length;

  const renderMobileCard = (record: LocativeCategory) => (
    <Card key={record.id} style={{ marginBottom: 12 }} size="small">
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: 14 }}>{record.name}</strong>
          <Badge status={record.active ? 'success' : 'default'} text={record.active ? 'Activa' : 'Inactiva'} />
        </div>
      </div>
      {canEdit && (
        <>
          <Divider style={{ margin: '8px 0' }} />
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            block
          >
            Editar
          </Button>
        </>
      )}
    </Card>
  );

  const columns: ColumnsType<LocativeCategory> = [
    {
      title: 'Nombre',
      dataIndex: 'name',
      key: 'name',
      render: (name) => <span style={{ fontWeight: 600 }}>{name}</span>,
    },
    {
      title: 'Estado',
      dataIndex: 'active',
      key: 'active',
      width: 120,
      align: 'center',
      render: (active) => (
        <Badge status={active ? 'success' : 'default'} text={active ? 'Activa' : 'Inactiva'} />
      ),
    },
    ...(canEdit
      ? [
          {
            title: 'Acciones',
            key: 'actions',
            width: 80,
            align: 'center' as const,
            render: (_: any, record: LocativeCategory) => (
              <Tooltip title="Editar">
                <Button
                  type="text"
                  icon={<EditOutlined style={{ color: '#1890ff' }} />}
                  onClick={() => handleEdit(record)}
                />
              </Tooltip>
            ),
          },
        ]
      : []),
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
              Categorías Locativas
            </span>
            {canEdit && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreate}
                size="middle"
              >
                {isMobile ? 'Nueva' : 'Nueva Categoría'}
              </Button>
            )}
          </div>
        }
        styles={{ body: { padding: isMobile ? 12 : '12px 24px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
          <Space size={12} style={{ fontSize: 13, color: '#595959' }}>
            <Badge status="success" text={`${activeCount} activas`} />
            <Badge status="default" text={`${inactiveCount} inactivas`} />
          </Space>
        </div>

        {isMobile ? (
          loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>Cargando...</div>
          ) : categories.length > 0 ? (
            <div>
              {categories.map(renderMobileCard)}
              <div style={{ textAlign: 'center', marginTop: 16, color: '#8c8c8c' }}>
                Total: {categories.length} categorías
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }}>
              No hay categorías locativas
            </div>
          )
        ) : (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Table
              columns={columns}
              dataSource={categories}
              rowKey="id"
              loading={loading}
              size="small"
              scroll={{ y: 'calc(100vh - 290px)' }}
              pagination={{
                pageSize: 10,
                showTotal: (total) => `Total: ${total} categorías`,
                size: 'small',
                showSizeChanger: false,
              }}
            />
          </div>
        )}
      </Card>

      <Modal
        title={editingCategory ? 'Editar Categoría Locativa' : 'Nueva Categoría Locativa'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText="Guardar"
        cancelText="Cancelar"
        centered
        width={isMobile ? '100%' : 420}
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
              placeholder="Ej: PINTURA"
              maxLength={50}
              size={isMobile ? 'large' : 'middle'}
              style={{ textTransform: 'uppercase' }}
              onChange={(e) => {
                form.setFieldValue('name', e.target.value.toUpperCase());
              }}
            />
          </Form.Item>

          {editingCategory && (
            <Form.Item label="Activa" name="active" valuePropName="checked">
              <Switch />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default LocativeCategoriesPage;
