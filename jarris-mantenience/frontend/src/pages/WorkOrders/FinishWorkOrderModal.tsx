import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, message, Upload, Button, Collapse, Select } from 'antd';
import { UploadOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import { workOrdersApi, warehouseApi } from '../../services/api';
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
  const { user } = useAuth();

  // Warehouse consumption
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [warehouseItems, setWarehouseItems] = useState<any[]>([]);
  const [consumptionLines, setConsumptionLines] = useState<{ itemId: string; quantity: number }[]>([]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load all warehouses when modal opens
  useEffect(() => {
    if (open) {
      warehouseApi.getAll()
        .then((res) => setWarehouses(res.data))
        .catch(() => setWarehouses([]));
    }
    if (!open) {
      setWarehouses([]);
      setSelectedWarehouseId('');
      setWarehouseItems([]);
      setConsumptionLines([]);
    }
  }, [open]);

  // Load items when warehouse is selected
  useEffect(() => {
    if (selectedWarehouseId) {
      warehouseApi.getItems(selectedWarehouseId)
        .then((res) => setWarehouseItems(res.data))
        .catch(() => setWarehouseItems([]));
    } else {
      setWarehouseItems([]);
    }
    setConsumptionLines([]);
  }, [selectedWarehouseId]);

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

      // Consumir materiales si hay líneas
      const validLines = consumptionLines.filter(l => l.itemId && l.quantity > 0);
      if (validLines.length > 0 && selectedWarehouseId) {
        try {
          await warehouseApi.consumeItems({
            warehouseId: selectedWarehouseId,
            workOrderId: workOrder.id,
            lines: validLines,
            createdBy: user?.email || '',
          });
        } catch (err: any) {
          message.warning(err.response?.data?.message || 'OT finalizada, pero hubo un error al registrar consumo de materiales');
        }
      }

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
        originFileObj: file as any,
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
            parser={value => value!.replace(/\$\s?|(,*)/g, '') as any}
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

      {/* Material Consumption Section */}
      {warehouses.length > 0 && (
        <Collapse
          ghost
          style={{ marginTop: 8 }}
          items={[{
            key: 'consumption',
            label: <span style={{ fontWeight: 500 }}>Consumo de materiales (opcional)</span>,
            children: (
              <div>
                <Select
                  style={{ width: '100%', marginBottom: 12 }}
                  placeholder="Seleccione almacén"
                  value={selectedWarehouseId || undefined}
                  onChange={(val) => setSelectedWarehouseId(val || '')}
                  options={warehouses.map((w: any) => ({ label: w.name, value: w.id }))}
                  allowClear
                  size={isMobile ? 'large' : 'middle'}
                />
                {selectedWarehouseId && warehouseItems.length > 0 && (
                  <>
                    {consumptionLines.map((line, idx) => {
                      const selectedItem = warehouseItems.find((i: any) => i.id === line.itemId);
                      return (
                        <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <Select
                            style={{ flex: 1, minWidth: 150 }}
                            placeholder="Buscar item..."
                            value={line.itemId || undefined}
                            onChange={(val) => {
                              const newLines = [...consumptionLines];
                              newLines[idx] = { ...newLines[idx], itemId: val };
                              setConsumptionLines(newLines);
                            }}
                            options={warehouseItems.map((i: any) => ({
                              label: `${i.name}${i.brand ? ` - ${i.brand}` : ''} (Stock: ${Number(i.stock).toLocaleString('es-CO')})`,
                              value: i.id,
                            }))}
                            showSearch
                            filterOption={(input, option) =>
                              (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                            size={isMobile ? 'large' : 'middle'}
                          />
                          <InputNumber
                            style={{ width: 100 }}
                            placeholder="Cant."
                            min={0.0001}
                            max={selectedItem ? Number(selectedItem.stock) : undefined}
                            value={line.quantity}
                            onChange={(val) => {
                              const newLines = [...consumptionLines];
                              newLines[idx] = { ...newLines[idx], quantity: val || 0 };
                              setConsumptionLines(newLines);
                            }}
                            size={isMobile ? 'large' : 'middle'}
                          />
                          {selectedItem && (
                            <span style={{ fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>
                              ${Number(selectedItem.unitCost).toLocaleString('es-CO')} c/u = ${(Number(selectedItem.unitCost) * (line.quantity || 0)).toLocaleString('es-CO')}
                            </span>
                          )}
                          <Button
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => setConsumptionLines(consumptionLines.filter((_, i) => i !== idx))}
                          />
                        </div>
                      );
                    })}
                    <Button
                      type="dashed"
                      icon={<PlusOutlined />}
                      onClick={() => setConsumptionLines([...consumptionLines, { itemId: '', quantity: 0 }])}
                      size="small"
                      block
                    >
                      Agregar item
                    </Button>
                  </>
                )}
                {selectedWarehouseId && warehouseItems.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 12, color: '#888', fontSize: 13 }}>
                    Este almacén no tiene items
                  </div>
                )}
              </div>
            ),
          }]}
        />
      )}
    </Modal>
  );
};

export default FinishWorkOrderModal;
