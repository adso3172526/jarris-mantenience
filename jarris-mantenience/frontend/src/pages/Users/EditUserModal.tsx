import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, Switch, Input, message, Alert } from 'antd';
import { PhoneOutlined } from '@ant-design/icons';
import { usersApi, locationsApi } from '../../services/api';

interface EditUserModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: any;
}

const EditUserModal: React.FC<EditUserModalProps> = ({
  open,
  onClose,
  onSuccess,
  user,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  useEffect(() => {
    if (open && user) {
      loadLocations();
      form.setFieldsValue({
        phone: user.phone,
        roles: user.roles,
        locationId: user.locationId,
        active: user.active,
      });
      setSelectedRoles(user.roles);
    }
  }, [open, user, form]);

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
      await usersApi.update(user.id, values);
      message.success('Usuario actualizado exitosamente');
      form.resetFields();
      onSuccess();
      onClose();
    } catch (error: any) {
      message.error(
        error.response?.data?.message || 'Error al actualizar usuario'
      );
    } finally {
      setLoading(false);
    }
  };

  const needsLocation = selectedRoles.includes('PDV') || selectedRoles.includes('ADMINISTRACION');

  return (
    <Modal
      title={`Editar Usuario - ${user?.email}`}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      width={600}
      okText="Guardar"
      cancelText="Cancelar"
    >
      <Alert
        message="Cambio de roles"
        description="Al cambiar los roles del usuario, sus permisos se actualizarán inmediatamente en su próximo inicio de sesión."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          label="Celular"
          name="phone"
        >
          <Input
            prefix={<PhoneOutlined />}
            placeholder="Número de celular"
          />
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

        <Form.Item
          label="Estado"
          name="active"
          valuePropName="checked"
        >
          <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
        </Form.Item>
      </Form>

      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: '#fff7e6',
          borderRadius: 4,
        }}
      >
        <p style={{ margin: 0, fontSize: 12 }}>
          <strong>Nota:</strong> No se puede cambiar el email del usuario. Si
          necesitas cambiarlo, crea un nuevo usuario y desactiva este.
        </p>
      </div>
    </Modal>
  );
};

export default EditUserModal;
