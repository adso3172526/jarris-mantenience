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
  Pagination,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { categoriesApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface Category {
  id: string;
  name: string;
  codePrefix: string;
  nextSequence: number;
  active: boolean;
}

const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
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
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await categoriesApi.getAll();
      setCategories(response.data);
    } catch (error) {
      message.error('Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCategory(null);
    form.resetFields();
    form.setFieldsValue({ active: true });
    setModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    form.setFieldsValue(category);
    setModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingCategory) {
        const res = await categoriesApi.update(editingCategory.id, values);
        const updated = res.data.updatedAssets;
        if (updated > 0) {
          message.success(`Categoría actualizada. Se actualizaron ${updated} activo(s).`);
        } else {
          message.success('Categoría actualizada exitosamente');
        }
      } else {
        await categoriesApi.create(values);
        message.success('Categoría creada exitosamente');
      }
      setModalOpen(false);
      form.resetFields();
      loadCategories();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al guardar categoría');
    }
  };

  const activeCount = categories.filter((c) => c.active).length;
  const inactiveCount = categories.filter((c) => !c.active).length;

  // Mobile Card View
  const renderMobileCard = (record: Category) => (
    <Card key={record.id} style={{ marginBottom: 12 }} size="small">
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <strong style={{ fontSize: 14 }}>{record.name}</strong>
          <Badge status={record.active ? 'success' : 'default'} text={record.active ? 'Activa' : 'Inactiva'} />
        </div>
        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>
          Prefijo: <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{record.codePrefix}</span>
          {' · '}
          Secuencia: <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{String(record.nextSequence).padStart(4, '0')}</span>
        </div>
        <div style={{
          fontSize: 11,
          color: '#595959',
          background: '#f5f5f5',
          padding: '4px 8px',
          borderRadius: 4,
          fontFamily: 'monospace',
        }}>
          Ejemplo: EQ-{record.codePrefix}-{String(record.nextSequence).padStart(4, '0')}
        </div>
      </div>

      {canEdit && (
        <>
          <Divider style={{ margin: '8px 0' }} />
          <Button
            size="small"
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
        </>
      )}
    </Card>
  );

  // Desktop Table Columns
  const columns: ColumnsType<Category> = [
    {
      title: 'Categoria',
      key: 'category',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{record.name}</div>
          <div style={{ fontSize: 12, color: '#8c8c8c', fontFamily: 'monospace' }}>
            EQ-{record.codePrefix}-{String(record.nextSequence).padStart(4, '0')}
          </div>
        </div>
      ),
    },
    {
      title: 'Prefijo',
      dataIndex: 'codePrefix',
      key: 'codePrefix',
      width: 120,
      align: 'center',
      sorter: (a, b) => a.codePrefix.localeCompare(b.codePrefix),
      render: (prefix) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{prefix}</span>
      ),
    },
    {
      title: 'Secuencia',
      dataIndex: 'nextSequence',
      key: 'nextSequence',
      width: 120,
      align: 'center',
      sorter: (a, b) => a.nextSequence - b.nextSequence,
      render: (seq) => (
        <span style={{ fontFamily: 'monospace' }}>
          {String(seq).padStart(4, '0')}
        </span>
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
    ...(canEdit
      ? [
          {
            title: 'Acciones',
            key: 'actions',
            width: 80,
            align: 'center' as const,
            render: (_: any, record: Category) => (
              <Tooltip title="Editar categoría">
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
              Categorías Activos
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
          ) : categories.length > 0 ? (
            <div>
              {categories.slice((mobilePage - 1) * 5, mobilePage * 5).map(renderMobileCard)}
              <Pagination
                current={mobilePage}
                pageSize={5}
                total={categories.length}
                onChange={(page) => setMobilePage(page)}
                size="small"
                simple
                style={{ textAlign: 'center', marginTop: 8 }}
              />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }}>
              No hay categorías
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
                pageSize: 5,
                showTotal: (total) => `Total: ${total} categorías`,
                size: 'small',
                showSizeChanger: false,
              }}
            />
          </div>
        )}
      </Card>

      {/* Modal Crear/Editar */}
      <Modal
        title={editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
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
              placeholder="Ej: Freidoras"
              size={isMobile ? 'large' : 'middle'}
            />
          </Form.Item>

          <Form.Item
            label="Prefijo de Código"
            name="codePrefix"
            rules={[
              { required: true, message: 'Prefijo requerido' },
              { min: 2, max: 10, message: 'Debe tener entre 2 y 10 caracteres' },
              { pattern: /^[A-Z0-9]+$/, message: 'Solo mayúsculas y números' },
            ]}
            extra={isMobile ? '2-10 chars, MAYÚSCULAS (Ej: FR)' : '2-10 caracteres, solo mayúsculas y números (Ej: FR, HORNO, EQ1)'}
          >
            <Input
              placeholder="Ej: FR"
              maxLength={10}
              style={{ textTransform: 'uppercase' }}
              size={isMobile ? 'large' : 'middle'}
              onChange={(e) => {
                const upper = e.target.value.toUpperCase();
                form.setFieldValue('codePrefix', upper);
              }}
            />
          </Form.Item>

          {editingCategory && (
            <Form.Item label="Activo" name="active" valuePropName="checked">
              <Switch />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default CategoriesPage;
