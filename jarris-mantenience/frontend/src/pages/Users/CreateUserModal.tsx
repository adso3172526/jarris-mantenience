import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, message, Alert } from 'antd';
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

  useEffect(() => {
    if (open) {
      loadLocations();
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
    try {
      setLoading(true);
      await usersApi.create(values);
      message.success('Usuario creado exitosamente');
      form.resetFields();
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

  const needsLocation = selectedRoles.includes('PDV') || selectedRoles.includes('ADMINISTRACION');

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

        {needsLocation && (
          <Form.Item
            label="Ubicación"
            name="locationId"
            rules={[
              {
                required: true,
                message: 'Ubicación requerida para usuarios PDV/Administración',
              },
            ]}
          >
            <Select placeholder="Selecciona la ubicación">
              {locations.map((loc) => (
                <Select.Option key={loc.id} value={loc.id}>
                  {loc.name} - {loc.type}
                </Select.Option>
              ))}
            </Select>
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
            <strong>PDV:</strong> Crear solicitudes de OT (requiere ubicación)
          </li>
          <li>
            <strong>ADMINISTRACION:</strong> Igual que PDV, gestiona solicitudes de su ubicación
          </li>
        </ul>
      </div>
    </Modal>
  );
};

export default CreateUserModal;
