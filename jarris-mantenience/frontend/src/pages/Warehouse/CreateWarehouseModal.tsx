import React, { useState } from 'react';
import { Modal, Form, Input, Select, message } from 'antd';
import { warehouseApi } from '../../services/api';

interface CreateWarehouseModalProps {
  open: boolean;
  onClose: (reload?: boolean) => void;
  locations: { id: string; name: string }[];
  existingWarehouseLocationIds: string[];
}

const CreateWarehouseModal: React.FC<CreateWarehouseModalProps> = ({
  open,
  onClose,
  locations,
  existingWarehouseLocationIds,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isMobile] = useState(window.innerWidth < 768);

  const availableLocations = locations.filter(
    (loc) => !existingWarehouseLocationIds.includes(loc.id)
  );

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      await warehouseApi.create({
        name: values.name,
        locationId: values.locationId,
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
      title="Crear Nueva Bodega"
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
          label="Ubicacion"
          name="locationId"
          rules={[{ required: true, message: 'La ubicacion es requerida' }]}
        >
          <Select
            placeholder="Selecciona una ubicacion"
            showSearch
            optionFilterProp="children"
            size={isMobile ? 'large' : 'middle'}
          >
            {availableLocations.map((loc) => (
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
