import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, Input, message, Alert } from 'antd';
import { workOrdersApi, usersApi } from '../../services/api';

interface AssignWorkOrderModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workOrder: any;
}

const AssignWorkOrderModal: React.FC<AssignWorkOrderModalProps> = ({
  open,
  onClose,
  onSuccess,
  workOrder,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [assigneeType, setAssigneeType] = useState<string>('INTERNO');
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loadingTechnicians, setLoadingTechnicians] = useState(false);

  useEffect(() => {
    if (open) {
      loadTechnicians();
    }
  }, [open]);

  const loadTechnicians = async () => {
    try {
      setLoadingTechnicians(true);
      const response = await usersApi.getTechniciansAndContractors();
      setTechnicians(response.data);
    } catch (error) {
      message.error('Error al cargar técnicos');
    } finally {
      setLoadingTechnicians(false);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      // Buscar el técnico seleccionado para obtener su email
      const selectedTech = technicians.find(t => t.id === values.assigneeId);
      
      const data = {
        assigneeType: values.assigneeType,
        assigneeName: selectedTech?.name || selectedTech?.email.split('@')[0] || 'Técnico',
        assigneeEmail: selectedTech?.email,
        assignmentDescription: values.assignmentDescription?.trim() || undefined,
      };
      
      await workOrdersApi.assign(workOrder.id, data);
      message.success('Orden de trabajo asignada exitosamente');
      
      if (values.assigneeType === 'CONTRATISTA') {
        message.info('Se ha enviado un correo al contratista');
      }
      
      form.resetFields();
      onSuccess();
      onClose();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al asignar');
    } finally {
      setLoading(false);
    }
  };

  const filteredTechnicians = technicians.filter(tech => {
    if (assigneeType === 'INTERNO') {
      return tech.roles.includes('TECNICO_INTERNO');
    } else {
      return tech.roles.includes('CONTRATISTA');
    }
  });

  return (
    <Modal
      title={`Asignar OT - ${workOrder.id.substring(0, 8)}`}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      width={500}
      okText="Asignar"
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
                : `Mantenimiento Locativo - ${workOrder.locativeCategory || ''}`}
            </p>
            <p><strong>Ubicación:</strong> {workOrder.location.name}</p>
            <p><strong>Solicitud:</strong> {workOrder.title}</p>
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
        initialValues={{ assigneeType: 'INTERNO' }}
      >
        <Form.Item
          label="Tipo de Asignación"
          name="assigneeType"
          rules={[{ required: true, message: 'Selecciona el tipo' }]}
        >
          <Select onChange={setAssigneeType}>
            <Select.Option value="INTERNO">Técnico Interno</Select.Option>
            <Select.Option value="CONTRATISTA">Contratista Externo</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          label={assigneeType === 'INTERNO' ? 'Técnico' : 'Contratista'}
          name="assigneeId"
          rules={[{ required: true, message: 'Selecciona un técnico/contratista' }]}
        >
          <Select
            placeholder="Selecciona de la lista"
            loading={loadingTechnicians}
            showSearch
            optionFilterProp="children"
          >
            {filteredTechnicians.map((tech) => (
              <Select.Option key={tech.id} value={tech.id}>
                {tech.name ? `${tech.name} (${tech.email})` : tech.email}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* Campo OPCIONAL - solo recomendado */}
        <Form.Item
          label="Instrucciones para el técnico (opcional)"
          name="assignmentDescription"
          rules={[
            { 
              min: 10, 
              message: 'Si las escribes, mínimo 10 caracteres' 
            }
          ]}
          tooltip="Opcional: Describe instrucciones específicas. Si dejas vacío, se usará la descripción original de la solicitud."
        >
          <Input.TextArea
            rows={3}
            placeholder="Ej: Revisar y reparar freidora que no calienta, cambiar aceite si es necesario..."
            maxLength={500}
            showCount
          />
        </Form.Item>
      </Form>

      {assigneeType === 'CONTRATISTA' && (
        <div style={{ marginTop: 16, padding: 12, background: '#fff7e6', borderRadius: 4 }}>
          <p style={{ margin: 0, fontSize: 12 }}>
            📧 Se enviará un correo electrónico automático al contratista con los detalles de la orden de trabajo.
            {' '}<strong>Si especificas instrucciones, se incluirán en el correo.</strong>
          </p>
        </div>
      )}
    </Modal>
  );
};

export default AssignWorkOrderModal;
