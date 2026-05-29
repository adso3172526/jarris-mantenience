import React, { useState } from 'react';
import { Modal, Form, Input, Select, message } from 'antd';
import { warehouseApi } from '../../services/api';

interface CreateWarehouseModalProps {
  open: boolean;
  onClose: (reload?: boolean) => void;
  locations: { id: string; name: string }[];
}

const CreateWarehouseModal: React.FC<CreateWarehouseModalProps> = ({
  open,
  onClose,
  locations,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isMobile] = useState(window.innerWidth < 768);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      await warehouseApi.create({
        name: values.name,
        locationId: values.locationId,
        costCenter: values.costCenter != null ? String(values.costCenter).trim() || undefined : undefined,
      });
      message.success('Bodega creada exitosamente');
      form.resetFields();
      onClose(true);
    } catch (error: any) {
      message.error(
        error.response?.data?.message || 'Error al crear la bodega'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="Nuevo Almacén"
      open={open}
      onCancel={handleCancel}
      onOk={() => form.submit()}
      confirmLoading={loading}
      okText="Crear"
      cancelText="Cancelar"
      destroyOnClose
      width={isMobile ? 'calc(100vw - 24px)' : 500}
      centered
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          label="Nombre"
          name="name"
          rules={[{ required: true, message: 'El nombre es requerido' }]}
        >
          <Input
            placeholder="Nombre de la bodega"
            size={isMobile ? 'large' : 'middle'}
          />
        </Form.Item>

        <Form.Item
          label="Centro de Costos (CC)"
          name="costCenter"
        >
          <Input
            placeholder="Ej: 0001"
            size={isMobile ? 'large' : 'middle'}
          />
        </Form.Item>

        <Form.Item
          label="Ubicación"
          name="locationId"
          rules={[{ required: true, message: 'La ubicación es requerida' }]}
        >
          <Select
            placeholder="Selecciona una ubicacion"
            showSearch
            optionFilterProp="children"
            size={isMobile ? 'large' : 'middle'}
          >
            {locations.map((loc) => (
              <Select.Option key={loc.id} value={loc.id}>
                {loc.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateWarehouseModal;
