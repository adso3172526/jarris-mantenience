import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, InputNumber, Switch, message } from 'antd';
import { warehouseApi } from '../../services/api';

interface EditItemModalProps {
  open: boolean;
  onClose: (reload?: boolean) => void;
  item: any;
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

const EditItemModal: React.FC<EditItemModalProps> = ({
  open,
  onClose,
  item,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    if (open && item) {
      form.setFieldsValue({
        name: item.name,
        brand: item.brand,
        unitOfMeasure: item.unitOfMeasure,
        weightOrSize: item.weightOrSize,
        unitCost: Number(item.unitCost || 0),
        stock: Number(item.stock || 0),
        minimumStock: Number(item.minimumStock || 0),
        observations: item.observations,
        active: item.active,
      });
    }
  }, [open, item, form]);

  const handleSubmit = async (values: any) => {
    if (!item) return;
    try {
      setLoading(true);
      await warehouseApi.updateItem(item.id, {
        name: values.name,
        brand: values.brand || undefined,
        unitOfMeasure: values.unitOfMeasure,
        weightOrSize: values.weightOrSize || undefined,
        unitCost: values.unitCost,
        stock: values.stock,
        minimumStock: values.minimumStock,
        observations: values.observations || undefined,
        active: values.active,
      });
      message.success('Articulo actualizado exitosamente');
      form.resetFields();
      onClose(true);
    } catch (error: any) {
      message.error(
        error.response?.data?.message || 'Error al actualizar el articulo'
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
      title={`Editar Articulo - ${item?.name || ''}`}
      open={open}
      onCancel={handleCancel}
      onOk={() => form.submit()}
      confirmLoading={loading}
      okText="Guardar"
      cancelText="Cancelar"
      destroyOnClose
      width={isMobile ? 'calc(100vw - 24px)' : 600}
      centered
      styles={{
        body: {
          maxHeight: isMobile ? 'calc(100vh - 200px)' : 'calc(100vh - 300px)',
          overflowY: 'auto',
        },
      }}
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
            placeholder="Nombre del articulo"
            size={isMobile ? 'large' : 'middle'}
          />
        </Form.Item>

        <Form.Item
          label="Marca"
          name="brand"
        >
          <Input
            placeholder="Marca (opcional)"
            size={isMobile ? 'large' : 'middle'}
          />
        </Form.Item>

        <Form.Item
          label="Unidad de Medida"
          name="unitOfMeasure"
          rules={[{ required: true, message: 'La unidad de medida es requerida' }]}
        >
          <Select
            placeholder="Selecciona una unidad de medida"
            options={UNIT_OF_MEASURE_OPTIONS}
            size={isMobile ? 'large' : 'middle'}
          />
        </Form.Item>

        <Form.Item
          label="Peso / Tamano"
          name="weightOrSize"
        >
          <Input
            placeholder="Ej: 500g, 1m, 2L (opcional)"
            size={isMobile ? 'large' : 'middle'}
          />
        </Form.Item>

        <Form.Item
          label="Costo Unitario"
          name="unitCost"
          rules={[{ required: true, message: 'El costo unitario es requerido' }]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            placeholder="0"
            formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as any}
            size={isMobile ? 'large' : 'middle'}
          />
        </Form.Item>

        <Form.Item
          label="Stock Actual"
          name="stock"
          rules={[{ required: true, message: 'El stock es requerido' }]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            placeholder="0"
            size={isMobile ? 'large' : 'middle'}
          />
        </Form.Item>

        <Form.Item
          label="Stock Minimo"
          name="minimumStock"
          rules={[{ required: true, message: 'El stock minimo es requerido' }]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            placeholder="0"
            size={isMobile ? 'large' : 'middle'}
          />
        </Form.Item>

        <Form.Item
          label="Observaciones"
          name="observations"
        >
          <Input.TextArea
            rows={3}
            placeholder="Observaciones (opcional)"
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

export default EditItemModal;
