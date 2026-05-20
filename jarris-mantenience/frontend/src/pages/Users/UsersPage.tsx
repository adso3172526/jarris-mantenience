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
  Tabs,
  Checkbox,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  EditOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { usersApi, locationsApi, profilesApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface User {
  id: string;
  userId: string;
  name?: string;
  email: string;
  userRoles?: { role: string }[];
  phone?: string;
  profileId?: string;
  profile?: {
    id: string;
    name: string;
    profilePermissions?: { permission: string }[];
    active: boolean;
  };
  userLocations?: { locationId: string; location?: { name: string } }[];
  active: boolean;
}

interface Profile {
  id: string;
  code: string;
  name: string;
  profilePermissions?: { permission: string }[];
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  JEFE_MANTENIMIENTO: 'Jefe Mantenimiento',
  TECNICO_INTERNO: 'Técnico Interno',
  CONTRATISTA: 'Contratista',
  PDV: 'Punto de Venta',
  ADMINISTRACION: 'Administración',
};

// Helper to extract permissions from normalized profile
const getProfilePerms = (profile: Profile): string[] =>
  (profile.profilePermissions || []).map(pp => pp.permission);

const PERMISSION_DEPENDENCIES: Record<string, string[]> = {
  VER_HISTORIAL_ACTIVO: ['VER_ACTIVOS'],
  EDITAR_ACTIVOS: ['VER_ACTIVOS'],
  VER_TRASLADOS: ['VER_ACTIVOS'],
  CREAR_TRASLADOS: ['VER_ACTIVOS', 'VER_TRASLADOS'],
  EDITAR_TRASLADOS: ['VER_ACTIVOS', 'CREAR_TRASLADOS'],
  EDITAR_UBICACIONES: ['VER_UBICACIONES'],
  INICIAR_OT: ['VER_OT'],
  FINALIZAR_OT: ['VER_OT'],
  EDITAR_OT: ['VER_OT'],
  ANULAR_OT: ['VER_OT'],
  CERRAR_OT: ['VER_OT'],
  GENERAR_REPORTES: ['VER_DASHBOARD'],
  VER_EVENTOS: ['VER_ACTIVOS'],
  VER_BAJAS: ['VER_ACTIVOS'],
  EDITAR_CATEGORIAS_ACTIVOS: ['VER_CATEGORIAS_ACTIVOS'],
  EDITAR_CATEGORIAS_LOCATIVOS: ['VER_CATEGORIAS_LOCATIVOS'],
  CAMBIAR_UBICACION_OT: ['EDITAR_OT'],
  CAMBIAR_ACTIVO_OT: ['EDITAR_OT'],
  ASIGNAR_TECNICO: ['EDITAR_OT'],
  REASIGNAR_TECNICO: ['EDITAR_OT'],
  EDITAR_SOLICITUD: ['VER_SOLICITUDES'],
  CERRAR_SOLICITUD: ['VER_SOLICITUDES'],
  RECHAZAR_SOLICITUD: ['VER_SOLICITUDES'],
  EDITAR_OT_CERRADA: ['VER_ORDENES_CERRADAS'],
  EDITAR_CONSUMO_ALMACEN_OT: ['CONSUMIR_ALMACEN_OT'],
  CREAR_PERFILES: ['VER_PERFILES'],
  EDITAR_PERFILES: ['VER_PERFILES'],
  VER_MOVIMIENTOS_ALMACEN: ['VER_TODOS_ALMACENES'],
  VER_ALERTAS_ALMACEN: ['VER_TODOS_ALMACENES'],
  EDITAR_ALMACEN: ['VER_TODOS_ALMACENES'],
  EDITAR_ITEMS_ALMACEN: ['VER_TODOS_ALMACENES'],
  INGRESAR_STOCK: ['VER_TODOS_ALMACENES'],
  VER_TRASLADOS_ALMACEN: ['VER_TODOS_ALMACENES'],
  CREAR_TRASLADOS_ALMACEN: ['VER_TODOS_ALMACENES', 'VER_TRASLADOS_ALMACEN'],
};

const PERMISSION_CATEGORIES = [
  {
    title: 'Solicitudes',
    permissions: [
      { key: 'VER_SOLICITUDES', label: 'Ver módulo Solicitudes' },
      { key: 'VER_OT', label: 'Ver OT asignadas' },
      { key: 'CREAR_OT_EQUIPO', label: 'Crear OT de equipo' },
      { key: 'CREAR_OT_LOCATIVO', label: 'Crear OT locativo' },
      { key: 'INICIAR_OT', label: 'Iniciar orden de trabajo' },
      { key: 'FINALIZAR_OT', label: 'Finalizar orden de trabajo' },
      { key: 'EDITAR_OT', label: 'Editar órdenes de trabajo' },
      { key: 'EDITAR_SOLICITUD', label: 'Editar solicitudes' },
      { key: 'CERRAR_SOLICITUD', label: 'Cerrar solicitudes' },
      { key: 'RECHAZAR_SOLICITUD', label: 'Rechazar solicitudes' },
      { key: 'ASIGNAR_TECNICO', label: 'Asignar técnico' },
      { key: 'REASIGNAR_TECNICO', label: 'Reasignar técnico/contratista' },
      { key: 'CAMBIAR_ACTIVO_OT', label: 'Cambiar activo de la OT' },
      { key: 'CAMBIAR_UBICACION_OT', label: 'Cambiar ubicación de la OT' },
      { key: 'ANULAR_OT', label: 'Anular órdenes de trabajo' },
      { key: 'CERRAR_OT', label: 'Cerrar órdenes de trabajo' },
    ],
  },
  {
    title: 'Órdenes de Trabajo (Cerradas)',
    permissions: [
      { key: 'VER_ORDENES_CERRADAS', label: 'Ver módulo Órdenes de Trabajo' },
      { key: 'VER_TODAS_OT', label: 'Ver todas las OT de equipo' },
      { key: 'VER_TODAS_OT_LOCATIVO', label: 'Ver todas las OT locativas' },
      { key: 'EDITAR_OT_CERRADA', label: 'Editar OT cerrada' },
    ],
  },
  {
    title: 'Activos',
    permissions: [
      { key: 'VER_ACTIVOS', label: 'Ver activos' },
      { key: 'VER_HISTORIAL_ACTIVO', label: 'Ver historial del activo' },
      { key: 'EDITAR_ACTIVOS', label: 'Editar activos' },
      { key: 'VER_EVENTOS', label: 'Ver eventos' },
      { key: 'VER_BAJAS', label: 'Ver bajas' },
    ],
  },
  {
    title: 'Traslados',
    permissions: [
      { key: 'VER_TRASLADOS', label: 'Ver traslados' },
      { key: 'CREAR_TRASLADOS', label: 'Crear traslados' },
      { key: 'EDITAR_TRASLADOS', label: 'Editar traslados' },
    ],
  },
  {
    title: 'Categorías',
    permissions: [
      { key: 'VER_CATEGORIAS_ACTIVOS', label: 'Ver categorías de activos' },
      { key: 'EDITAR_CATEGORIAS_ACTIVOS', label: 'Editar categorías de activos' },
      { key: 'VER_CATEGORIAS_LOCATIVOS', label: 'Ver categorías locativas' },
      { key: 'EDITAR_CATEGORIAS_LOCATIVOS', label: 'Editar categorías locativas' },
    ],
  },
  {
    title: 'Ubicaciones',
    permissions: [
      { key: 'VER_UBICACIONES', label: 'Ver ubicaciones' },
      { key: 'EDITAR_UBICACIONES', label: 'Editar ubicaciones' },
    ],
  },
  {
    title: 'Almacén',
    permissions: [
      { key: 'VER_TODOS_ALMACENES', label: 'Ver todos los almacenes' },
      { key: 'VER_MOVIMIENTOS_ALMACEN', label: 'Ver movimientos (Kardex)' },
      { key: 'VER_ALERTAS_ALMACEN', label: 'Ver alertas de stock bajo' },
      { key: 'EDITAR_ALMACEN', label: 'Editar almacén' },
      { key: 'EDITAR_ITEMS_ALMACEN', label: 'Editar items de almacén' },
      { key: 'INGRESAR_STOCK', label: 'Ingresar stock' },
      { key: 'VER_TRASLADOS_ALMACEN', label: 'Ver traslados de almacén' },
      { key: 'CREAR_TRASLADOS_ALMACEN', label: 'Crear traslados de almacén' },
      { key: 'CONSUMIR_ALMACEN_OT', label: 'Registrar consumo de almacén en OT' },
      { key: 'EDITAR_CONSUMO_ALMACEN_OT', label: 'Editar consumo de almacén en OT cerrada' },
    ],
  },
  {
    title: 'Reportes',
    permissions: [
      { key: 'GENERAR_REPORTES', label: 'Generar reportes' },
      { key: 'VER_DASHBOARD', label: 'Ver dashboard' },
    ],
  },
  {
    title: 'Usuarios',
    permissions: [
      { key: 'CREAR_USUARIOS', label: 'Crear usuarios' },
      { key: 'CAMBIAR_PASSWORD_USUARIO', label: 'Cambiar contraseña de usuario' },
      { key: 'VER_PERFILES', label: 'Ver perfiles' },
      { key: 'CREAR_PERFILES', label: 'Crear perfiles' },
      { key: 'EDITAR_PERFILES', label: 'Editar perfiles' },
    ],
  },
];

const UsersPage: React.FC = () => {
  const { hasAccess, hasPermission } = useAuth();
  const isAdmin = hasAccess(['ADMIN']);

  // --- Users state ---
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [form] = Form.useForm();
  const [resetPasswordForm] = Form.useForm();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [mobilePage, setMobilePage] = useState(1);

  // --- User locations state ---
  const [userAllLocations, setUserAllLocations] = useState(true);
  const [userSelectedLocationIds, setUserSelectedLocationIds] = useState<string[]>([]);

  // --- Profiles state ---
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [copiedFromProfile, setCopiedFromProfile] = useState<string | null>(null);
  const [profileForm] = Form.useForm();
  const [profileMobilePage, setProfileMobilePage] = useState(1);

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
      const [usersRes, locationsRes, profilesRes] = await Promise.all([
        usersApi.getAll(),
        locationsApi.getAll(),
        profilesApi.getAll().catch(() => ({ data: [] })),
      ]);
      setUsers(usersRes.data);
      setLocations(locationsRes.data);
      setProfiles(profilesRes.data);
    } catch (error) {
      message.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  // ===================== USERS HANDLERS =====================

  const handleCreate = () => {
    setEditingUser(null);
    setIsAdminUser(false);
    setUserAllLocations(false);
    setUserSelectedLocationIds([]);
    form.resetFields();
    form.setFieldsValue({ active: true });
    setModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    const roles = (user.userRoles || []).map(ur => ur.role);
    setIsAdminUser(roles.includes('ADMIN'));
    // Load user locations
    const userLocIds = (user.userLocations || []).map(ul => ul.locationId);
    if (userLocIds.length === 0) {
      setUserAllLocations(true);
      setUserSelectedLocationIds([]);
    } else {
      setUserAllLocations(false);
      setUserSelectedLocationIds(userLocIds);
    }
    form.setFieldsValue({
      name: user.name,
      email: user.email,
      phone: user.phone,
      profileId: user.profileId || undefined,
      active: user.active,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      if (!isAdminUser && !values.profileId) {
        message.error('Selecciona un perfil para el usuario');
        return;
      }
      if (!isAdminUser && !userAllLocations && userSelectedLocationIds.length === 0) {
        message.error('Selecciona al menos una ubicación o marca "Todas las ubicaciones"');
        return;
      }

      const payload: any = {
        name: values.name,
        email: values.email,
        phone: values.phone,
        password: values.password,
        roles: isAdminUser ? ['ADMIN'] : [],
        profileId: isAdminUser ? null : (values.profileId || null),
        locationIds: isAdminUser ? [] : (userAllLocations ? [] : userSelectedLocationIds),
        active: values.active,
      };

      if (editingUser) {
        if (!payload.password) {
          delete payload.password;
        }
        await usersApi.update(editingUser.id, payload);
        message.success('Usuario actualizado exitosamente');
      } else {
        await usersApi.create(payload);
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

  // ===================== PROFILES HANDLERS =====================

  const openCreateProfile = () => {
    setEditingProfile(null);
    setCopiedFromProfile(null);
    profileForm.resetFields();
    profileForm.setFieldsValue({ permissions: [], active: true });
    setProfileModalOpen(true);
  };

  const openEditProfile = (profile: Profile) => {
    setCopiedFromProfile(null);
    setEditingProfile(profile);
    profileForm.setFieldsValue({
      name: profile.name,
      permissions: getProfilePerms(profile),
      active: profile.active,
    });
    setProfileModalOpen(true);
  };

  const doSaveProfile = async () => {
    try {
      const values = await profileForm.validateFields();

      if (!values.permissions || values.permissions.length === 0) {
        message.error('Debe seleccionar al menos un permiso');
        return;
      }

      const payload = {
        name: values.name,
        permissions: values.permissions,
        ...(editingProfile ? { active: values.active } : {}),
      };

      if (editingProfile) {
        await profilesApi.update(editingProfile.id, payload);
        message.success('Perfil actualizado');
      } else {
        await profilesApi.create(payload);
        message.success('Perfil creado');
      }

      setProfileModalOpen(false);
      setCopiedFromProfile(null);
      loadData();
    } catch (error: any) {
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      }
    }
  };

  const handleSaveProfile = () => {
    if (copiedFromProfile) {
      const targetName = editingProfile?.name || profileForm.getFieldValue('name') || 'nuevo perfil';
      Modal.confirm({
        title: 'Confirmar copia de permisos',
        content: `¿Seguro que desea guardar "${targetName}" con los permisos copiados de "${copiedFromProfile}"?`,
        okText: 'Sí, guardar',
        cancelText: 'Cancelar',
        onOk: () => doSaveProfile(),
        onCancel: () => {
          profileForm.setFieldsValue({ permissions: editingProfile ? getProfilePerms(editingProfile) : [] });
          setCopiedFromProfile(null);
        },
      });
    } else {
      doSaveProfile();
    }
  };

  // ===================== USERS UI =====================

  const showLocationSection = !isAdminUser;


  const getRoleOrProfileLabel = (user: User) => {
    if (user.profile) {
      return <Tag style={{ background: '#fff' }}>{user.profile.name}</Tag>;
    }
    return (
      <Space wrap size={4}>
        {(user.userRoles || []).map((ur) => ur.role).map((role) => (
          <Tag key={role} style={{ margin: 0, background: '#fff' }}>
            {roleLabels[role] || role}
          </Tag>
        ))}
      </Space>
    );
  };

  const renderUserMobileCard = (record: User) => (
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
        <div style={{ marginBottom: 4 }}>
          {getRoleOrProfileLabel(record)}
        </div>
        {(record.userLocations && record.userLocations.length > 0) && (
          <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
            <EnvironmentOutlined /> {record.userLocations.map(ul => ul.location?.name).filter(Boolean).join(', ')}
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
          type="text"
          icon={<LockOutlined style={{ color: '#faad14' }} />}
          onClick={() => handleResetPassword(record)}
        />
      </Space>
    </Card>
  );

  const userColumns: ColumnsType<User> = [
    {
      title: 'Usuario',
      key: 'user',
      width: 280,
      sorter: (a, b) => (a.name || a.email).localeCompare(b.name || b.email),
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{record.name || record.email.split('@')[0]}</div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
            {record.email}
            {record.phone ? ` · ${record.phone}` : ''}
            {record.userLocations && record.userLocations.length > 0 ? ` · ${record.userLocations.map(ul => ul.location?.name).filter(Boolean).join(', ')}` : ''}
          </div>
        </div>
      ),
    },
    {
      title: 'Rol / Perfil',
      key: 'roleProfile',
      width: 280,
      sorter: (a, b) => {
        const aLabel = a.profile?.name || (a.userRoles || [])[0]?.role || '';
        const bLabel = b.profile?.name || (b.userRoles || [])[0]?.role || '';
        return aLabel.localeCompare(bLabel);
      },
      render: (_, record) => getRoleOrProfileLabel(record),
    },
    {
      title: 'Estado',
      dataIndex: 'active',
      key: 'active',
      width: 100,
      align: 'center',
      sorter: (a, b) => Number(a.active) - Number(b.active),
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

  // ===================== PROFILES UI =====================

  const profileColumns = [
    {
      title: 'Id',
      dataIndex: 'code',
      key: 'code',
      width: 80,
      render: (code: string) => <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{code}</span>,
    },
    {
      title: 'Nombre',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => name,
    },
    {
      title: 'Permisos',
      key: 'permissions',
      render: (_: any, record: Profile) => <Tag style={{ background: '#fff' }}>{getProfilePerms(record).length} permisos</Tag>,
    },
    {
      title: 'Estado',
      dataIndex: 'active',
      key: 'active',
      render: (active: boolean) => (
        <Badge status={active ? 'success' : 'error'} text={active ? 'Activo' : 'Inactivo'} />
      ),
    },
    ...((isAdmin || hasPermission('EDITAR_PERFILES')) ? [{
      title: 'Acciones',
      key: 'actions',
      render: (_: any, record: Profile) => (
        <Button
          type="text"
          icon={<EditOutlined style={{ color: '#1890ff' }} />}
          onClick={() => openEditProfile(record)}
        />
      ),
    }] : []),
  ];

  const profilePageSize = 5;
  const paginatedProfiles = profiles.slice((profileMobilePage - 1) * profilePageSize, profileMobilePage * profilePageSize);

  const renderProfileMobileCard = (profile: Profile) => (
    <Card
      key={profile.id}
      size="small"
      style={{
        marginBottom: 8,
        borderRadius: 12,
        background: '#fff',
      }}
      styles={{ body: { padding: '12px 16px' } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 600, marginRight: 6 }}>{profile.code}</span>
            {profile.name}
          </div>
          <Space size={4} wrap>
            <Tag style={{ background: '#fff' }}>{getProfilePerms(profile).length} permisos</Tag>
            <Badge
              status={profile.active ? 'success' : 'error'}
              text={profile.active ? 'Activo' : 'Inactivo'}
            />
          </Space>
        </div>
        {(isAdmin || hasPermission('EDITAR_PERFILES')) && (
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => openEditProfile(profile)}
          />
        )}
      </div>
    </Card>
  );

  // ===================== TAB ITEMS =====================

  const usersTabContent = (
    <Card
      title={
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: isMobile ? 14 : 16, fontWeight: 600 }}>
              Gestión de Usuarios
            </span>
          </div>
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
      {isMobile ? (
        loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>Cargando...</div>
        ) : users.length > 0 ? (
          <div>
            {users.slice((mobilePage - 1) * 5, mobilePage * 5).map(renderUserMobileCard)}
            <Pagination
              current={mobilePage}
              pageSize={5}
              total={users.length}
              onChange={(page) => setMobilePage(page)}
              size="small"
              simple
              style={{ textAlign: 'center', marginTop: 8 }}
            />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }}>
            No hay usuarios
          </div>
        )
      ) : (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Table
            columns={userColumns}
            dataSource={users}
            rowKey="id"
            loading={loading}
            size="small"
            pagination={{
              pageSize: 8,
              showTotal: (total) => `Total: ${total} usuarios`,
              size: 'small',
              showSizeChanger: false,
            }}
          />
        </div>
      )}
    </Card>
  );

  const profilesTabContent = (
    <Card
      title={
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8
        }}>
          <span style={{ fontSize: isMobile ? 14 : 16, fontWeight: 600 }}>
            Gestión de Perfiles
          </span>
          {(isAdmin || hasPermission('CREAR_PERFILES')) && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreateProfile}
              size="middle"
            >
              {isMobile ? 'Nuevo' : 'Nuevo Perfil'}
            </Button>
          )}
        </div>
      }
      styles={{ body: { padding: isMobile ? 12 : '12px 24px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {isMobile ? (
        loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>Cargando...</div>
        ) : (
          <>
            {paginatedProfiles.map(renderProfileMobileCard)}
            {profiles.length > profilePageSize && (
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <Pagination
                  current={profileMobilePage}
                  total={profiles.length}
                  pageSize={profilePageSize}
                  onChange={setProfileMobilePage}
                  size="small"
                  simple
                />
              </div>
            )}
          </>
        )
      ) : (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Table
            columns={profileColumns}
            dataSource={profiles}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
            size="small"
          />
        </div>
      )}
    </Card>
  );

  const tabItems = [
    {
      key: 'users',
      label: 'Usuarios',
      children: usersTabContent,
    },
    ...((isAdmin || hasPermission('VER_PERFILES')) ? [{
      key: 'profiles',
      label: 'Perfiles',
      children: profilesTabContent,
    }] : []),
  ];

  return (
    <div style={{ height: isMobile ? 'auto' : '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{`
        .users-tabs { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .users-tabs > .ant-tabs-content-holder { flex: 1; overflow: hidden; }
        .users-tabs .ant-tabs-content { height: 100%; }
        .users-tabs .ant-tabs-tabpane-active { height: 100%; display: flex; flex-direction: column; }
        ${isMobile ? `
          .users-tabs .ant-tabs-tab { color: rgba(255,255,255,0.65) !important; }
          .users-tabs .ant-tabs-tab-active .ant-tabs-tab-btn { color: #fff !important; }
          .users-tabs .ant-tabs-ink-bar { background: #E60012 !important; }
          .users-tabs .ant-tabs-nav::before { border-bottom-color: rgba(255,255,255,0.15) !important; }
        ` : ''}
      `}</style>
      <Tabs
        defaultActiveKey="users"
        items={tabItems}
        className="users-tabs"
        size={isMobile ? 'small' : 'middle'}
      />

      {/* Modal Crear/Editar Usuario */}
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

          <Form.Item label="Administrador" style={{ marginBottom: 16 }}>
            <Switch
              checked={isAdminUser}
              onChange={(checked) => {
                setIsAdminUser(checked);
                if (checked) {
                  form.setFieldsValue({ profileId: undefined });
                  setUserAllLocations(true);
                  setUserSelectedLocationIds([]);
                }
              }}
              checkedChildren="Sí"
              unCheckedChildren="No"
            />
            <span style={{ marginLeft: 8, fontSize: 12, color: '#8c8c8c' }}>
              {isAdminUser ? 'Acceso total al sistema' : 'Los permisos se definen por el perfil'}
            </span>
          </Form.Item>

          {!isAdminUser && (
            <Form.Item
              label="Perfil"
              name="profileId"
              rules={[{ required: !isAdminUser, message: 'Selecciona un perfil' }]}
            >
              <Select
                placeholder="Selecciona un perfil"
                size={isMobile ? "large" : "middle"}
              >
                {profiles
                  .filter(p => p.active)
                  .map(p => (
                    <Select.Option key={p.id} value={p.id}>
                      {p.name} ({getProfilePerms(p).length} permisos)
                    </Select.Option>
                  ))}
              </Select>
            </Form.Item>
          )}

          {showLocationSection && (
            <Form.Item label="Ubicaciones" style={{ marginBottom: 16 }}>
              <Checkbox
                checked={userAllLocations}
                onChange={(e) => {
                  setUserAllLocations(e.target.checked);
                  if (e.target.checked) setUserSelectedLocationIds([]);
                }}
                style={{ marginBottom: 8 }}
              >
                <strong>Todas las ubicaciones</strong>
              </Checkbox>
              {!userAllLocations && (
                <div style={{
                  maxHeight: 200,
                  overflowY: 'auto',
                  border: '1px solid #d9d9d9',
                  borderRadius: 4,
                  padding: 8,
                }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
                    {locations
                      .filter((loc) => loc.active !== false)
                      .sort((a: any, b: any) => a.name.localeCompare(b.name))
                      .map((loc) => (
                      <Checkbox
                        key={loc.id}
                        checked={userSelectedLocationIds.includes(loc.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setUserSelectedLocationIds(prev => [...prev, loc.id]);
                          } else {
                            setUserSelectedLocationIds(prev => prev.filter(id => id !== loc.id));
                          }
                        }}
                        style={{ minWidth: '45%' }}
                      >
                        {loc.name} <span style={{ color: '#8c8c8c', fontSize: 11 }}>({loc.type})</span>
                      </Checkbox>
                    ))}
                  </div>
                </div>
              )}
            </Form.Item>
          )}

          {editingUser && (
            <Form.Item label="Activo" name="active" valuePropName="checked">
              <Switch />
            </Form.Item>
          )}
        </Form>

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

      {/* Modal Crear/Editar Perfil */}
      <Modal
        title={editingProfile ? 'Editar Perfil' : 'Crear Perfil'}
        open={profileModalOpen}
        onOk={handleSaveProfile}
        onCancel={() => { setProfileModalOpen(false); setCopiedFromProfile(null); }}
        okText="Guardar"
        cancelText="Cancelar"
        width={600}
        centered
        styles={{
          body: {
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto',
          },
        }}
      >
        <Form form={profileForm} layout="vertical">
          <Form.Item
            label="Nombre del perfil"
            name="name"
            rules={[{ required: true, message: 'Ingrese el nombre del perfil' }]}
          >
            <Input placeholder="Ej: SUPERVISOR" style={{ textTransform: 'uppercase' }} />
          </Form.Item>

          {editingProfile && (
            <Form.Item label="Activo" name="active" valuePropName="checked">
              <Switch />
            </Form.Item>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 500 }}>
              <CopyOutlined style={{ marginRight: 6 }} />
              Copiar permisos de otro perfil
            </label>
            <Select
              key={(editingProfile?.id || 'new') + '-' + String(copiedFromProfile)}
              style={{ width: '100%', marginTop: 4 }}
              placeholder="Seleccione un perfil para copiar sus permisos"
              allowClear
              onChange={(profileId: string | undefined) => {
                if (!profileId) {
                  setCopiedFromProfile(null);
                  return;
                }
                const source = profiles.find(p => p.id === profileId);
                if (source) {
                  profileForm.setFieldsValue({ permissions: [...getProfilePerms(source)] });
                  setCopiedFromProfile(source.name);
                }
              }}
              options={profiles
                .filter(p => !editingProfile || p.id !== editingProfile.id)
                .map(p => ({ label: `${p.name} (${getProfilePerms(p).length} permisos)`, value: p.id }))}
            />
          </div>

          <Form.Item
            label="Permisos"
            name="permissions"
            rules={[{ required: true, message: 'Seleccione al menos un permiso' }]}
          >
            <Checkbox.Group
              style={{ width: '100%' }}
              onChange={(checkedValues) => {
                const values = checkedValues as string[];
                const withDeps = [...values];
                values.forEach((perm) => {
                  const deps = PERMISSION_DEPENDENCIES[perm];
                  if (deps) {
                    deps.forEach((dep) => {
                      if (!withDeps.includes(dep)) {
                        withDeps.push(dep);
                      }
                    });
                  }
                });
                if (withDeps.length !== values.length) {
                  profileForm.setFieldsValue({ permissions: withDeps });
                }
              }}
            >
              {PERMISSION_CATEGORIES.map((cat) => (
                <div key={cat.title} style={{ marginBottom: 16 }}>
                  <div style={{
                    fontWeight: 600,
                    fontSize: 13,
                    marginBottom: 6,
                    color: '#1a2733',
                    borderBottom: '1px solid #f0f0f0',
                    paddingBottom: 4,
                  }}>
                    {cat.title}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 8 }}>
                    {cat.permissions.map((p) => (
                      <Checkbox key={p.key} value={p.key}>
                        {p.label}
                      </Checkbox>
                    ))}
                  </div>
                </div>
              ))}
            </Checkbox.Group>
          </Form.Item>

        </Form>
      </Modal>
    </div>
  );
};

export default UsersPage;
