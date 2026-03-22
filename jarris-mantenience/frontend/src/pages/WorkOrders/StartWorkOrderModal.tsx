import React, { useState, useEffect } from 'react';
import { Modal, message, Alert } from 'antd';
import { workOrdersApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface StartWorkOrderModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workOrder: any;
}

const StartWorkOrderModal: React.FC<StartWorkOrderModalProps> = ({
  open,
  onClose,
  onSuccess,
  workOrder,
}) => {
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const { user } = useAuth();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await workOrdersApi.start(workOrder.id, {
        startedBy: user?.email || 'Usuario',
      });
      message.success('Orden de trabajo iniciada');
      onSuccess();
      onClose();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al iniciar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Iniciar Orden de Trabajo"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText="Iniciar Trabajo"
      cancelText="Cancelar"
      width={isMobile ? '100%' : 520}
      style={isMobile ? { top: 20 } : {}}
    >
      <Alert
        message="¿Confirmar inicio de trabajo?"
        description={
          <div style={{ fontSize: isMobile ? 13 : 14 }}>
            <p style={{ marginBottom: 8 }}>
              <strong>OT:</strong> {workOrder.id.substring(0, 8)}
            </p>
            <p style={{ marginBottom: 8 }}>
              <strong>{workOrder.asset ? 'Equipo:' : 'Tipo:'}</strong>{' '}
              {workOrder.asset 
                ? `${workOrder.asset.code} - ${workOrder.asset.description}` 
                : `Mantenimiento Locativo - ${workOrder.locativeCategory?.name || ''}`}
            </p>
            <p style={{ marginBottom: 12 }}>
              <strong>Ubicación:</strong> {workOrder.location.name}
            </p>
            <p style={{ marginTop: 12, marginBottom: 0 }}>
              El estado cambiará a <strong>EN PROCESO</strong>.
            </p>
          </div>
        }
        type="info"
        showIcon
      />
    </Modal>
  );
};

export default StartWorkOrderModal;
