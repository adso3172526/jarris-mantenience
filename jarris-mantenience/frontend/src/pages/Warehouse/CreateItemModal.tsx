import React, { useState } from 'react';
import { Modal, Form, Input, Select, InputNumber, message } from 'antd';
import { warehouseApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface CreateItemModalProps {
  open: boolean;
  onClose: (reload?: boolean) => void;
  warehouseId: string;
}

const UNIT_OF_MEASURE_OPTIONS = [
  { label: 'Unidades', value: 'UNIDADES' },
  { label: 'Metros', value: 'METROS' },
  { label: 'Kilogramos', value: 'KILOGRAMOS' },
  { label: 'Litros', value: 'LITROS' },
  { label: 'Galones', value: 'GALONES' },
  { label: 'Piezas', value: 'PIEZAS' },
  { label: 'Cajas', value: 'CAJAS' },
  { label: 'Pares', value: 'PARES' },
];

const CreateItemModal: React.FC<CreateItemModalProps> = ({
  open,
  onClose,
  warehouseId,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const isMobile = window.innerWidth < 768;
  const { user } = useAuth();

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      await warehouseApi.createItem({
        warehouseId,
        name: values.name,
        brand: values.brand || undefined,
        unitOfMeasure: values.unitOfMeasure,
        weightOrSize: values.weightOrSize || undefined,
        unitCost: values.unitCost,
        initialStock: values.initialStock || 0,
        minimumStock: values.minimumStock,
        observations: values.observations || undefined,
        createdBy: user?.email || '',
      });
      message.success('Item creado exitosamente');
      form.resetFields();
      onClose(true);
    } catch (error: any) {
      message.error(
        error.response?.data?.message || 'Error al crear el item'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Nuevo Item"
      open={open}
      onCancel={() => { form.resetFields(); onClose(); }}
      onOk={() => form.submit()}
      confirmLoading={loading}
      okText="Crear"
      cancelText="Cancelar"
      destroyOnClose
      width={isMobile ? '100%' : 500}
      centered
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
          <Input placeholder="Nombre del item" size={isMobile ? 'large' : 'middle'} />
        </Form.Item>

        <Form.Item label="Marca" name="brand">
          <Input placeholder="Opcional" size={isMobile ? 'large' : 'middle'} />
        </Form.Item>

        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item
            label="Unidad de Medida"
            name="unitOfMeasure"
            rules={[{ required: true, message: 'Requerido' }]}
            style={{ flex: 1 }}
          >
            <Select
              placeholder="Seleccione"
              options={UNIT_OF_MEASURE_OPTIONS}
              size={isMobile ? 'large' : 'middle'}
            />
          </Form.Item>

          <Form.Item label="Peso / Medida" name="weightOrSize" style={{ flex: 1 }}>
            <Input placeholder="Ej: 500g, 1m" size={isMobile ? 'large' : 'middle'} />
          </Form.Item>
        </div>

        <Form.Item
          label="Costo Unitario"
          name="unitCost"
          rules={[{ required: true, message: 'Requerido' }]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            placeholder="0"
            prefix="$"
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as any}
            size={isMobile ? 'large' : 'middle'}
          />
        </Form.Item>

        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item
            label="Stock Inicial"
            name="initialStock"
            style={{ flex: 1 }}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              placeholder="0"
              size={isMobile ? 'large' : 'middle'}
            />
          </Form.Item>

          <Form.Item
            label="Stock Mínimo"
            name="minimumStock"
            rules={[{ required: true, message: 'Requerido' }]}
            style={{ flex: 1 }}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              placeholder="0"
              size={isMobile ? 'large' : 'middle'}
            />
          </Form.Item>
        </div>

        <Form.Item label="Observaciones" name="observations">
          <Input.TextArea rows={2} placeholder="Opcional" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateItemModal;
