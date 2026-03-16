import React, { useState } from 'react';
import { Modal, Form, Input, Button, Alert, Descriptions, message } from 'antd';
import dayjs from 'dayjs';
import { useAuth } from '../../contexts/AuthContext';
import { assetEventsApi } from '../../services/api';

interface VoidTransferModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  event: any;
}

const formatCOP = (value: number) => {
  return `$${Math.round(value).toLocaleString('es-CO')}`;
};

const VoidTransferModal: React.FC<VoidTransferModalProps> = ({
  open,
  onClose,
  onSuccess,
  event,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isMobile] = useState(window.innerWidth <= 768);
  const { user } = useAuth();

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      await assetEventsApi.voidTransfer(event.id, {
        voidedBy: user?.email,
        reason: values.reason,
      });
      message.success('Traslado anulado exitosamente');
      form.resetFields();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error al anular traslado:', error);
      message.error(error.response?.data?.message || 'Error al anular traslado');
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
      title="Anular Traslado"
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={isMobile ? 'calc(100vw - 24px)' : 500}
      centered
    >
      <Alert
        type="error"
        message={`Al anular este traslado, el activo ${event?.asset?.code || ''} será reubicado de vuelta a "${event?.fromLocation?.name || 'origen'}".`}
        style={{ marginBottom: 16 }}
        showIcon
      />

      <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Activo">
          {event?.asset?.code} - {event?.asset?.description}
        </Descriptions.Item>
        <Descriptions.Item label="Origen">
          {event?.fromLocation?.name || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Destino">
          {event?.toLocation?.name || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Fecha">
          {event?.createdAt ? dayjs(event.createdAt).format('DD/MM/YYYY HH:mm') : '-'}
        </Descriptions.Item>
        {Number(event?.cost || 0) > 0 && (
          <Descriptions.Item label="Costo">
            {formatCOP(Number(event.cost))}
          </Descriptions.Item>
        )}
      </Descriptions>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          label="Motivo de anulación"
          name="reason"
          rules={[{ required: true, message: 'Ingrese el motivo de anulación' }]}
        >
          <Input.TextArea
            rows={3}
            placeholder="Describa el motivo de la anulación..."
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
              danger
              htmlType="submit"
              loading={loading}
              size={isMobile ? 'large' : 'middle'}
            >
              Anular Traslado
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default VoidTransferModal;
