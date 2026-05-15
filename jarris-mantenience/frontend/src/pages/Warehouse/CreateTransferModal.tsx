import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, InputNumber, Input, Button, message, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { warehouseApi } from '../../services/api';

interface CreateTransferModalProps {
  open: boolean;
  onClose: (reload?: boolean) => void;
  warehouses: { id: string; name: string; location?: any }[];
  userEmail: string;
}

const CreateTransferModal: React.FC<CreateTransferModalProps> = ({
  open,
  onClose,
  warehouses,
  userEmail,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isMobile] = useState(window.innerWidth < 768);
  const [sourceWarehouseId, setSourceWarehouseId] = useState<string | null>(null);
  const [sourceItems, setSourceItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    if (!open) {
      setSourceWarehouseId(null);
      setSourceItems([]);
    }
  }, [open]);

  const handleSourceChange = async (warehouseId: string) => {
    setSourceWarehouseId(warehouseId);
    setSourceItems([]);

    // Reset destination and lines when source changes
    form.setFieldsValue({
      destinationWarehouseId: undefined,
      lines: [{ itemId: undefined, quantity: undefined }],
    });

    try {
      setLoadingItems(true);
      const response = await warehouseApi.getItems(warehouseId);
      const activeItems = (response.data || []).filter((item: any) => item.active);
      setSourceItems(activeItems);
    } catch (error) {
      message.error('Error al cargar los articulos de la bodega origen');
    } finally {
      setLoadingItems(false);
    }
  };

  const handleSubmit = async (values: any) => {
    const lines = values.lines || [];
    if (lines.length === 0) {
      message.error('Debe agregar al menos una linea de transferencia');
      return;
    }

    // Validate all lines have required fields
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i]?.itemId || !lines[i]?.quantity) {
        message.error(`Linea ${i + 1}: Articulo y cantidad son requeridos`);
        return;
      }
    }

    try {
      setLoading(true);
      await warehouseApi.createTransfer({
        sourceWarehouseId: values.sourceWarehouseId,
        destinationWarehouseId: values.destinationWarehouseId,
        lines: lines.map((line: any) => ({
          itemId: line.itemId,
          quantity: line.quantity,
        })),
        observation: values.observation || undefined,
        createdBy: userEmail,
      });
      message.success('Transferencia creada exitosamente');
      form.resetFields();
      onClose(true);
    } catch (error: any) {
      message.error(
        error.response?.data?.message || 'Error al crear la transferencia'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSourceWarehouseId(null);
    setSourceItems([]);
    onClose();
  };

  const getItemMaxStock = (itemId: string): number => {
    const item = sourceItems.find((i) => i.id === itemId);
    return item ? Number(item.currentStock || 0) : 0;
  };

  const destinationWarehouses = warehouses.filter(
    (w) => w.id !== sourceWarehouseId
  );

  return (
    <Modal
      title="Crear Transferencia entre Bodegas"
      open={open}
      onCancel={handleCancel}
      onOk={() => form.submit()}
      confirmLoading={loading}
      okText="Crear Transferencia"
      cancelText="Cancelar"
      destroyOnClose
      width={isMobile ? 'calc(100vw - 24px)' : 700}
      centered
      styles={{
        body: {
          maxHeight: isMobile ? 'calc(100vh - 200px)' : 'calc(100vh - 300px)',
          overflowY: 'auto',
        },
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          lines: [{ itemId: undefined, quantity: undefined }],
        }}
      >
        <Form.Item
          label="Bodega Origen"
          name="sourceWarehouseId"
          rules={[{ required: true, message: 'Selecciona la bodega origen' }]}
        >
          <Select
            placeholder="Selecciona la bodega origen"
            showSearch
            optionFilterProp="children"
            onChange={handleSourceChange}
            size={isMobile ? 'large' : 'middle'}
          >
            {warehouses.map((w) => (
              <Select.Option key={w.id} value={w.id}>
                {w.name} {w.location?.name ? `(${w.location.name})` : ''}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label="Bodega Destino"
          name="destinationWarehouseId"
          rules={[{ required: true, message: 'Selecciona la bodega destino' }]}
        >
          <Select
            placeholder={
              sourceWarehouseId
                ? 'Selecciona la bodega destino'
                : 'Primero selecciona la bodega origen'
            }
            showSearch
            optionFilterProp="children"
            disabled={!sourceWarehouseId}
            size={isMobile ? 'large' : 'middle'}
          >
            {destinationWarehouses.map((w) => (
              <Select.Option key={w.id} value={w.id}>
                {w.name} {w.location?.name ? `(${w.location.name})` : ''}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Divider style={{ margin: '16px 0 8px' }}>Articulos a Transferir</Divider>

        <Form.List name="lines">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => {
                const currentItemId = form.getFieldValue(['lines', name, 'itemId']);
                const maxStock = currentItemId ? getItemMaxStock(currentItemId) : 0;

                return (
                  <div
                    key={key}
                    style={{
                      display: 'flex',
                      gap: 8,
                      alignItems: 'flex-start',
                      marginBottom: 8,
                    }}
                  >
                    <Form.Item
                      {...restField}
                      name={[name, 'itemId']}
                      rules={[{ required: true, message: 'Requerido' }]}
                      style={{ flex: 2, marginBottom: 0 }}
                    >
                      <Select
                        placeholder="Selecciona articulo"
                        showSearch
                        optionFilterProp="children"
                        loading={loadingItems}
                        disabled={!sourceWarehouseId}
                        size={isMobile ? 'large' : 'middle'}
                        onChange={() => {
                          // Reset quantity when item changes
                          const lines = form.getFieldValue('lines');
                          lines[name].quantity = undefined;
                          form.setFieldsValue({ lines });
                        }}
                      >
                        {sourceItems.map((item) => (
                          <Select.Option key={item.id} value={item.id}>
                            {item.name} (Stock: {Number(item.currentStock || 0)})
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, 'quantity']}
                      rules={[
                        { required: true, message: 'Requerido' },
                        {
                          type: 'number',
                          min: 0.0001,
                          message: 'Min: 0.0001',
                        },
                        {
                          type: 'number',
                          max: maxStock || undefined,
                          message: `Max: ${maxStock}`,
                        },
                      ]}
                      style={{ flex: 1, marginBottom: 0 }}
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        min={0.0001}
                        max={maxStock || undefined}
                        step={1}
                        placeholder="Cantidad"
                        disabled={!currentItemId}
                        size={isMobile ? 'large' : 'middle'}
                      />
                    </Form.Item>

                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => remove(name)}
                      disabled={fields.length <= 1}
                      size={isMobile ? 'large' : 'middle'}
                      style={{ marginTop: 0 }}
                    />
                  </div>
                );
              })}

              <Form.Item style={{ marginBottom: 16 }}>
                <Button
                  type="dashed"
                  onClick={() => add({ itemId: undefined, quantity: undefined })}
                  block
                  icon={<PlusOutlined />}
                  disabled={!sourceWarehouseId}
                  size={isMobile ? 'large' : 'middle'}
                >
                  Agregar Articulo
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>

        <Form.Item
          label="Observacion"
          name="observation"
        >
          <Input.TextArea
            rows={3}
            placeholder="Observacion (opcional)"
            size={isMobile ? 'large' : 'middle'}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateTransferModal;
