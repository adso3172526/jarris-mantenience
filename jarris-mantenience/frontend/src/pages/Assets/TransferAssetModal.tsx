import React, { useState } from 'react';
import { Modal, Form, Select, Input, Button, message, InputNumber } from 'antd';
import { assetsApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface TransferAssetModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  asset: any;
  locations: any[];
}

const TransferAssetModal: React.FC<TransferAssetModalProps> = ({
  open,
  onClose,
  onSuccess,
  asset,
  locations,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      await assetsApi.transfer(asset.id, {
        toLocationId: values.toLocationId,
        description: values.description,
        cost: values.cost || 0,
        createdBy: user?.email || '',
      });
      message.success('Activo transferido exitosamente');
      form.resetFields();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error al trasladar:', error);
      message.error(error.response?.data?.message || 'Error al trasladar activo');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  // Filtrar la ubicación actual
  const availableLocations = locations.filter(
    (loc) => loc.id !== asset?.location?.id
  );

  return (
    <Modal
      title={`Trasladar Activo - ${asset?.code}`}
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={600}
    >
      <div style={{ 
        marginBottom: 16, 
        padding: 12, 
        background: '#e6f7ff', 
        borderRadius: 8,
        border: '1px solid #91d5ff'
      }}>
        <p style={{ margin: 0, fontSize: 13 }}>
          <strong>Equipo:</strong> {asset?.description}
        </p>
        <p style={{ margin: '4px 0 0 0', fontSize: 13 }}>
          <strong>Ubicación actual:</strong> {asset?.location?.name}
        </p>
      </div>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="toLocationId"
          label="Nueva ubicación"
          rules={[{ required: true, message: 'Selecciona la nueva ubicación' }]}
        >
          <Select
            placeholder="Selecciona una ubicación"
            showSearch
            optionFilterProp="children"
            size="large"
          >
            {availableLocations.map((location) => (
              <Select.Option key={location.id} value={location.id}>
                {location.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="cost"
          label="Costo del Envío (Opcional)"
          tooltip="Incluye gastos de transporte, logística, embalaje, etc."
        >
          <InputNumber
            prefix="$"
            style={{ width: '100%' }}
            size="large"
            min={0}
            placeholder="0"
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
          />
        </Form.Item>

        <Form.Item
          name="description"
          label="Descripción del traslado"
          tooltip="Motivo o detalles adicionales de la transferencia"
        >
          <Input.TextArea
            rows={3}
            placeholder="Ej: Traslado para mantenimiento preventivo"
            maxLength={500}
            showCount
          />
        </Form.Item>

        <div style={{
          marginTop: 16,
          padding: 12,
          background: '#fffbe6',
          border: '1px solid #ffe58f',
          borderRadius: 8,
          fontSize: 12,
          color: '#666'
        }}>
          ℹ️ Esta acción generará automáticamente un evento de TRASLADO en el historial del activo.
        </div>

        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={handleCancel} size="large">
              Cancelar
            </Button>
            <Button type="primary" htmlType="submit" loading={loading} size="large">
              Trasladar
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default TransferAssetModal;
