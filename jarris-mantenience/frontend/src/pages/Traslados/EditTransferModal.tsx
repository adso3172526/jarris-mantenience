import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, Input, InputNumber, Button, Alert, message } from 'antd';
import { assetEventsApi } from '../../services/api';

interface EditTransferModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  event: any;
  locations: any[];
}

const EditTransferModal: React.FC<EditTransferModalProps> = ({
  open,
  onClose,
  onSuccess,
  event,
  locations,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    if (open && event) {
      form.setFieldsValue({
        toLocationId: event.toLocation?.id || undefined,
        description: event.description,
        cost: Number(event.cost || 0),
      });
    }
  }, [open, event, form]);

  // Construir opciones del Select: excluir origen, incluir destino actual si no está en la lista
  const filteredLocations = locations.filter((loc: any) => loc.id !== event?.fromLocation?.id);
  const currentToInList = event?.toLocation?.id && filteredLocations.some((loc: any) => loc.id === event.toLocation.id);
  const selectOptions = [...filteredLocations];
  if (event?.toLocation?.id && !currentToInList) {
    selectOptions.unshift({ id: event.toLocation.id, name: event.toLocation.name || 'Ubicación no disponible' });
  }

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      await assetEventsApi.editTransfer(event.id, values);
      message.success('Traslado actualizado exitosamente');
      form.resetFields();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error al editar traslado:', error);
      message.error(error.response?.data?.message || 'Error al editar traslado');
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
      title={`Editar Traslado - ${event?.asset?.code || ''}`}
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={isMobile ? 'calc(100vw - 24px)' : 550}
      centered
      styles={{
        body: {
          maxHeight: isMobile ? 'calc(100vh - 200px)' : 'calc(100vh - 300px)',
          overflowY: 'auto',
        },
      }}
    >
      <Alert
        type="warning"
        message="Si cambia el destino, se actualizará también la ubicación actual del activo."
        style={{ marginBottom: 16 }}
        showIcon
      />

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item label="Origen">
          <Input
            value={event?.fromLocation?.name || 'Sin origen'}
            disabled
            size={isMobile ? 'large' : 'middle'}
          />
        </Form.Item>

        <Form.Item
          label="Destino"
          name="toLocationId"
          rules={[{ required: true, message: 'Seleccione destino' }]}
        >
          <Select
            showSearch
            optionFilterProp="children"
            placeholder="Seleccionar destino"
            size={isMobile ? 'large' : 'middle'}
          >
            {selectOptions.map((loc: any) => (
              <Select.Option key={loc.id} value={loc.id}>
                {loc.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="Descripción" name="description">
          <Input.TextArea rows={3} size={isMobile ? 'large' : 'middle'} />
        </Form.Item>

        <Form.Item label="Costo" name="cost">
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
            size={isMobile ? 'large' : 'middle'}
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={handleCancel} size={isMobile ? 'large' : 'middle'}>
              Cancelar
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size={isMobile ? 'large' : 'middle'}
            >
              Guardar
            </Button>
          </div>
        </Form.Item>
      </Form>

    </Modal>
  );
};

export default EditTransferModal;
