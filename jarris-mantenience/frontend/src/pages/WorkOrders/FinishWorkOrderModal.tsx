import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, message, Upload, Button } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import { workOrdersApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface FinishWorkOrderModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workOrder: any;
}

const FinishWorkOrderModal: React.FC<FinishWorkOrderModalProps> = ({
  open,
  onClose,
  onSuccess,
  workOrder,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [invoiceFile, setInvoiceFile] = useState<UploadFile | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const { user, hasRole } = useAuth();
  
  const isContratista = hasRole('CONTRATISTA');
  const isTecnico = hasRole('TECNICO_INTERNO');

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      // Finalizar la OT
      const data = {
        workDoneDescription: values.workDoneDescription,
        cost: values.cost || 0,
        finishedBy: user?.email || 'Usuario',
      };
      
      await workOrdersApi.finish(workOrder.id, data);

      // Subir factura SI existe (opcional para técnico, obligatorio para contratista)
      if (invoiceFile?.originFileObj) {
        const formData = new FormData();
        formData.append('file', invoiceFile.originFileObj);
        formData.append('uploadedBy', user?.email || '');

        try {
          await workOrdersApi.uploadInvoice(workOrder.id, formData);
          message.success('OT finalizada y factura subida exitosamente');
        } catch (error) {
          message.warning('OT finalizada, pero hubo un error al subir la factura');
        }
      } else {
        message.success('OT finalizada exitosamente');
      }
      
      form.resetFields();
      setInvoiceFile(null);
      onSuccess();
      onClose();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al finalizar');
    } finally {
      setLoading(false);
    }
  };

  const uploadProps = {
    maxCount: 1,
    fileList: invoiceFile ? [invoiceFile] : [],
    beforeUpload: (file: File) => {
      // Validar formato
      const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowed.includes(file.type)) {
        message.error('Solo se permiten archivos PDF, JPG o PNG');
        return false;
      }

      // Validar tamaño
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('El archivo debe ser menor a 10MB');
        return false;
      }

      const uploadFile: UploadFile = {
        uid: `${Date.now()}`,
        name: file.name,
        status: 'done',
        originFileObj: file,
      };

      setInvoiceFile(uploadFile);
      return false;
    },
    onRemove: () => {
      setInvoiceFile(null);
    },
  };

  return (
    <Modal
      title={`Finalizar OT - ${workOrder.id.substring(0, 8)}`}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      okText="Finalizar"
      cancelText="Cancelar"
      width={isMobile ? '100%' : 600}
      style={isMobile ? { top: 0, paddingBottom: 0, maxHeight: '100vh' } : {}}
      bodyStyle={isMobile ? { 
        maxHeight: 'calc(100vh - 110px)', 
        overflowY: 'auto',
        padding: '16px'
      } : {}}
    >
      {/* Info de la OT */}
      <div style={{ 
        marginBottom: 16, 
        padding: isMobile ? 10 : 12, 
        background: '#f0f2f5', 
        borderRadius: 4,
        fontSize: isMobile ? 13 : 14
      }}>
        <p style={{ margin: 0, marginBottom: 4 }}>
          <strong>{workOrder.asset ? 'Equipo:' : 'Tipo:'}</strong>{' '}
          {workOrder.asset 
            ? `${workOrder.asset.code} - ${workOrder.asset.description}` 
            : `Locativo - ${workOrder.locativeCategory?.name || ''}`}
        </p>
        <p style={{ margin: 0 }}>
          <strong>Ubicación:</strong> {workOrder.location.name}
        </p>
      </div>

      <Form 
        form={form} 
        layout="vertical" 
        onFinish={handleSubmit}
        requiredMark={!isMobile}
      >
        <Form.Item
          label="Descripción del trabajo realizado"
          name="workDoneDescription"
          rules={[
            { required: true, message: 'La descripción es requerida' },
            { min: 10, message: 'Mínimo 10 caracteres' },
          ]}
          style={{ marginBottom: isMobile ? 16 : 24 }}
        >
          <Input.TextArea
            rows={isMobile ? 3 : 4}
            placeholder="Describe detalladamente el trabajo realizado..."
            style={{ fontSize: isMobile ? 14 : 14 }}
            autoSize={isMobile ? { minRows: 3, maxRows: 6 } : undefined}
          />
        </Form.Item>

        <Form.Item
          label="Costo del trabajo"
          name="cost"
          rules={[{ required: true, message: 'El costo es requerido' }]}
          style={{ marginBottom: isMobile ? 16 : 24 }}
        >
          <InputNumber
            style={{ 
              width: '100%',
              fontSize: isMobile ? 16 : 14
            }}
            size={isMobile ? "large" : "middle"}
            min={0}
            prefix="$"
            formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={value => value!.replace(/\$\s?|(,*)/g, '')}
            placeholder="0"
          />
        </Form.Item>

        <Form.Item
          label={
            <span style={{ fontSize: isMobile ? 14 : 14 }}>
              Factura (PDF o Imagen) - OPCIONAL
            </span>
          }
          help={
            'Opcional: Puedes adjuntar la factura si la tienes disponible'
          }
          style={{ marginBottom: isMobile ? 12 : 24 }}
        >
          <Upload {...uploadProps}>
            <Button 
              icon={<UploadOutlined />}
              size={isMobile ? "large" : "middle"}
              block={isMobile}
              style={{ fontSize: isMobile ? 14 : 14 }}
            >
              {invoiceFile ? 'Cambiar factura' : 'Subir factura'}
            </Button>
          </Upload>
          {invoiceFile && (
            <div style={{ 
              marginTop: 8, 
              color: '#52c41a',
              fontSize: isMobile ? 12 : 13,
              wordBreak: 'break-word'
            }}>
              ✓ Factura seleccionada: {invoiceFile.name}
            </div>
          )}
        </Form.Item>
      </Form>

      {/* Información adicional */}
    </Modal>
  );
};

export default FinishWorkOrderModal;
