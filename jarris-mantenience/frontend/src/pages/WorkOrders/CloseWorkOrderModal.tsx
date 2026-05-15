import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, message, Alert, InputNumber, Button, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { workOrdersApi, warehouseApi } from '../../services/api';
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

  // Consumption state
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [warehouseItems, setWarehouseItems] = useState<any[]>([]);
  const [consumptionLines, setConsumptionLines] = useState<{ itemId: string; quantity: number; itemName?: string; unitCost?: number }[]>([]);
  const [hasExistingConsumption, setHasExistingConsumption] = useState(false);
  const [consumptionEdited, setConsumptionEdited] = useState(false);

  // Load consumption data and warehouses when modal opens
  useEffect(() => {
    if (open && workOrder?.id) {
      warehouseApi.getAll()
        .then((res) => setWarehouses(res.data))
        .catch(() => setWarehouses([]));

      // Load existing consumption
      warehouseApi.getConsumption(workOrder.id)
        .then((res) => {
          if (res.data && res.data.length > 0) {
            setHasExistingConsumption(true);
            setConsumptionLines(res.data.map((m: any) => ({
              itemId: m.itemId,
              quantity: Number(m.quantity),
              itemName: m.item?.name,
              unitCost: Number(m.unitCostAtTime),
            })));
            const whId = res.data[0].warehouseId;
            setSelectedWarehouseId(whId);
            warehouseApi.getItems(whId).then(r => setWarehouseItems(r.data)).catch(() => {});
          } else {
            setHasExistingConsumption(false);
          }
        })
        .catch(() => {});
    }
    if (!open) {
      setWarehouses([]);
      setSelectedWarehouseId('');
      setWarehouseItems([]);
      setConsumptionLines([]);
      setHasExistingConsumption(false);
      setConsumptionEdited(false);
    }
  }, [open, workOrder]);

  // Load items when warehouse changes (manual selection)
  useEffect(() => {
    if (selectedWarehouseId && !hasExistingConsumption) {
      warehouseApi.getItems(selectedWarehouseId)
        .then((res) => setWarehouseItems(res.data))
        .catch(() => setWarehouseItems([]));
      setConsumptionLines([]);
    }
  }, [selectedWarehouseId, hasExistingConsumption]);

  const materialCostTotal = consumptionLines.reduce((sum, line) => {
    const item = warehouseItems.find((i: any) => i.id === line.itemId);
    const cost = line.unitCost || (item ? Number(item.unitCost) : 0);
    return sum + cost * (line.quantity || 0);
  }, 0);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);

      // Update consumption if edited
      if (consumptionEdited && selectedWarehouseId) {
        const validLines = consumptionLines.filter(l => l.itemId && l.quantity > 0);
        try {
          await warehouseApi.updateConsumption(workOrder.id, {
            warehouseId: selectedWarehouseId,
            workOrderId: workOrder.id,
            lines: validLines,
            createdBy: user?.email || '',
          });
        } catch (err: any) {
          message.warning(err.response?.data?.message || 'Error al actualizar consumo de materiales');
        }
      }

      const data = {
        ...values,
        closedBy: user?.email || 'Jefe Mantenimiento',
      };

      await workOrdersApi.close(workOrder.id, data);
      message.success('Orden de trabajo cerrada exitosamente');
      if (workOrder.asset) {
        message.info('Se ha creado automáticamente un evento en el historial del activo');
      }

      form.resetFields();
      onSuccess();
      onClose();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al cerrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`Cerrar OT - ${workOrder.id.substring(0, 8)}`}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      width={700}
      okText="Cerrar OT"
      cancelText="Cancelar"
    >
      <Alert
        message="Información del Trabajo"
        description={
          <div>
            <p>
              <strong>{workOrder.asset ? 'Equipo:' : 'Tipo:'}</strong>{' '}
              {workOrder.asset
                ? `${workOrder.asset.code} - ${workOrder.asset.description}`
                : `Locativo - ${workOrder.locativeCategory?.name || ''}`}
            </p>
            <p><strong>Trabajo realizado:</strong> {workOrder.workDoneDescription}</p>
            <p><strong>Costo trabajo:</strong> ${Number(workOrder.cost).toLocaleString('es-CO')}</p>
            {workOrder.invoiceFilePath && (
              <p><strong>Factura:</strong> {workOrder.invoiceFileName}</p>
            )}
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      {/* Consumption section */}
      {(hasExistingConsumption || warehouses.length > 0) && (
        <>
          <Divider style={{ margin: '12px 0' }}>Materiales Consumidos</Divider>
          <div style={{ marginBottom: 16 }}>
            <Select
              style={{ width: '100%', marginBottom: 12 }}
              placeholder="Seleccione almacén"
              value={selectedWarehouseId || undefined}
              onChange={(val) => {
                setSelectedWarehouseId(val || '');
                if (!hasExistingConsumption) {
                  setConsumptionLines([]);
                }
                setConsumptionEdited(true);
              }}
              options={warehouses.map((w: any) => ({ label: w.name, value: w.id }))}
              allowClear
            />
            {consumptionLines.map((line, idx) => {
              const item = warehouseItems.find((i: any) => i.id === line.itemId);
              const cost = line.unitCost || (item ? Number(item.unitCost) : 0);
              return (
                <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Select
                    style={{ flex: 1, minWidth: 150 }}
                    placeholder="Buscar item..."
                    value={line.itemId || undefined}
                    onChange={(val) => {
                      const newLines = [...consumptionLines];
                      newLines[idx] = { ...newLines[idx], itemId: val, unitCost: undefined };
                      setConsumptionLines(newLines);
                      setConsumptionEdited(true);
                    }}
                    options={warehouseItems.map((i: any) => ({
                      label: `${i.name}${i.brand ? ` - ${i.brand}` : ''} (Stock: ${Number(i.stock).toLocaleString('es-CO')})`,
                      value: i.id,
                    }))}
                    showSearch
                    filterOption={(input, option) =>
                      (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                  />
                  <InputNumber
                    style={{ width: 100 }}
                    placeholder="Cant."
                    min={0.0001}
                    max={item ? Number(item.stock) + (line.quantity || 0) : undefined}
                    value={line.quantity}
                    onChange={(val) => {
                      const newLines = [...consumptionLines];
                      newLines[idx] = { ...newLines[idx], quantity: val || 0 };
                      setConsumptionLines(newLines);
                      setConsumptionEdited(true);
                    }}
                  />
                  <span style={{ fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>
                    ${cost.toLocaleString('es-CO')} c/u = ${(cost * (line.quantity || 0)).toLocaleString('es-CO')}
                  </span>
                  <Button
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      setConsumptionLines(consumptionLines.filter((_, i) => i !== idx));
                      setConsumptionEdited(true);
                    }}
                  />
                </div>
              );
            })}
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() => {
                setConsumptionLines([...consumptionLines, { itemId: '', quantity: 0 }]);
                setConsumptionEdited(true);
              }}
              size="small"
              block
            >
              Agregar item
            </Button>

            {consumptionLines.length > 0 && (
              <div style={{ marginTop: 12, padding: 8, background: '#f6ffed', borderRadius: 4, display: 'flex', justifyContent: 'space-between' }}>
                <span>Costo trabajo: ${Number(workOrder.cost).toLocaleString('es-CO')}</span>
                <span>Costo materiales: ${materialCostTotal.toLocaleString('es-CO')}</span>
                <strong>Total: ${(Number(workOrder.cost) + materialCostTotal).toLocaleString('es-CO')}</strong>
              </div>
            )}
          </div>
        </>
      )}

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
          Al cerrar la OT se creará automáticamente un evento en el historial del activo con el costo y la descripción del trabajo realizado.
          {consumptionEdited && ' Los cambios en el consumo de materiales se aplicarán al cerrar.'}
        </p>
      </div>
    </Modal>
  );
};

export default CloseWorkOrderModal;
