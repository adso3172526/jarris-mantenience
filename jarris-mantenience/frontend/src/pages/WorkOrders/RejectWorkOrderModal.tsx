import React, { useState } from 'react';
import { Modal, Form, Input, message, Alert } from 'antd';
import { workOrdersApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface RejectWorkOrderModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workOrder: any;
}

const RejectWorkOrderModal: React.FC<RejectWorkOrderModalProps> = ({
  open,
  onClose,
  onSuccess,
  workOrder,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      const data = {
        rejectionReason: values.rejectionReason,
        rejectedBy: user?.email || 'Jefe',
      };
      
      await workOrdersApi.reject(workOrder.id, data);
      message.success('Solicitud rechazada');
      message.info('Se ha enviado un email al PDV informando el rechazo');
      
      form.resetFields();
      onSuccess();
      onClose();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al rechazar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`Rechazar Solicitud - ${workOrder.id.substring(0, 8)}`}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      width={600}
      okText="Rechazar Solicitud"
      cancelText="Cancelar"
      okButtonProps={{ danger: true }}
    >
      <Alert
        message="¿Está seguro que desea rechazar esta solicitud?"
        description={
          <div>
            <p>
              <strong>{workOrder.asset ? 'Equipo:' : 'Tipo:'}</strong>{' '}
              {workOrder.asset 
                ? `${workOrder.asset.code} - ${workOrder.asset.description}` 
                : `Mantenimiento Locativo - ${workOrder.locativeCategory || ''}`}
            </p>
            <p><strong>Ubicación:</strong> {workOrder.location.name}</p>
            <p><strong>Solicitud:</strong> {workOrder.title}</p>
            <p style={{ marginTop: 12, color: '#ff4d4f' }}>
              Al rechazar, la OT se cerrará automáticamente y se enviará un email al PDV con el motivo.
            </p>
          </div>
        }
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          label="Motivo del rechazo"
          name="rejectionReason"
          rules={[
            { required: true, message: 'El motivo es requerido' },
            { min: 10, message: 'Mínimo 10 caracteres' },
          ]}
        >
          <Input.TextArea
            rows={4}
            placeholder="Ejemplo: El equipo no requiere mantenimiento en este momento..."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default RejectWorkOrderModal;
