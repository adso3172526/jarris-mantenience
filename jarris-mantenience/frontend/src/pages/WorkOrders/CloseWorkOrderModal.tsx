import React, { useState } from 'react';
import { Modal, Form, Input, Select, message, Alert } from 'antd';
import { workOrdersApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface CloseWorkOrderModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workOrder: any;
}

const CloseWorkOrderModal: React.FC<CloseWorkOrderModalProps> = ({
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
        ...values,
        closedBy: user?.email || 'Jefe Mantenimiento',
      };
      
      await workOrdersApi.close(workOrder.id, data);
      message.success('Orden de trabajo cerrada exitosamente');
      message.info('Se ha creado automáticamente un evento en el historial del activo');
      
      form.resetFields();
      onSuccess();
      onClose();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al cerrar');
    } finally {
      setLoading(false);
    }
  };

  const needsInvoice = workOrder.assigneeType === 'CONTRATISTA' && !workOrder.invoiceFilePath;

  return (
    <Modal
      title={`Cerrar OT - ${workOrder.id.substring(0, 8)}`}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      width={600}
      okText="Cerrar OT"
      cancelText="Cancelar"
    >
      {needsInvoice && (
        <Alert
          message="Falta factura"
          description="Esta OT fue asignada a un contratista pero aún no se ha subido la factura. No podrás cerrarla hasta que el contratista suba la factura."
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Alert
        message="Información del Trabajo"
        description={
          <div>
            <p>
              <strong>{workOrder.asset ? 'Equipo:' : 'Tipo:'}</strong>{' '}
              {workOrder.asset 
                ? `${workOrder.asset.code} - ${workOrder.asset.description}` 
                : `Mantenimiento Locativo - ${workOrder.locativeCategory || ''}`}
            </p>
            <p><strong>Trabajo realizado:</strong> {workOrder.workDoneDescription}</p>
            <p><strong>Costo:</strong> ${workOrder.cost.toLocaleString()}</p>
            {workOrder.invoiceFilePath && (
              <p><strong>Factura:</strong> ✅ {workOrder.invoiceFileName}</p>
            )}
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ eventType: 'MANTENIMIENTO' }}
      >
        <Form.Item
          label="Tipo de Evento"
          name="eventType"
          rules={[{ required: true, message: 'Tipo requerido' }]}
        >
          <Select>
            <Select.Option value="MANTENIMIENTO">Mantenimiento</Select.Option>
            <Select.Option value="REPARACION">Reparación</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="Descripción del evento (opcional)"
          name="eventDescription"
        >
          <Input.TextArea
            rows={3}
            placeholder="Descripción adicional para el historial del activo..."
          />
        </Form.Item>
      </Form>

      <div style={{ marginTop: 16, padding: 12, background: '#fff7e6', borderRadius: 4 }}>
        <p style={{ margin: 0, fontSize: 12 }}>
          ℹ️ Al cerrar la OT se creará automáticamente un evento en el historial del activo con el costo y la descripción del trabajo realizado.
        </p>
      </div>
    </Modal>
  );
};

export default CloseWorkOrderModal;
