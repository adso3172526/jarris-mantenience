import React, { useEffect, useState } from 'react';
import { Modal, Select, message, Typography } from 'antd';
import { assetsApi, workOrdersApi } from '../../services/api';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workOrderId: string;
  locationId: string;
  currentAssetId?: string;
}

const ChangeAssetModal: React.FC<Props> = ({ open, onClose, onSuccess, workOrderId, locationId, currentAssetId }) => {
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | undefined>(currentAssetId);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && locationId) {
      assetsApi.getByLocation(locationId).then((res) => {
        setAssets(res.data.filter((a: any) => a.status === 'ACTIVO'));
      }).catch(() => message.error('Error al cargar activos'));
      setSelectedAssetId(currentAssetId);
    }
  }, [open, locationId, currentAssetId]);

  const handleConfirm = async () => {
    if (!selectedAssetId) {
      message.warning('Selecciona un activo');
      return;
    }
    try {
      setLoading(true);
      await workOrdersApi.changeAsset(workOrderId, selectedAssetId);
      message.success('Activo actualizado exitosamente');
      onSuccess();
      onClose();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al cambiar el activo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Cambiar Activo"
      open={open}
      onCancel={onClose}
      onOk={handleConfirm}
      okText="Confirmar"
      cancelText="Cancelar"
      confirmLoading={loading}
    >
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
        Selecciona el activo correcto para esta orden de trabajo.
      </Typography.Text>
      <Select
        showSearch
        style={{ width: '100%' }}
        placeholder="Buscar activo por código o descripción"
        value={selectedAssetId}
        onChange={setSelectedAssetId}
        optionFilterProp="label"
        options={assets.map((a) => ({
          value: a.id,
          label: `${a.code} — ${a.description}`,
        }))}
      />
    </Modal>
  );
};

export default ChangeAssetModal;