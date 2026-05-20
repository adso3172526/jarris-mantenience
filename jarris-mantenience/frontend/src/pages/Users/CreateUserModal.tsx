import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, message, Alert, Checkbox } from 'antd';
import { usersApi, locationsApi } from '../../services/api';

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [allLocations, setAllLocations] = useState(true);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      loadLocations();
      setAllLocations(true);
      setSelectedLocationIds([]);
    }
  }, [open]);

  const loadLocations = async () => {
    try {
      const response = await locationsApi.getAll();
      setLocations(response.data.filter((loc: any) => loc.active));
    } catch (error) {
      message.error('Error al cargar ubicaciones');
    }
  };

  const handleSubmit = async (values: any) => {
    const isAdmin = values.roles?.includes('ADMIN');
    if (!isAdmin && !allLocations && selectedLocationIds.length === 0) {
      message.error('Debe seleccionar al menos una ubicación o marcar "Todas las ubicaciones"');
      return;
    }
    try {
      setLoading(true);
      const payload = {
        ...values,
        locationIds: isAdmin ? [] : (allLocations ? [] : selectedLocationIds),
      };
      await usersApi.create(payload);
      message.success('Usuario creado exitosamente');
      form.resetFields();
      setSelectedRoles([]);
      setAllLocations(true);
      setSelectedLocationIds([]);
      onSuccess();
      onClose();
    } catch (error: any) {
      message.error(
        error.response?.data?.message || 'Error al crear usuario'
      );
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = selectedRoles.includes('ADMIN');

  return (
    <Modal
      title="Crear Nuevo Usuario"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      width={600}
      okText="Crear"
      cancelText="Cancelar"
    >
      <Alert
        message="Contraseña temporal"
        description="La contraseña por defecto será el email del usuario. Se recomienda que el usuario la cambie en su primer acceso."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ active: true }}
      >
        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: 'Email requerido' },
            { type: 'email', message: 'Email inválido' },
          ]}
        >
          <Input placeholder="usuario@ejemplo.com" />
        </Form.Item>

        <Form.Item
          label="Contraseña"
          name="password"
          rules={[
            { required: true, message: 'Contraseña requerida' },
            { min: 8, message: 'Mínimo 8 caracteres' },
          ]}
          extra="Mínimo 8 caracteres"
        >
          <Input.Password placeholder="********" />
        </Form.Item>

        <Form.Item
          label="Roles"
          name="roles"
          rules={[
            { required: true, message: 'Selecciona al menos un rol' },
          ]}
        >
          <Select
            mode="multiple"
            placeholder="Selecciona uno o más roles"
            onChange={setSelectedRoles}
          >
            <Select.Option value="ADMIN">Administrador</Select.Option>
            <Select.Option value="JEFE_MANTENIMIENTO">
              Jefe de Mantenimiento
            </Select.Option>
            <Select.Option value="TECNICO_INTERNO">
              Técnico Interno
            </Select.Option>
            <Select.Option value="CONTRATISTA">Contratista</Select.Option>
            <Select.Option value="PDV">PDV</Select.Option>
            <Select.Option value="ADMINISTRACION">Administración</Select.Option>
          </Select>
        </Form.Item>

        {/* Ubicaciones - para todos excepto ADMIN */}
        {!isAdmin && (
          <Form.Item label="Ubicaciones" style={{ marginBottom: 16 }}>
            <Checkbox
              checked={allLocations}
              onChange={(e) => {
                setAllLocations(e.target.checked);
                if (e.target.checked) setSelectedLocationIds([]);
              }}
              style={{ marginBottom: 8 }}
            >
              <strong>Todas las ubicaciones</strong>
            </Checkbox>
            {!allLocations && (
              <div style={{
                maxHeight: 200,
                overflowY: 'auto',
                border: '1px solid #d9d9d9',
                borderRadius: 4,
                padding: 8,
              }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
                  {locations
                    .sort((a: any, b: any) => a.name.localeCompare(b.name))
                    .map((loc) => (
                    <Checkbox
                      key={loc.id}
                      checked={selectedLocationIds.includes(loc.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLocationIds(prev => [...prev, loc.id]);
                        } else {
                          setSelectedLocationIds(prev => prev.filter(id => id !== loc.id));
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
      </Form>

      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: '#e6f7ff',
          borderRadius: 4,
        }}
      >
        <p style={{ margin: 0, fontSize: 12 }}>
          <strong>Roles:</strong>
        </p>
        <ul style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>
          <li>
            <strong>ADMIN:</strong> Acceso total al sistema
          </li>
          <li>
            <strong>JEFE_MANTENIMIENTO:</strong> Asignar y cerrar OT, ver
            reportes
          </li>
          <li>
            <strong>TECNICO_INTERNO:</strong> Iniciar y finalizar OT asignadas
          </li>
          <li>
            <strong>CONTRATISTA:</strong> Finalizar OT y subir facturas
          </li>
          <li>
            <strong>PDV:</strong> Crear solicitudes de OT
          </li>
          <li>
            <strong>ADMINISTRACION:</strong> Igual que PDV, gestiona solicitudes
          </li>
        </ul>
      </div>
    </Modal>
  );
};

export default CreateUserModal;
