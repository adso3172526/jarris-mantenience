import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, message, Upload, Button, Tabs, Image, Divider, Select } from 'antd';
import { UploadOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import { workOrdersApi, warehouseApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface EditClosedWorkOrderModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workOrder: any;
}

const EditClosedWorkOrderModal: React.FC<EditClosedWorkOrderModalProps> = ({
  open,
  onClose,
  onSuccess,
  workOrder,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [invoiceFile, setInvoiceFile] = useState<UploadFile | null>(null);
  const [pdvPhotos, setPdvPhotos] = useState<UploadFile[]>([]);
  const [techPhotos, setTechPhotos] = useState<UploadFile[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const { user, hasPermission } = useAuth();

  // Consumption state
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [warehouseItems, setWarehouseItems] = useState<any[]>([]);
  const [consumptionLines, setConsumptionLines] = useState<{ itemId: string; quantity: number; itemName?: string; unitCost?: number }[]>([]);
  const [consumptionEdited, setConsumptionEdited] = useState(false);
  const canEditConsumption = hasPermission('EDITAR_CONSUMO_ALMACEN_OT');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (open && workOrder) {
      form.setFieldsValue({
        title: workOrder.title,
        requestDescription: workOrder.requestDescription,
        workDoneDescription: workOrder.workDoneDescription,
        cost: workOrder.cost,
      });
      setInvoiceFile(null);
      setPdvPhotos([]);
      setTechPhotos([]);

      // Load consumption data if user has permission
      if (canEditConsumption) {
        warehouseApi.getAll()
          .then((res) => setWarehouses(res.data))
          .catch(() => setWarehouses([]));

        warehouseApi.getConsumption(workOrder.id)
          .then((res) => {
            if (res.data && res.data.length > 0) {
              setConsumptionLines(res.data.map((m: any) => ({
                itemId: m.itemId,
                quantity: Number(m.quantity),
                itemName: m.item?.name,
                unitCost: Number(m.unitCostAtTime),
              })));
              const whId = res.data[0].warehouseId;
              setSelectedWarehouseId(whId);
              warehouseApi.getItems(whId).then(r => setWarehouseItems(r.data)).catch(() => {});
            }
          })
          .catch(() => {});
      }
    }
    if (!open) {
      setWarehouses([]);
      setSelectedWarehouseId('');
      setWarehouseItems([]);
      setConsumptionLines([]);
      setConsumptionEdited(false);
    }
  }, [open, workOrder, form]);

  // Load items when warehouse changes
  useEffect(() => {
    if (selectedWarehouseId) {
      warehouseApi.getItems(selectedWarehouseId)
        .then((res) => setWarehouseItems(res.data))
        .catch(() => setWarehouseItems([]));
    }
  }, [selectedWarehouseId]);

  const materialCostTotal = consumptionLines.reduce((sum, line) => {
    const item = warehouseItems.find((i: any) => i.id === line.itemId);
    const cost = line.unitCost || (item ? Number(item.unitCost) : 0);
    return sum + cost * (line.quantity || 0);
  }, 0);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);

      // 1. Actualizar datos básicos
      await workOrdersApi.editClosed(workOrder.id, values);

      // 2. Update consumption if edited
      if (consumptionEdited && selectedWarehouseId && canEditConsumption) {
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

      // 3. Reemplazar factura si hay una nueva
      if (invoiceFile?.originFileObj) {
        const formData = new FormData();
        formData.append('file', invoiceFile.originFileObj);
        formData.append('uploadedBy', user?.email || '');

        try {
          await workOrdersApi.replaceInvoice(workOrder.id, formData);
          message.success('Factura actualizada');
        } catch (error) {
          message.warning('Datos actualizados, pero error al actualizar factura');
        }
      }

      // 3. Reemplazar fotos PDV si hay nuevas
      if (pdvPhotos.length > 0) {
        const formData = new FormData();
        pdvPhotos.forEach((file) => {
          if (file.originFileObj) {
            formData.append('files', file.originFileObj);
          }
        });
        formData.append('uploadedBy', user?.email || '');
        formData.append('photoType', 'pdv');

        try {
          await workOrdersApi.replacePhotos(workOrder.id, formData);
          message.success('Fotos PDV actualizadas');
        } catch (error) {
          message.warning('Error al actualizar fotos PDV');
        }
      }

      // 4. Reemplazar fotos técnico si hay nuevas
      if (techPhotos.length > 0) {
        const formData = new FormData();
        techPhotos.forEach((file) => {
          if (file.originFileObj) {
            formData.append('files', file.originFileObj);
          }
        });
        formData.append('uploadedBy', user?.email || '');
        formData.append('photoType', 'technician');

        try {
          await workOrdersApi.replacePhotos(workOrder.id, formData);
          message.success('Fotos técnico actualizadas');
        } catch (error) {
          message.warning('Error al actualizar fotos técnico');
        }
      }

      message.success('Orden de trabajo actualizada exitosamente');
      form.resetFields();
      setInvoiceFile(null);
      setPdvPhotos([]);
      setTechPhotos([]);
      onSuccess();
      onClose();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al actualizar');
    } finally {
      setLoading(false);
    }
  };

  const invoiceUploadProps = {
    maxCount: 1,
    fileList: invoiceFile ? [invoiceFile] : [],
    beforeUpload: (file: File) => {
      const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowed.includes(file.type)) {
        message.error('Solo PDF, JPG o PNG');
        return false;
      }

      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('Debe ser menor a 10MB');
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
    onRemove: () => setInvoiceFile(null),
  };

  const pdvPhotosUploadProps = {
    maxCount: 2,
    fileList: pdvPhotos,
    beforeUpload: (file: File) => {
      const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowed.includes(file.type)) {
        message.error('Solo JPG o PNG');
        return false;
      }

      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error('Debe ser menor a 5MB');
        return false;
      }

      if (pdvPhotos.length >= 2) {
        message.error('Máximo 2 fotos');
        return false;
      }

      const uploadFile: UploadFile = {
        uid: `${Date.now()}-${file.name}`,
        name: file.name,
        status: 'done',
        originFileObj: file as any,
      };

      setPdvPhotos((prev) => [...prev, uploadFile]);
      return false;
    },
    onRemove: (file: UploadFile) => {
      setPdvPhotos((prev) => prev.filter((f) => f.uid !== file.uid));
    },
  };

  const techPhotosUploadProps = {
    maxCount: 2,
    fileList: techPhotos,
    beforeUpload: (file: File) => {
      const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowed.includes(file.type)) {
        message.error('Solo JPG o PNG');
        return false;
      }

      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error('Debe ser menor a 5MB');
        return false;
      }

      if (techPhotos.length >= 2) {
        message.error('Máximo 2 fotos');
        return false;
      }

      const uploadFile: UploadFile = {
        uid: `${Date.now()}-${file.name}`,
        name: file.name,
        status: 'done',
        originFileObj: file as any,
      };

      setTechPhotos((prev) => [...prev, uploadFile]);
      return false;
    },
    onRemove: (file: UploadFile) => {
      setTechPhotos((prev) => prev.filter((f) => f.uid !== file.uid));
    },
  };

  const tabItems = [
    {
      key: 'data',
      label: 'Datos',
      children: (
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Título de la Solicitud"
            name="title"
            rules={[{ required: true, message: 'Título requerido' }]}
          >
            <Input placeholder="Ej: Falla en motor" />
          </Form.Item>

          <Form.Item label="Descripción de la Solicitud (PDV)" name="requestDescription">
            <Input.TextArea rows={3} placeholder="Descripción original del PDV" />
          </Form.Item>

          <Form.Item label="Trabajo Realizado" name="workDoneDescription">
            <Input.TextArea rows={4} placeholder="Descripción del trabajo realizado" />
          </Form.Item>

          <Form.Item
            label="Costo"
            name="cost"
            rules={[{ required: true, message: 'Costo requerido' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as any}
              placeholder="0"
            />
          </Form.Item>
        </Form>
      ),
    },
    ...(canEditConsumption ? [{
      key: 'consumption',
      label: 'Consumo',
      children: (
        <div>
          <Select
            style={{ width: '100%', marginBottom: 12 }}
            placeholder="Seleccione almacén"
            value={selectedWarehouseId || undefined}
            onChange={(val: string) => {
              setSelectedWarehouseId(val || '');
              setConsumptionLines([]);
              setWarehouseItems([]);
              setConsumptionEdited(true);
            }}
            options={warehouses.map((w: any) => ({ label: w.name, value: w.id }))}
            allowClear
          />
          {selectedWarehouseId && consumptionLines.map((line, idx) => {
            const item = warehouseItems.find((i: any) => i.id === line.itemId);
            const cost = line.unitCost || (item ? Number(item.unitCost) : 0);
            return (
              <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <Select
                  style={{ flex: 1, minWidth: 150 }}
                  placeholder="Buscar item..."
                  value={line.itemId || undefined}
                  onChange={(val: string) => {
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
                  filterOption={(input: string, option: any) =>
                    (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
                <InputNumber
                  style={{ width: 100 }}
                  placeholder="Cant."
                  min={0.0001}
                  max={item ? Number(item.stock) + (line.quantity || 0) : undefined}
                  value={line.quantity}
                  onChange={(val: number | null) => {
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
          {selectedWarehouseId && (
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
          )}
          {consumptionLines.length > 0 && (
            <div style={{ marginTop: 12, padding: 8, background: '#f6ffed', borderRadius: 4, display: 'flex', justifyContent: 'space-between' }}>
              <span>Costo trabajo: ${Number(workOrder?.cost || 0).toLocaleString('es-CO')}</span>
              <span>Costo materiales: ${materialCostTotal.toLocaleString('es-CO')}</span>
              <strong>Total: ${(Number(workOrder?.cost || 0) + materialCostTotal).toLocaleString('es-CO')}</strong>
            </div>
          )}
        </div>
      ),
    }] : []),
    {
      key: 'invoice',
      label: 'Factura',
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <strong>Factura Actual:</strong>
            {workOrder?.invoiceFilePath ? (
              <div style={{ marginTop: 8 }}>
                <a
                  href={`${import.meta.env.VITE_API_URL}${workOrder.invoiceFilePath}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {workOrder.invoiceFileName}
                </a>
              </div>
            ) : (
              <div style={{ marginTop: 8, color: '#8c8c8c' }}>Sin factura</div>
            )}
          </div>

          <Divider />

          <div>
            <strong>Reemplazar Factura:</strong>
            <div style={{ marginTop: 12 }}>
              <Upload {...invoiceUploadProps}>
                <Button icon={<UploadOutlined />}>
                  {invoiceFile ? 'Cambiar factura' : 'Subir nueva factura'}
                </Button>
              </Upload>
              {invoiceFile && (
                <div style={{ marginTop: 8, color: '#52c41a' }}>
                  ✓ Nueva factura seleccionada: {invoiceFile.name}
                </div>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'photos',
      label: 'Fotos',
      children: (
        <div>
          {/* Fotos PDV */}
          <div style={{ marginBottom: 24 }}>
            <strong>Fotos PDV Actuales:</strong>
            {workOrder?.pdvPhotos && workOrder.pdvPhotos.length > 0 ? (
              <Image.PreviewGroup>
                <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                  {workOrder.pdvPhotos.map((photo: string, index: number) => (
                    <Image
                      key={index}
                      width={100}
                      height={100}
                      src={`${import.meta.env.VITE_API_URL}${photo}`}
                      style={{ objectFit: 'cover', borderRadius: 4 }}
                    />
                  ))}
                </div>
              </Image.PreviewGroup>
            ) : (
              <div style={{ marginTop: 8, color: '#8c8c8c' }}>Sin fotos</div>
            )}

            <Divider />

            <strong>Reemplazar Fotos PDV:</strong>
            <div style={{ marginTop: 12 }}>
              <Upload {...pdvPhotosUploadProps}>
                <Button icon={<UploadOutlined />}>Subir nuevas fotos PDV (máx 2)</Button>
              </Upload>
            </div>
          </div>

          {/* Fotos Técnico */}
          <div>
            <strong>Fotos Técnico/Contratista Actuales:</strong>
            {workOrder?.technicianPhotos && workOrder.technicianPhotos.length > 0 ? (
              <Image.PreviewGroup>
                <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                  {workOrder.technicianPhotos.map((photo: string, index: number) => (
                    <Image
                      key={index}
                      width={100}
                      height={100}
                      src={`${import.meta.env.VITE_API_URL}${photo}`}
                      style={{ objectFit: 'cover', borderRadius: 4 }}
                    />
                  ))}
                </div>
              </Image.PreviewGroup>
            ) : (
              <div style={{ marginTop: 8, color: '#8c8c8c' }}>Sin fotos</div>
            )}

            <Divider />

            <strong>Reemplazar Fotos Técnico:</strong>
            <div style={{ marginTop: 12 }}>
              <Upload {...techPhotosUploadProps}>
                <Button icon={<UploadOutlined />}>
                  Subir nuevas fotos Técnico (máx 2)
                </Button>
              </Upload>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <Modal
      title="Editar Orden de Trabajo Cerrada"
      open={open}
      onCancel={() => {
        form.resetFields();
        setInvoiceFile(null);
        setPdvPhotos([]);
        setTechPhotos([]);
        onClose();
      }}
      onOk={() => form.submit()}
      confirmLoading={loading}
      okText="Guardar Cambios"
      cancelText="Cancelar"
      width={isMobile ? '100%' : 800}
      centered
      styles={{
        body: {
          maxHeight: isMobile ? 'calc(100vh - 110px)' : 'calc(100vh - 200px)',
          overflowY: 'auto',
        },
      }}
    >
      <div style={{ marginBottom: 16, padding: 12, background: '#fff7e6', borderRadius: 4 }}>
        <p style={{ margin: 0, fontSize: 13 }}>
          ⚠️ Editando OT cerrada. Los archivos subidos REEMPLAZARÁN los actuales.
        </p>
      </div>

      <Tabs items={tabItems} />

      <div style={{ marginTop: 16, padding: 12, background: '#e6f7ff', borderRadius: 4 }}>
        <p style={{ margin: 0, fontSize: 12 }}>
          ℹ️ Los cambios se guardarán inmediatamente. No se modificarán eventos ni estados.
        </p>
      </div>
    </Modal>
  );
};

export default EditClosedWorkOrderModal;
