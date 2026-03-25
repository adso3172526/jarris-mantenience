import React, { useState, useEffect } from 'react';
import { Modal, Descriptions, Tag, Timeline, Typography, Image, Button, Divider } from 'antd';
import { workOrderStatusStyles, workOrderPriorityStyles, workOrderPriorityLabels } from '../../config/theme';
import {
  FileTextOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { ToolOutlined, HomeOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface ViewWorkOrderModalProps {
  open: boolean;
  onClose: () => void;
  workOrder: any;
  onEdit?: () => void;
  showEditButton?: boolean;
}

const ViewWorkOrderModal: React.FC<ViewWorkOrderModalProps> = ({
  open,
  onClose,
  workOrder,
  onEdit,
  showEditButton = false,
}) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Bloquear scroll del body cuando el modal está abierto en mobile
  useEffect(() => {
    if (open && isMobile) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open, isMobile]);

  const formatCOP = (value: number) => {
    return `$${Math.round(value).toLocaleString('es-CO')}`;
  };

  const getTimelineItems = () => {
    const items = [];

    items.push({
      color: workOrderStatusStyles['NUEVA']?.color,
      dot: <FileTextOutlined />,
      children: (
        <div>
          <Text strong>Creada</Text>
          <br />
          <Text type="secondary">
            {new Date(workOrder.createdAt).toLocaleString('es-CO')}
          </Text>
          {workOrder.createdBy && (
            <>
              <br />
              <Text type="secondary">Por: {workOrder.createdBy}</Text>
            </>
          )}
        </div>
      ),
    });

    if (workOrder.rejectedAt) {
      items.push({
        color: workOrderStatusStyles['RECHAZADA']?.color,
        dot: <CloseCircleOutlined />,
        children: (
          <div>
            <Text strong style={{ color: workOrderStatusStyles['RECHAZADA']?.color }}>Rechazada</Text>
            <br />
            <Text type="secondary">
              {new Date(workOrder.rejectedAt).toLocaleString('es-CO')}
            </Text>
            {workOrder.rejectedBy && (
              <>
                <br />
                <Text type="secondary">Por: {workOrder.rejectedBy}</Text>
              </>
            )}
            {workOrder.rejectionReason && (
              <>
                <br />
                <Text type="secondary">Motivo: {workOrder.rejectionReason}</Text>
              </>
            )}
          </div>
        ),
      });
    }

    if (workOrder.assigneeName && !workOrder.rejectedAt) {
      items.push({
        color: workOrderStatusStyles['ASIGNADA']?.color,
        dot: <UserOutlined />,
        children: (
          <div>
            <Text strong>Asignada a {workOrder.assigneeName}</Text>
            {workOrder.assignedAt && (
              <>
                <br />
                <Text type="secondary">
                  {new Date(workOrder.assignedAt).toLocaleString('es-CO')}
                </Text>
              </>
            )}
            <br />
            <Tag color={workOrder.assigneeType === 'INTERNO' ? 'blue' : 'orange'}>
              {workOrder.assigneeType}
            </Tag>
          </div>
        ),
      });
    }

    if ((workOrder.status === 'EN_PROCESO' || workOrder.status === 'TERMINADA' || workOrder.status === 'CERRADA') && !workOrder.rejectedAt) {
      items.push({
        color: workOrderStatusStyles['EN_PROCESO']?.color,
        dot: <ClockCircleOutlined />,
        children: (
          <div>
            <Text strong>En Proceso</Text>
            {workOrder.startedAt && (
              <>
                <br />
                <Text type="secondary">
                  {new Date(workOrder.startedAt).toLocaleString('es-CO')}
                </Text>
              </>
            )}
            {workOrder.startedBy && (
              <>
                <br />
                <Text type="secondary">Por: {workOrder.startedBy}</Text>
              </>
            )}
          </div>
        ),
      });
    }

    if (workOrder.finishedAt) {
      items.push({
        color: workOrderStatusStyles['TERMINADA']?.color,
        dot: <CheckCircleOutlined />,
        children: (
          <div>
            <Text strong>Terminada</Text>
            <br />
            <Text type="secondary">
              {new Date(workOrder.finishedAt).toLocaleString('es-CO')}
            </Text>
            {workOrder.finishedBy && (
              <>
                <br />
                <Text type="secondary">Por: {workOrder.finishedBy}</Text>
              </>
            )}
          </div>
        ),
      });
    }

    if (workOrder.closedAt && !workOrder.rejectedAt) {
      items.push({
        color: workOrderStatusStyles['CERRADA']?.color,
        children: (
          <div>
            <Text strong>Cerrada</Text>
            <br />
            <Text type="secondary">
              {new Date(workOrder.closedAt).toLocaleString('es-CO')}
            </Text>
            {workOrder.closedBy && (
              <>
                <br />
                <Text type="secondary">Por: {workOrder.closedBy}</Text>
              </>
            )}
          </div>
        ),
      });
    }

    return items;
  };

  // Mobile Optimized View
  const renderMobileContent = () => (
    <div>
      {/* Estado */}
      <div style={{ marginBottom: 16 }}>
        {workOrder.priority && (
          <Tag
            style={{ fontSize: 14, padding: '4px 12px', backgroundColor: workOrderPriorityStyles[workOrder.priority]?.bg, color: workOrderPriorityStyles[workOrder.priority]?.color, border: 'none' }}
          >
            {workOrderPriorityLabels[workOrder.priority as keyof typeof workOrderPriorityLabels]}
          </Tag>
        )}
        <Tag
          style={{ fontSize: 14, padding: '4px 12px', backgroundColor: workOrderStatusStyles[workOrder.status]?.bg, color: workOrderStatusStyles[workOrder.status]?.color, border: 'none' }}
        >
          {workOrder.status}
        </Tag>
      </div>

      {/* Información General */}
      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>
          Información General
        </Text>
        
        <div style={{ marginBottom: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Tipo:</Text>
          <div style={{ marginTop: 4 }}>
            <Tag color={workOrder.maintenanceType === 'EQUIPO' ? 'blue-inverse' : 'purple-inverse'}>
              {workOrder.maintenanceType === 'EQUIPO' ? (
                <><ToolOutlined /> Equipo</>
              ) : (
                <><HomeOutlined /> Locativo</>
              )}
            </Tag>
          </div>
        </div>

        {workOrder.maintenanceType === 'EQUIPO' && workOrder.asset && (
          <>
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Código:</Text>
              <div style={{ fontWeight: 600 }}>{workOrder.asset.code}</div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Descripción:</Text>
              <div>{workOrder.asset.description}</div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Categoría:</Text>
              <div>{workOrder.asset.category?.name || 'N/A'}</div>
            </div>
          </>
        )}

        {workOrder.maintenanceType === 'LOCATIVO' && (
          <div style={{ marginBottom: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Categoría Locativa:</Text>
            <div>{workOrder.locativeCategory?.name}</div>
          </div>
        )}

        <div style={{ marginBottom: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Ubicación:</Text>
          <div style={{ fontWeight: 700 }}>{workOrder.location.name}</div>
        </div>
      </div>

      <Divider />

      {/* Solicitud */}
      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>
          Solicitud
        </Text>
        <div style={{ marginBottom: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Título:</Text>
          <div>{workOrder.title}</div>
        </div>
        <div style={{ marginBottom: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Descripción:</Text>
          <div style={{ fontSize: 13 }}>{workOrder.requestDescription || 'Sin descripción'}</div>
        </div>
        {workOrder.assignmentDescription && (
          <div style={{
            marginTop: 12,
            padding: '10px 12px',
            background: '#e6f7ff',
            borderLeft: '3px solid #1890ff',
            borderRadius: 4,
          }}>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
              Instrucciones:
            </Text>
            <div style={{ fontSize: 13 }}>{workOrder.assignmentDescription}</div>
          </div>
        )}
      </div>

      {/* Fotos de la Solicitud */}
      {workOrder.pdvPhotos && workOrder.pdvPhotos.length > 0 && (
        <>
          <Divider />
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>
              Fotos de la Solicitud
            </Text>
            <Image.PreviewGroup>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {workOrder.pdvPhotos.map((photo: string, index: number) => (
                  <Image
                    key={index}
                    width={100}
                    height={100}
                    src={`${import.meta.env.VITE_API_URL}${photo}`}
                    style={{ objectFit: 'cover', borderRadius: 8 }}
                    alt={`Foto PDV ${index + 1}`}
                  />
                ))}
              </div>
            </Image.PreviewGroup>
          </div>
        </>
      )}

      {/* Asignación */}
      {workOrder.assigneeName && (
        <>
          <Divider />
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>
              Asignación
            </Text>
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Asignado a:</Text>
              <div>{workOrder.assigneeName}</div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Tipo:</Text>
              <div>
                <Tag color={workOrder.assigneeType === 'INTERNO' ? 'blue' : 'orange'}>
                  {workOrder.assigneeType}
                </Tag>
              </div>
            </div>
            {workOrder.assigneeEmail && (
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Email:</Text>
                <div style={{ fontSize: 12 }}>{workOrder.assigneeEmail}</div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Fotos del Técnico */}
      {workOrder.technicianPhotos && workOrder.technicianPhotos.length > 0 && (
        <>
          <Divider />
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>
              Fotos del Técnico/Contratista
            </Text>
            <Image.PreviewGroup>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {workOrder.technicianPhotos.map((photo: string, index: number) => (
                  <Image
                    key={index}
                    width={100}
                    height={100}
                    src={`${import.meta.env.VITE_API_URL}${photo}`}
                    style={{ objectFit: 'cover', borderRadius: 8 }}
                    alt={`Foto Técnico ${index + 1}`}
                  />
                ))}
              </div>
            </Image.PreviewGroup>
          </div>
        </>
      )}

      {/* Trabajo Realizado */}
      {workOrder.workDoneDescription && (
        <>
          <Divider />
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>
              Trabajo Realizado
            </Text>
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Descripción:</Text>
              <div style={{ fontSize: 13 }}>{workOrder.workDoneDescription}</div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Costo:</Text>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#E60012' }}>
                {formatCOP(workOrder.cost)}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Factura */}
      {workOrder.invoiceFilePath && (
        <>
          <Divider />
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>
              Factura
            </Text>
            <div style={{ marginBottom: 8 }}>
              <a
                href={`${import.meta.env.VITE_API_URL}${workOrder.invoiceFilePath}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 13 }}
              >
                📄 {workOrder.invoiceFileName}
              </a>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Subida por: {workOrder.invoiceUploadedBy}
              </Text>
            </div>
          </div>
        </>
      )}

      {/* Timeline */}
      <Divider />
      <div>
        <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>
          Línea de Tiempo
        </Text>
        <Timeline items={getTimelineItems()} />
      </div>
    </div>
  );

  // Desktop View
  const renderDesktopContent = () => (
    <div>
      <div style={{ marginBottom: 24 }}>
        {workOrder.priority && (
          <Tag
            style={{ fontSize: 14, padding: '4px 12px', backgroundColor: workOrderPriorityStyles[workOrder.priority]?.bg, color: workOrderPriorityStyles[workOrder.priority]?.color, border: 'none' }}
          >
            {workOrderPriorityLabels[workOrder.priority as keyof typeof workOrderPriorityLabels]}
          </Tag>
        )}
        <Tag
          style={{ fontSize: 14, padding: '4px 12px', backgroundColor: workOrderStatusStyles[workOrder.status]?.bg, color: workOrderStatusStyles[workOrder.status]?.color, border: 'none' }}
        >
          {workOrder.status}
        </Tag>
      </div>

      <Title level={5}>Información General</Title>
      <Descriptions bordered size="small" column={2}>
        <Descriptions.Item label="Tipo" span={2}>
          <Tag color={workOrder.maintenanceType === 'EQUIPO' ? 'blue-inverse' : 'purple-inverse'} style={{ fontSize: 14 }}>
            {workOrder.maintenanceType === 'EQUIPO' ? (
              <><ToolOutlined /> Equipo</>
            ) : (
              <><HomeOutlined /> Locativo</>
            )}
          </Tag>
        </Descriptions.Item>

        {workOrder.maintenanceType === 'EQUIPO' && workOrder.asset && (
          <>
            <Descriptions.Item label="Código" span={1}>
              {workOrder.asset.code}
            </Descriptions.Item>
            <Descriptions.Item label="Descripción" span={1}>
              {workOrder.asset.description}
            </Descriptions.Item>
            <Descriptions.Item label="Categoría" span={1}>
              {workOrder.asset.category?.name || 'N/A'}
            </Descriptions.Item>
          </>
        )}

        {workOrder.maintenanceType === 'LOCATIVO' && (
          <Descriptions.Item label="Categoría Locativa" span={2}>
            {workOrder.locativeCategory?.name}
          </Descriptions.Item>
        )}

        <Descriptions.Item label="Ubicación" span={2}>
          {workOrder.location.name}
        </Descriptions.Item>
      </Descriptions>

      <Title level={5} style={{ marginTop: 24 }}>Solicitud</Title>
      <Descriptions bordered size="small" column={1}>
        <Descriptions.Item label="Título">
          {workOrder.title}
        </Descriptions.Item>
        <Descriptions.Item label="Descripción">
          {workOrder.requestDescription || 'Sin descripción'}
        </Descriptions.Item>
        {workOrder.assignmentDescription && (
          <Descriptions.Item label="Instrucciones">
            <div style={{
              padding: '6px 10px',
              background: '#e6f7ff',
              borderLeft: '3px solid #1890ff',
              borderRadius: 4,
            }}>
              {workOrder.assignmentDescription}
            </div>
          </Descriptions.Item>
        )}
      </Descriptions>

      {workOrder.pdvPhotos && workOrder.pdvPhotos.length > 0 && (
        <>
          <Title level={5} style={{ marginTop: 24 }}>Fotos de la Solicitud</Title>
          <Image.PreviewGroup>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {workOrder.pdvPhotos.map((photo: string, index: number) => (
                <Image
                  key={index}
                  width={150}
                  height={150}
                  src={`${import.meta.env.VITE_API_URL}${photo}`}
                  style={{ objectFit: 'cover', borderRadius: 8 }}
                  alt={`Foto PDV ${index + 1}`}
                />
              ))}
            </div>
          </Image.PreviewGroup>
        </>
      )}

      {workOrder.assigneeName && (
        <>
          <Title level={5} style={{ marginTop: 24 }}>Asignación</Title>
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Asignado a" span={1}>
              {workOrder.assigneeName}
            </Descriptions.Item>
            <Descriptions.Item label="Tipo" span={1}>
              <Tag color={workOrder.assigneeType === 'INTERNO' ? 'blue' : 'orange'}>
                {workOrder.assigneeType}
              </Tag>
            </Descriptions.Item>
            {workOrder.assigneeEmail && (
              <Descriptions.Item label="Email" span={2}>
                {workOrder.assigneeEmail}
              </Descriptions.Item>
            )}
          </Descriptions>
        </>
      )}

      {workOrder.technicianPhotos && workOrder.technicianPhotos.length > 0 && (
        <>
          <Title level={5} style={{ marginTop: 24 }}>Fotos del Técnico/Contratista</Title>
          <Image.PreviewGroup>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {workOrder.technicianPhotos.map((photo: string, index: number) => (
                <Image
                  key={index}
                  width={150}
                  height={150}
                  src={`${import.meta.env.VITE_API_URL}${photo}`}
                  style={{ objectFit: 'cover', borderRadius: 8 }}
                  alt={`Foto Técnico ${index + 1}`}
                />
              ))}
            </div>
          </Image.PreviewGroup>
        </>
      )}

      {workOrder.workDoneDescription && (
        <>
          <Title level={5} style={{ marginTop: 24 }}>Trabajo Realizado</Title>
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="Descripción">
              {workOrder.workDoneDescription}
            </Descriptions.Item>
            <Descriptions.Item label="Costo">
              {formatCOP(workOrder.cost)}
            </Descriptions.Item>
          </Descriptions>
        </>
      )}

      {workOrder.invoiceFilePath && (
        <>
          <Title level={5} style={{ marginTop: 24 }}>Factura</Title>
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Archivo" span={1}>
              <a
                href={`${import.meta.env.VITE_API_URL}${workOrder.invoiceFilePath}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {workOrder.invoiceFileName}
              </a>
            </Descriptions.Item>
            <Descriptions.Item label="Subida por" span={1}>
              {workOrder.invoiceUploadedBy}
            </Descriptions.Item>
          </Descriptions>
        </>
      )}

      <Title level={5} style={{ marginTop: 24 }}>Línea de Tiempo</Title>
      <Timeline items={getTimelineItems()} />
    </div>
  );

  return (
    <Modal
      title={`OT - ${workOrder.id.substring(0, 8)}`}
      open={open}
      onCancel={onClose}
      footer={
        showEditButton && onEdit ? (
          <Button
            icon={<EditOutlined />}
            onClick={onEdit}
            type="primary"
            style={{ backgroundColor: '#E60012', borderColor: '#E60012' }}
          >
            Editar OT
          </Button>
        ) : null
      }
      width={isMobile ? 'calc(100vw - 16px)' : 800}
      centered={!isMobile}
      style={isMobile ? { maxWidth: 'calc(100vw - 16px)', margin: '8px', top: 0, padding: 0 } : {}}
      styles={{
        body: {
          height: isMobile ? 'calc(100vh - 126px)' : undefined,
          maxHeight: isMobile ? 'calc(100vh - 126px)' : 'calc(100vh - 200px)',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          padding: isMobile ? 12 : undefined,
        },
        content: isMobile ? { borderRadius: 8, height: 'calc(100vh - 16px)' } : {},
        wrapper: isMobile ? { overflow: 'hidden' } : {},
      }}
    >
      {isMobile ? renderMobileContent() : renderDesktopContent()}
    </Modal>
  );
};

export default ViewWorkOrderModal;
