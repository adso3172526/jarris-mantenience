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
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  EditOutlined,
  UserOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  ToolOutlined,
  TeamOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { usersApi, locationsApi } from '../../services/api';

interface User {
  id: string;
  userId: string;
  name?: string;
  email: string;
  roles: string[];
  phone?: string;
  locationId?: string;
  location?: {
    name: string;
  };
  active: boolean;
}

const roleColors: Record<string, string> = {
  ADMIN: 'red',
  JEFE_MANTENIMIENTO: 'blue',
  TECNICO_INTERNO: 'green',
  CONTRATISTA: 'orange',
  PDV: 'purple',
};

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  JEFE_MANTENIMIENTO: 'Jefe Mantenimiento',
  TECNICO_INTERNO: 'Técnico Interno',
  CONTRATISTA: 'Contratista',
  PDV: 'Punto de Venta',
};

const roleIcons: Record<string, React.ReactNode> = {
  ADMIN: <SafetyCertificateOutlined style={{ color: '#E60012' }} />,
  JEFE_MANTENIMIENTO: <SettingOutlined style={{ color: '#1890ff' }} />,
  TECNICO_INTERNO: <ToolOutlined style={{ color: '#52c41a' }} />,
  CONTRATISTA: <TeamOutlined style={{ color: '#fa8c16' }} />,
  PDV: <ShopOutlined style={{ color: '#722ed1' }} />,
};

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const [resetPasswordForm] = Form.useForm();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, locationsRes] = await Promise.all([
        usersApi.getAll(),
        locationsApi.getAll(),
      ]);
      setUsers(usersRes.data);
      setLocations(locationsRes.data);
    } catch (error) {
      message.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({ active: true });
    setModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      name: user.name,
      email: user.email,
      phone: user.phone,
      roles: user.roles,
      locationId: user.locationId,
      active: user.active,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingUser) {
        const updateData = { ...values };
        if (!updateData.password) {
          delete updateData.password;
        }
        await usersApi.update(editingUser.id, updateData);
        message.success('Usuario actualizado exitosamente');
      } else {
        await usersApi.create(values);
        message.success('Usuario creado exitosamente');
      }
      setModalOpen(false);
      form.resetFields();
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al guardar usuario');
    }
  };

  const handleResetPassword = (user: User) => {
    setSelectedUser(user);
    resetPasswordForm.resetFields();
    setResetPasswordModalOpen(true);
  };

  const handleResetPasswordSubmit = async (values: any) => {
    if (!selectedUser) return;

    try {
      await usersApi.resetPassword(selectedUser.id, values.newPassword);
      message.success(`Contraseña restablecida para ${selectedUser.email}`);
      setResetPasswordModalOpen(false);
      resetPasswordForm.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al restablecer contraseña');
    }
  };


  const activeCount = users.filter((u) => u.active).length;
  const inactiveCount = users.filter((u) => !u.active).length;

  // Mobile Card View
  const renderMobileCard = (record: User) => (
    <Card
      key={record.id}
      style={{ marginBottom: 12 }}
      size="small"
    >
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <strong style={{ fontSize: 14 }}>{record.name || record.email.split('@')[0]}</strong>
          <Badge status={record.active ? 'success' : 'default'} text={record.active ? 'Activo' : 'Inactivo'} />
        </div>
        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>{record.email}</div>
        {record.phone && (
          <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>
            <PhoneOutlined /> {record.phone}
          </div>
        )}
        <Space wrap size={4} style={{ marginBottom: 4 }}>
          {record.roles.map((role) => (
            <Tag key={role} style={{ fontSize: 11, margin: 0 }}>
              {roleLabels[role] || role}
            </Tag>
          ))}
        </Space>
        {record.location && (
          <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
            <EnvironmentOutlined /> {record.location.name}
          </div>
        )}
      </div>

      <Divider style={{ margin: '8px 0' }} />

      <Space style={{ width: '100%' }} size="small">
        <Button
          size="small"
          type="link"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        />
        <Button
          icon={<LockOutlined />}
          onClick={() => handleResetPassword(record)}
          style={{ flex: 1, borderColor: '#faad14', color: '#faad14' }}
        >
          Reset Pass
        </Button>
      </Space>
    </Card>
  );

  // Desktop Table Columns
  const columns: ColumnsType<User> = [
    {
      title: 'Usuario',
      key: 'user',
      width: 280,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{record.name || record.email.split('@')[0]}</div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
            {record.email}
            {record.phone ? ` · ${record.phone}` : ''}
            {record.location ? ` · ${record.location.name}` : ''}
          </div>
        </div>
      ),
    },
    {
      title: 'Roles',
      dataIndex: 'roles',
      key: 'roles',
      width: 280,
      render: (roles: string[]) => (
        <Space wrap size={4}>
          {roles.map((role) => (
            <Tag key={role} style={{ margin: 0 }}>
              {roleLabels[role] || role}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'active',
      key: 'active',
      width: 100,
      align: 'center',
      render: (active) => (
        <Badge status={active ? 'success' : 'default'} text={active ? 'Activo' : 'Inactivo'} />
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Editar usuario">
            <Button
              type="text"
              icon={<EditOutlined style={{ color: '#1890ff' }} />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Restablecer contraseña">
            <Button
              type="text"
              icon={<LockOutlined />}
              onClick={() => handleResetPassword(record)}
              style={{ color: '#faad14' }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Detectar si tiene rol PDV seleccionado
  const selectedRoles = Form.useWatch('roles', form);
  const hasPDVRole = selectedRoles?.includes('PDV');

  return (
    <div style={{ height: isMobile ? 'auto' : 'calc(100vh - 112px)', display: 'flex', flexDirection: 'column' }}>
      <Card
        title={
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8
          }}>
            <span style={{ fontSize: isMobile ? 16 : 16, fontWeight: 600 }}>
              Gestión de Usuarios
            </span>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
              size="middle"
            >
              {isMobile ? "Nuevo" : "Nuevo Usuario"}
            </Button>
          </div>
        }
        styles={{ body: { padding: isMobile ? 12 : '12px 24px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        {/* Resumen */}
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
          <Space size={12} style={{ fontSize: 13, color: '#595959' }}>
            <Badge status="success" text={`${activeCount} activos`} />
            <Badge status="default" text={`${inactiveCount} inactivos`} />
          </Space>
        </div>

        {/* Lista */}
        {isMobile ? (
          loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>Cargando...</div>
          ) : users.length > 0 ? (
            <div>
              {users.map(renderMobileCard)}
              <div style={{ textAlign: 'center', marginTop: 16, color: '#8c8c8c' }}>
                Total: {users.length} usuarios
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }}>
              No hay usuarios
            </div>
          )
        ) : (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Table
              columns={columns}
              dataSource={users}
              rowKey="id"
              loading={loading}
              size="small"
              scroll={{ y: 'calc(100vh - 290px)' }}
              pagination={{
                pageSize: 10,
                showTotal: (total) => `Total: ${total} usuarios`,
                size: 'small',
                showSizeChanger: false,
              }}
            />
          </div>
        )}
      </Card>

      {/* Modal Crear/Editar */}
      <Modal
        title={editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText="Guardar"
        cancelText="Cancelar"
        centered
        width={isMobile ? '100%' : 600}
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
              placeholder="Nombre completo"
              size={isMobile ? "large" : "middle"}
            />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Email requerido' },
              { type: 'email', message: 'Email inválido' },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="usuario@jarris.com.co"
              disabled={!!editingUser}
              size={isMobile ? "large" : "middle"}
            />
          </Form.Item>

          <Form.Item
            label="Celular"
            name="phone"
          >
            <Input
              prefix={<PhoneOutlined />}
              placeholder="Número de celular"
              size={isMobile ? "large" : "middle"}
            />
          </Form.Item>

          <Form.Item
            label={editingUser ? 'Contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
            name="password"
            rules={[
              { required: !editingUser, message: 'Contraseña requerida' },
              { min: 6, message: 'Mínimo 6 caracteres' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={editingUser ? 'Dejar vacío para no cambiar' : 'Mínimo 6 caracteres'}
              size={isMobile ? "large" : "middle"}
            />
          </Form.Item>

          <Form.Item
            label="Roles"
            name="roles"
            rules={[{ required: true, message: 'Selecciona al menos un rol' }]}
          >
            <Select
              mode="multiple"
              placeholder="Selecciona uno o más roles"
              size={isMobile ? "large" : "middle"}
            >
              <Select.Option value="ADMIN">Administrador</Select.Option>
              <Select.Option value="JEFE_MANTENIMIENTO">Jefe de Mantenimiento</Select.Option>
              <Select.Option value="TECNICO_INTERNO">Técnico Interno</Select.Option>
              <Select.Option value="CONTRATISTA">Contratista</Select.Option>
              <Select.Option value="PDV">Punto de Venta</Select.Option>
            </Select>
          </Form.Item>

          {hasPDVRole && (
            <Form.Item
              label="Ubicación (PDV)"
              name="locationId"
              rules={[
                {
                  required: hasPDVRole,
                  message: 'Ubicación requerida para usuarios PDV',
                },
              ]}
            >
              <Select
                placeholder="Selecciona la ubicación del PDV"
                size={isMobile ? "large" : "middle"}
              >
                {locations
                  .filter((loc) => loc.type === 'PDV')
                  .map((loc) => (
                    <Select.Option key={loc.id} value={loc.id}>
                      {loc.name}
                    </Select.Option>
                  ))}
              </Select>
            </Form.Item>
          )}

          {editingUser && (
            <Form.Item label="Activo" name="active" valuePropName="checked">
              <Switch />
            </Form.Item>
          )}
        </Form>

        {!editingUser && (
          <div style={{
            marginTop: 16,
            padding: isMobile ? 10 : 12,
            background: '#fff7e6',
            borderRadius: 4,
            fontSize: isMobile ? 11 : 12
          }}>
            <p style={{ margin: 0 }}>
              Los usuarios PDV requieren una ubicación asignada. Los demás roles tienen acceso global.
            </p>
          </div>
        )}
      </Modal>

      {/* Modal Resetear Contraseña */}
      <Modal
        title="Restablecer Contraseña"
        open={resetPasswordModalOpen}
        onCancel={() => {
          setResetPasswordModalOpen(false);
          resetPasswordForm.resetFields();
        }}
        onOk={() => resetPasswordForm.submit()}
        okText="Restablecer"
        cancelText="Cancelar"
        okButtonProps={{ danger: true }}
        centered
        width={isMobile ? '100%' : 520}
        styles={{
          body: {
            maxHeight: isMobile ? 'calc(100vh - 110px)' : 'calc(100vh - 200px)',
            overflowY: 'auto',
          },
        }}
      >
        <div style={{
          marginBottom: 16,
          padding: isMobile ? 10 : 12,
          background: '#fff7e6',
          borderRadius: 4,
          fontSize: isMobile ? 12 : 13
        }}>
          <p style={{ margin: 0 }}>
            Se establecerá una nueva contraseña para: <strong>{selectedUser?.email}</strong>
          </p>
        </div>

        <Form
          form={resetPasswordForm}
          layout="vertical"
          onFinish={handleResetPasswordSubmit}
          requiredMark={!isMobile}
        >
          <Form.Item
            label="Nueva Contraseña"
            name="newPassword"
            rules={[
              { required: true, message: 'Contraseña requerida' },
              { min: 6, message: 'Mínimo 6 caracteres' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Mínimo 6 caracteres"
              size={isMobile ? "large" : "middle"}
            />
          </Form.Item>

          <Form.Item
            label="Confirmar Contraseña"
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Confirma la contraseña' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Las contraseñas no coinciden'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Confirma la contraseña"
              size={isMobile ? "large" : "middle"}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UsersPage;
