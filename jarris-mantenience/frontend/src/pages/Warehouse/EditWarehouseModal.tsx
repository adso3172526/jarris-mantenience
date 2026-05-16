import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, Switch, message } from 'antd';
import { warehouseApi } from '../../services/api';

interface EditWarehouseModalProps {
  open: boolean;
  onClose: (reload?: boolean) => void;
  warehouse: { id: string; name: string; locationId: string; costCenter?: number | null; active: boolean } | null;
  locations: { id: string; name: string }[];
}

const EditWarehouseModal: React.FC<EditWarehouseModalProps> = ({
  open,
  onClose,
  warehouse,
  locations,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const isMobile = window.innerWidth < 768;

  useEffect(() => {
    if (open && warehouse) {
      form.setFieldsValue({
        name: warehouse.name,
        locationId: warehouse.locationId,
        costCenter: warehouse.costCenter,
        active: warehouse.active,
      });
    }
  }, [open, warehouse, form]);

  const handleSubmit = async (values: any) => {
    if (!warehouse) return;
    try {
      setLoading(true);
      await warehouseApi.update(warehouse.id, {
        name: values.name,
        locationId: values.locationId,
        costCenter: values.costCenter ?? null,
        active: values.active,
      });
      message.success('Almacén actualizado exitosamente');
      form.resetFields();
      onClose(true);
    } catch (error: any) {
      message.error(
        error.response?.data?.message || 'Error al actualizar el almacén'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Editar Almacén"
      open={open}
      onCancel={() => { form.resetFields(); onClose(); }}
      onOk={() => form.submit()}
      confirmLoading={loading}
      okText="Guardar"
      cancelText="Cancelar"
      destroyOnClose
      width={isMobile ? '100%' : 420}
      centered
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
          rules={[{ required: true, message: 'El nombre es requerido' }]}
        >
          <Input
            placeholder="Nombre del almacén"
            size={isMobile ? 'large' : 'middle'}
          />
        </Form.Item>

        <Form.Item
          label="Ubicación"
          name="locationId"
          rules={[{ required: true, message: 'La ubicación es requerida' }]}
        >
          <Select
            placeholder="Selecciona una ubicación"
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

        <Form.Item
          label="Centro de Costos (CC)"
          name="costCenter"
        >
          <InputNumber
            placeholder="Ej: 200"
            size={isMobile ? 'large' : 'middle'}
            style={{ width: '100%' }}
            precision={0}
          />
        </Form.Item>

        <Form.Item
          label="Estado"
          name="active"
          valuePropName="checked"
        >
          <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditWarehouseModal;
