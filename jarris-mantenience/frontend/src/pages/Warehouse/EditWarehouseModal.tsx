import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Switch, message } from 'antd';
import { warehouseApi } from '../../services/api';

interface EditWarehouseModalProps {
  open: boolean;
  onClose: (reload?: boolean) => void;
  warehouse: { id: string; name: string; active: boolean } | null;
}

const EditWarehouseModal: React.FC<EditWarehouseModalProps> = ({
  open,
  onClose,
  warehouse,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const isMobile = window.innerWidth < 768;

  useEffect(() => {
    if (open && warehouse) {
      form.setFieldsValue({
        name: warehouse.name,
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
