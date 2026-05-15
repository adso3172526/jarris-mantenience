import React, { useState } from 'react';
import { Modal, Form, Select, InputNumber, Input, message } from 'antd';
import { warehouseApi } from '../../services/api';

interface StockEntryModalProps {
  open: boolean;
  onClose: (reload?: boolean) => void;
  items: any[];
  userEmail: string;
}

const StockEntryModal: React.FC<StockEntryModalProps> = ({
  open,
  onClose,
  items,
  userEmail,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isMobile] = useState(window.innerWidth < 768);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const handleItemChange = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    setSelectedItem(item || null);
  };

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      await warehouseApi.addStockEntry({
        itemId: values.itemId,
        quantity: values.quantity,
        unitCost: values.unitCost || undefined,
        observation: values.observation || undefined,
        createdBy: userEmail,
      });
      message.success('Ingreso de stock registrado exitosamente');
      form.resetFields();
      setSelectedItem(null);
      onClose(true);
    } catch (error: any) {
      message.error(
        error.response?.data?.message || 'Error al registrar el ingreso de stock'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedItem(null);
    onClose();
  };

  return (
    <Modal
      title="Ingreso de Stock"
      open={open}
      onCancel={handleCancel}
      onOk={() => form.submit()}
      confirmLoading={loading}
      okText="Registrar Ingreso"
      cancelText="Cancelar"
      destroyOnClose
      width={isMobile ? 'calc(100vw - 24px)' : 550}
      centered
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          label="Articulo"
          name="itemId"
          rules={[{ required: true, message: 'Selecciona un articulo' }]}
        >
          <Select
            placeholder="Selecciona un articulo"
            showSearch
            optionFilterProp="children"
            onChange={handleItemChange}
            size={isMobile ? 'large' : 'middle'}
          >
            {items.map((item) => (
              <Select.Option key={item.id} value={item.id}>
                {item.name} (Stock actual: {Number(item.currentStock || 0)})
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label="Cantidad"
          name="quantity"
          rules={[
            { required: true, message: 'La cantidad es requerida' },
            {
              type: 'number',
              min: 0.0001,
              message: 'La cantidad debe ser mayor a 0',
            },
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0.0001}
            step={1}
            placeholder="Cantidad a ingresar"
            size={isMobile ? 'large' : 'middle'}
          />
        </Form.Item>

        <Form.Item
          label="Costo Unitario"
          name="unitCost"
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            placeholder={
              selectedItem
                ? `Costo actual: $${Number(selectedItem.unitCost || 0).toLocaleString()}`
                : 'Costo unitario (opcional)'
            }
            formatter={(value) =>
              value ? `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''
            }
            parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as any}
            size={isMobile ? 'large' : 'middle'}
          />
        </Form.Item>

        <Form.Item
          label="Observacion"
          name="observation"
        >
          <Input.TextArea
            rows={3}
            placeholder="Observacion (opcional)"
            size={isMobile ? 'large' : 'middle'}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default StockEntryModal;
